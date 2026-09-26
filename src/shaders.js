import * as THREE from 'three';

export function createCorruptionMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xb90d22) },
      uIntensity: { value: .78 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;

      void main() {
        vUv = uv;
        vec3 displaced = position;
        displaced.z += sin(position.x * 3.4 + uTime * 1.4) * 0.025;
        displaced.z += cos(position.y * 5.2 - uTime) * 0.018;
        vec4 world = modelMatrix * vec4(displaced, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;

      float random(vec2 point) {
        return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);
        return mix(mix(random(cell), random(cell + vec2(1., 0.)), local.x),
                   mix(random(cell + vec2(0., 1.)), random(cell + vec2(1.)), local.x), local.y);
      }

      void main() {
        vec2 centered = vUv - .5;
        float radius = length(centered);
        float angle = atan(centered.y, centered.x);
        float spiral = sin(angle * 8.0 - radius * 29.0 + uTime * 1.9);
        float broken = noise(vUv * 12.0 + vec2(uTime * .12, -uTime * .08));
        float ring = smoothstep(.035, 0.0, abs(radius - .32 - spiral * .012));
        float inner = smoothstep(.055, 0.0, abs(radius - .19 + sin(angle * 5.0 + uTime) * .012));
        float spokes = pow(max(0.0, cos(angle * 6.0 + radius * 18.0)), 22.0) * smoothstep(.37, .13, radius);
        float fade = smoothstep(.53, .18, radius) * smoothstep(.04, .14, radius);
        float alpha = (ring + inner * .65 + spokes * .8 + broken * .1) * fade * uIntensity;
        vec3 color = uColor * (1.25 + broken * .8) + vec3(.42, .025, .005) * ring;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

export function createEmberMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aScale;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vFade;

      void main() {
        vColor = color;
        vec3 p = position;
        p.y += mod(uTime * (.18 + aScale * .13) + aPhase, 5.2);
        p.x += sin(uTime * .8 + aPhase * 7.0) * .24;
        p.z += cos(uTime * .64 + aPhase * 4.0) * .2;
        vFade = smoothstep(5.2, 3.5, p.y) * smoothstep(-.1, .7, p.y);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (4.0 + aScale * 9.0) * uPixelRatio * (8.0 / -mvPosition.z);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - .5;
        float strength = smoothstep(.5, .04, length(uv));
        gl_FragColor = vec4(vColor, strength * vFade);
      }
    `,
  });
}

export function createMistMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * .55 + uTime * .28) * .1;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform float uTime;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x), mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.)), f.x), f.y);
      }
      void main() {
        float edge = smoothstep(0., .28, vUv.x) * smoothstep(1., .72, vUv.x);
        edge *= smoothstep(0., .3, vUv.y) * smoothstep(1., .58, vUv.y);
        float cloud = noise(vUv * vec2(5., 2.) + vec2(-uTime * .08, uTime * .025));
        float alpha = edge * smoothstep(.2, .84, cloud) * .18;
        gl_FragColor = vec4(.24, .015, .025, alpha);
      }
    `,
  });
}
