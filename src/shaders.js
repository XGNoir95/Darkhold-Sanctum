import * as THREE from 'three';

export function createAlcoveShader() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: new THREE.Color('#23472d') },
      uGlow: { value: new THREE.Color('#78c784') },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uGlow;
      varying vec2 vUv;
      varying vec3 vPosition;
      float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main() {
        float topLight = smoothstep(.18, .96, vUv.y);
        float center = 1.0 - smoothstep(.0, .7, abs(vUv.x - .5));
        float pulse = .92 + sin(uTime * .7) * .025;
        float grain = noise(vUv * 220.0) * .025;
        vec3 color = mix(uBase * .55, uGlow * pulse, topLight * center * .68);
        color += grain;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}
