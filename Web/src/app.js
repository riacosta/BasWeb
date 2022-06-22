import * as THREE from 'three';
import {
    GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js'

import {
    fShader,
    vShader
} from './blitShader';


export const buildScene = () => {


    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        maxSamples: 8
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.getElementById('3Delement').appendChild(renderer.domElement);
    var renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        antialias: true,
        maxSamples: 8
    });
    var renderTargetAlpha = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });

    //VisibleScene

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 100);
    camera.position.z = 5;

    renderer.setClearColor(0x000000, 0); // the default
    renderer.setSize(window.innerWidth, window.innerHeight);



    //RT Scene
    const rtCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000);
    //  const controls = new OrbitControls(rtCamera, renderer.domElement);
    rtCamera.position.z = 2;
    var rtScene = new THREE.Scene();

    //Alpha RT Scene
    var alphaRtScene = new THREE.Scene();

    const geometry = new THREE.PlaneGeometry(window.innerWidth / 125, window.innerHeight / 125);
    var rtMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: renderTarget.texture,
        side: THREE.DoubleSide,
        transparent: true
    });


    let uniforms = {
        rtImage: {
            type: 'sampler2D',
            value: renderTarget.texture
        },
        rtAlpha: {
            type: 'sampler2D',
            value: renderTargetAlpha.texture
        },

    }

    const customShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vShader,
        fragmentShader: fShader,
        transparent: true,
        uniforms: uniforms
    });

    var mainBoxObject = new THREE.Mesh(geometry, customShaderMaterial);
    scene.add(mainBoxObject);




    //RenderTexture Scene
    // const light = new THREE.PointLight(0xffffff, 10, 100);
    // light.position.set(5, 15, -5);
    // rtScene.add(light);

    const ambLight = new THREE.AmbientLight(0xffffff);
    ambLight.intensity = 1;
    rtScene.add(ambLight);


    const skyGeo = new THREE.BoxGeometry(20, 20, 20);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x090227,
        side: 1
    });
    const skyCube = new THREE.Mesh(skyGeo, skyMaterial);
    rtScene.add(skyCube);



    //Animation
    let mixer = null;
    let cameraAnimation = null;
    let modelReady = false;
    let virtualCamera = null;
    const loader = new GLTFLoader();
    loader.load('/Model2.glb', function (gltf) {
        let glbModel = gltf.scene;
        rtScene.add(glbModel);
        var flares = glbModel.getObjectByName("xFlares");
        flares.material.blending = THREE.AdditiveBlending;

        var clouds = glbModel.getObjectByName("xClouds");
        clouds.material.blending = THREE.AdditiveBlending;

        // var gate = glbModel.getObjectByName("Gate");
        // var gateTex =  gate.material;
        // var st =JSON.stringify( gate.material);
        // console.log(st);
        // var obj =JSON.parse(st );
        // const texloader = new THREE.TextureLoader();
        // texloader.load(
        //     // resource URL
        //     obj.images[0].url,
        
        //     // onLoad callback
        //     function ( texture ) {
        //         // in this example we create the material when the texture is loaded
        //         gate.material= new THREE.MeshBasicMaterial( {
        //             map: texture
        //          } );
        //     }        
        // );
      
        var alphaScene = glbModel.clone();

        alphaScene.traverse((o) => {
            if (o.name.startsWith("x")) {
                alphaScene.remove(o);
                console.log("removed "+o.name);
            }
            if(o.name!="Portal"){
            o.material = new THREE.MeshBasicMaterial({
                color: 0x00000
            });}

        });
        var portal = alphaScene.getObjectByName("Portal");
       var tex=  portal.material.texture;
        portal.material = new THREE.MeshBasicMaterial({
            color: 0xffffff, texture:tex
        });

        alphaRtScene.add(alphaScene);      
        //animation      
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (let i = 0; i < gltf.animations.length; i++) {
            var cameraAnimation = mixer.clipAction(gltf.animations[i]);
            cameraAnimation.play();
        }

        virtualCamera = rtScene.getObjectByName("VirtualCamera");
        rtScene.remove(virtualCamera);
        modelReady = true;
    });







    const clock = new THREE.Clock();

    function seekCameraAnimation(time) {
        mixer.setTime(clamp(time, 0, 10));
        // cameraAnimation.time = 0;
        mixer.update(clock.getDelta());
    }


    var cameraPositionTarget = 0;
    var cameraPositionSmooth = 0;

    function lerp(start, end, amt) {
        return (1 - amt) * start + amt * end
    }

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    function update() {
        //  console.log("rt> "+ JSON.stringify( rtCamera.position));
        // console.log("vr> "+ JSON.stringify( virtualCamera.position));
        rtCamera.position.z = virtualCamera.position.z;
        rtCamera.position.y = virtualCamera.position.y;
        // rtCamera.rotation.set(virtualCamera.rotation);
    }

    function render() {

        requestAnimationFrame(render);
        // controls.update();
        renderer.setRenderTarget(renderTarget);
        renderer.render(rtScene, rtCamera);
        renderer.setRenderTarget(renderTargetAlpha);
        renderer.render(alphaRtScene, rtCamera);
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        cameraPositionSmooth = lerp(cameraPositionSmooth, cameraPositionTarget, clock.getDelta());
        if (modelReady) {
            update();
            seekCameraAnimation(cameraPositionSmooth);

        }

    };


    render();


    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {
        rtCamera.aspect = window.innerWidth / window.innerHeight;
        rtCamera.updateProjectionMatrix();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        update();
        render();
    }

    window.addEventListener('wheel', moveCamera, false);

    function moveCamera(e) {
        cameraPositionTarget += e.deltaY * .01;
        cameraPositionTarget = clamp(cameraPositionTarget, 0, 12);
    }

};