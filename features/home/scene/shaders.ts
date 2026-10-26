export const fresnelVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const fresnelFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uIntensity;
uniform float uInvert;
uniform float uFade;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
  float f = pow(mix(1.0 - facing, facing, uInvert), uPower) * uIntensity * uFade;
  gl_FragColor = vec4(uColor * f, f);
}
`;

export const glowVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFade;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.4) * uIntensity * uFade;
  gl_FragColor = vec4(uColor * a, a);
}
`;
