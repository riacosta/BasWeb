export const  vShader = `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
`
export const fShader = `
varying vec2 v_uv;
uniform sampler2D rtImage;
uniform sampler2D rtAlpha;

void main() {
  
    vec4 alpha = texture(rtAlpha,v_uv);
    vec4 image =texture(rtImage, v_uv);
 
    image.a -=alpha.r;
  gl_FragColor =image;
}
`
