// Prototype of the redesigned scene (PR 4 revision). Not part of the app yet:
// it renders one instant, chosen with ?stop=<epoch id> or ?t=<seconds>, so
// that the five proposal captures can be taken at 1920×1080.

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Data3DTexture,
  Float32BufferAttribute,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RedFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
  Int16BufferAttribute,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { DRAPER_POINT_K, PLANCK2018, PLANCK2018_DERIVED, createCosmology } from '../physics';
import { createGrowthFactor } from '../physics/growth';
import { EPOCHS, resolveEpochs } from '../timeline';
import { blackbodySrgb } from '../scene/blackbody';
import { createCosmicWeb } from '../scene/cosmicWeb';
import { tileableNoise } from '../scene/noise3d';

const params = new URLSearchParams(location.search);
const N = Number(params.get('n') ?? 128);
const BOX = 200; // Mpc/h

const cosmology = createCosmology();
const epochs = resolveEpochs(cosmology, EPOCHS);
const growth = createGrowthFactor(PLANCK2018.omegaM);
const stop = params.get('stop') ?? 'today';
const tStop = epochs.find((e) => e.id === stop)?.anchor ?? cosmology.age;
const t = Number(params.get('t') ?? tStop) * Number(params.get('f') ?? 1);
const state = cosmology.stateAt(t).physical!;
const T = state.temperatureK;
const z = state.z;
const D = growth(state.a);
const zStar = PLANCK2018_DERIVED.zStar.value;

// --- Visual state (to move into visualMap.ts) -------------------------------
// Opacity: τ = 1 at z* by definition of z*; the steepness is a licence.
const tau = ((1 + z) / (1 + zStar)) ** 12;
const haze = 1 - Math.exp(-tau);
const colourT = Math.min(Math.max(T, DRAPER_POINT_K), 1e6);
const smooth = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
// Visible glow switches off between 2970 K and the Draper point (as before).
const visible = smooth(Math.log(T / DRAPER_POINT_K) / Math.log(2970 / DRAPER_POINT_K));
// Brightness: T^(1/4) relative to 3000 K (true radiance goes as T⁴: compressed).
const num = (key: string, fallback: number): number => Number(params.get(key) ?? fallback);
const intensity = num('i', 1) * visible * (0.3 + 0.025 * Math.max(0, Math.log10(T / 3000)));
const log10T = Math.log10(T);
const turbulence = Math.min(1, Math.max(0, (log10T - 3.4) / 12)); // 0 at recombination, 1 at the electroweak crossover
const tFirstStars = epochs.find((e) => e.id === 'firstStars')!.anchor;
const dFirstStars = growth(cosmology.stateAt(tFirstStars).physical!.a);
const contrastGain = 1 + 7 * (1 - smooth((D - 0.05) / 0.25));

const linear = (rgb: readonly number[]): Color => new Color().setRGB(rgb[0]!, rgb[1]!, rgb[2]!, SRGBColorSpace);
const plasmaColour = linear(blackbodySrgb(colourT));
const cmbHot = linear(blackbodySrgb(Math.min(Math.max(T * 1.3, DRAPER_POINT_K), 1e6)));
const cmbCold = linear(blackbodySrgb(Math.min(Math.max(T * 0.75, DRAPER_POINT_K), 1e6)));

console.log(JSON.stringify({ stop, t, T, z, D, haze, intensity, turbulence, contrastGain }));

// --- Renderer ----------------------------------------------------------------
const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(params.get('exposure') ?? 1);
document.body.append(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 400);

// --- Field -------------------------------------------------------------------
const web = createCosmicWeb(
  { omegaM: PLANCK2018.omegaM, h: PLANCK2018.H0 / 100, omegaBh2: 0.02242, TCMB0: PLANCK2018.TCMB0, ns: 0.9665, sigma8: 0.8102 },
  { n: N, boxMpcH: BOX, smoothingMpcH: 2.5, seed: 11 },
);

// Camera: about 45 Mpc/h from the most massive peak, looking at it.
const n3 = N * N * N;
const gridPos = (index: number): Vector3 =>
  new Vector3(((index % N) + 0.5) / N, ((Math.floor(index / N) % N) + 0.5) / N, (Math.floor(index / (N * N)) + 0.5) / N);
const top = web.peaks[0]!;
const topPos = gridPos(top.index).add(new Vector3(web.displacement[3 * top.index], web.displacement[3 * top.index + 1], web.displacement[3 * top.index + 2]));
const camBox = topPos.clone().add(new Vector3(0.17, 0.08, 0.14)); // box units
camBox.set(camBox.x - Math.floor(camBox.x), camBox.y - Math.floor(camBox.y), camBox.z - Math.floor(camBox.z));
camera.position.set(0, 0, 0);
const toTop = new Vector3(-0.17, -0.08, -0.14).normalize();
camera.lookAt(toTop.add(new Vector3(0.12, 0.05, 0)));

// --- Background: plasma volume and microwave sky ------------------------------
const noiseSize = 64;
const noise = new Data3DTexture(tileableNoise(noiseSize), noiseSize, noiseSize, noiseSize);
noise.format = RedFormat;
noise.minFilter = noise.magFilter = LinearFilter;
noise.wrapS = noise.wrapT = noise.wrapR = RepeatWrapping;
noise.needsUpdate = true;

const background = new Mesh(
  new PlaneGeometry(2, 2),
  new ShaderMaterial({
    glslVersion: GLSL3,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uNoise: { value: noise },
      uCamera: { value: camera.matrixWorld },
      uProjInv: { value: camera.projectionMatrixInverse },
      uOrigin: { value: camBox.clone().multiplyScalar(4) },
      uTime: { value: Number(params.get('time') ?? 3) },
      uHaze: { value: haze },
      uColour: { value: plasmaColour },
      uIntensity: { value: intensity },
      uTurbulence: { value: turbulence },
      uCmbHot: { value: cmbHot },
      uCmbCold: { value: cmbCold },
      uCmbLevel: { value: num('cmb', 3) * intensity * (1 - haze) },
      uLow: { value: num('lo', 0.4) },
      uHigh: { value: num('hi', 0.85) },
      uSigma: { value: num('sig', 1) },
      uEmit: { value: num('em', 3) },
    },
    vertexShader: /* glsl */ `
      uniform mat4 uCamera;
      uniform mat4 uProjInv;
      out vec3 vDir;
      void main() {
        vec4 view = uProjInv * vec4(position.xy, 1.0, 1.0);
        vDir = mat3(uCamera) * (view.xyz / view.w);
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      precision highp sampler3D;
      uniform sampler3D uNoise;
      uniform vec3 uOrigin;
      uniform float uTime, uHaze, uIntensity, uTurbulence, uCmbLevel, uLow, uHigh, uSigma, uEmit;
      uniform vec3 uColour, uCmbHot, uCmbCold;
      in vec3 vDir;
      out vec4 fragColour;

      float n3(vec3 p) { return texture(uNoise, p).r; }

      // Turbulent density: domain-warped, ridged noise (filaments of hot
      // plasma); finer, more contorted and faster when hotter.
      float density(vec3 p, float t) {
        float f = mix(0.45, 1.5, uTurbulence);
        vec3 q = p * f;
        float speed = mix(0.01, 0.05, uTurbulence);
        vec3 warp = vec3(n3(q * 0.4 + vec3(0.0, 0.0, t * speed)), n3(q * 0.4 + vec3(0.31, t * speed, 0.17)), n3(q * 0.4 + vec3(t * speed, 0.53, 0.71)));
        q += (warp - 0.5) * mix(0.5, 1.6, uTurbulence);
        float a = n3(q);
        float b = n3(q * 2.3 + 0.37);
        float c = n3(q * 5.3 + 0.11);
        float ridge = 1.0 - abs(2.0 * b - 1.0);
        float r3 = ridge * ridge * ridge * uTurbulence;
        float d = a * (0.9 - 0.4 * uTurbulence) + r3 * 0.4 + c * 0.1;
        return smoothstep(uLow, uHigh, d);
      }

      // Microwave-background pattern on the sky: blobs of about a degree
      // (first acoustic peak) with finer structure; contrast exaggerated.
      float cmb(vec3 dir) {
        vec3 p = dir * 2.0;
        float v = (n3(p) - 0.5) * 0.5 + (n3(p * 2.7 + 0.2) - 0.5) * 0.6 + (n3(p * 6.3 + 0.7) - 0.5) * 0.3 + (n3(p * 14.0 + 0.4) - 0.5) * 0.12;
        return clamp(v * 2.6, -1.0, 1.0);
      }

      void main() {
        vec3 dir = normalize(vDir);
        vec3 colour = vec3(0.0);
        float transmittance = 1.0;
        if (uHaze > 0.001) {
          // March into the opaque plasma; it never ends, so what remains of the
          // ray sees more of the same glow.
          float s = 0.02;
          for (int i = 0; i < 28; i++) {
            vec3 p = uOrigin + dir * s;
            float d = density(p, uTime);
            float sigma = mix(0.05, 2.0, d) * uHaze * uSigma;
            float ds = 0.015 + s * 0.15;
            vec3 deep = uColour * 0.3;
            vec3 hot = mix(uColour, vec3(1.0), 0.6);
            vec3 emission = mix(mix(deep, uColour, smoothstep(0.0, 0.6, d)), hot, smoothstep(0.6, 1.0, d)) * (0.12 + uEmit * d * d * d);
            // Near recombination the plasma is calm: what remains are the hotter
            // and colder regions of the microwave-background pattern.
            float calm = 1.0 - smoothstep(0.0, 0.12, uTurbulence);
            // While fully opaque the glow is almost uniform; the pattern emerges as
            // the fog clears.
            float emerge = 1.0 - uHaze * uHaze;
            vec3 cmbPatch = mix(mix(uCmbCold, uCmbHot, 0.5) * 0.9, mix(uCmbCold * 0.4, uCmbHot * 1.5, d) * (0.15 + 1.6 * d * d), emerge);
            emission = mix(emission, cmbPatch, calm);
            float absorbed = 1.0 - exp(-sigma * ds * 6.0);
            colour += transmittance * absorbed * emission;
            transmittance *= 1.0 - absorbed;
            s += ds;
          }
          colour += transmittance * uColour * 0.15;
          colour *= uIntensity * uHaze;
          transmittance = 1.0 - uHaze;
        }
        if (uCmbLevel > 0.0) {
          float c = cmb(dir);
          float hotness = smoothstep(-0.7, 0.9, c);
          vec3 sky = mix(uCmbCold * 0.5, uCmbHot * 1.4, hotness) * (0.12 + 1.6 * hotness * hotness);
          colour += sky * uCmbLevel * 1.4;
        }
        fragColour = vec4(colour, 1.0);
      }`,
  }),
);
background.frustumCulled = false;
background.renderOrder = -1;
scene.add(background);

// --- Matter: Zel'dovich particles ----------------------------------------------
const PSI_SCALE = 0.25; // |ψ| < 0.25 box
const LAMBDA_SCALE = 8;
const psi = new Int16Array(3 * n3);
const lambda = new Int16Array(3 * n3);
for (let i = 0; i < 3 * n3; i++) {
  psi[i] = Math.round(Math.max(-1, Math.min(1, web.displacement[i]! / PSI_SCALE)) * 32767);
  lambda[i] = Math.round(Math.max(-1, Math.min(1, web.eigenvalues[i]! / LAMBDA_SCALE)) * 32767);
}
const matterGeometry = new BufferGeometry();
matterGeometry.setAttribute('position', new Int16BufferAttribute(psi, 3, true));
matterGeometry.setAttribute('aLambda', new Int16BufferAttribute(lambda, 3, true));
const projScale = innerHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
// Gas brightness falls as structure grows, so that knots do not saturate (licence).
const lateness = smooth(Math.log(D / 0.05) / Math.log(1 / 0.05));
const gasLevel = num('gs', 2 - 1.55 * lateness) * (haze >= 0.3 ? 0 : 1 - haze / 0.3) * (D < 0.03 ? 2.5 : 1.6 - 0.6 * smooth((D - 0.05) / 0.5));
const matter = new Points(
  matterGeometry,
  new ShaderMaterial({
    glslVersion: GLSL3,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uN: { value: N },
      uD: { value: D },
      uCam: { value: camBox },
      uBox: { value: BOX },
      uPsiScale: { value: PSI_SCALE },
      uLambdaScale: { value: LAMBDA_SCALE },
      uGas: { value: gasLevel },
      uGain: { value: contrastGain },
      uProj: { value: projScale },
      uPointScale: { value: num('ps', 1) },
      uHalo: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform int uN;
      uniform float uD, uBox, uPsiScale, uLambdaScale, uGas, uGain, uProj, uPointScale, uHalo;
      uniform vec3 uCam;
      in vec3 aLambda;
      out float vBright;
      out float vDense;
      void main() {
        int i = gl_VertexID;
        uint h = uint(i) * 747796405u + 2891336453u;
        h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
        vec3 jitter = vec3(float(h & 1023u), float((h >> 10u) & 1023u), float((h >> 20u) & 1023u)) / 1023.0;
        vec3 q = (vec3(float(i % uN), float((i / uN) % uN), float(i / (uN * uN))) + jitter) / float(uN);
        vec3 x = q + uD * position * uPsiScale;
        vec3 rel = (fract(x - uCam + 0.5) - 0.5) * uBox;
        vec3 l = aLambda * uLambdaScale;
        float f = (1.0 - uD * l.x) * (1.0 - uD * l.y) * (1.0 - uD * l.z);
        float rho = min(1.0 / max(abs(f), 0.03), 30.0);
        float shown = max(0.0, 1.0 + uGain * (rho - 1.0));
        float r = length(rel);
        float fade = 1.0 - smoothstep(0.32 * uBox, 0.48 * uBox, r);
        vec4 mv = modelViewMatrix * vec4(rel, 1.0);
        vBright = uGas * fade * pow(shown, 1.35) * smoothstep(0.5, 4.0, r);
        vDense = clamp(log(rho) / log(30.0), 0.0, 1.0);
        // Points carry a fixed flux whatever their size: early on they are large
        // and soft, so the gas reads as a medium rather than grains (licence).
        float soft = 1.0 - smoothstep(0.05, 0.4, uD);
        float size = clamp((0.6 + 2.5 * soft) * uProj / max(-mv.z, 0.1), 2.0 + 3.0 * soft, 4.0 + 10.0 * soft) * uPointScale;
        // Halo layer: one particle in eight, drawn large and faint, so that
        // filaments read as continuous glowing gas.
        if (uHalo > 0.0) {
          size *= 5.0;
          if (i % 8 != 0) size = 0.0;
          vBright *= 8.0 * uHalo;
        }
        gl_PointSize = size;
        vBright *= 9.0 / max(size * size, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in float vBright;
      in float vDense;
      out vec4 fragColour;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float disc = exp(-dot(c, c) * 16.0) * (1.0 - smoothstep(0.4, 0.5, length(c)));
        vec3 gas = vec3(0.28, 0.30, 0.75);
        vec3 mid = vec3(0.75, 0.45, 0.95);
        vec3 dense = vec3(1.0, 0.78, 0.55);
        vec3 colour = mix(mix(gas, mid, smoothstep(0.0, 0.45, vDense)), dense, smoothstep(0.45, 1.0, vDense)) * mix(0.05, 0.02, vDense);
        fragColour = vec4(colour * vBright * disc, 1.0);
      }`,
  }),
);
matter.frustumCulled = false;
scene.add(matter);
const haloMaterial = (matter.material as ShaderMaterial).clone();
haloMaterial.uniforms.uHalo!.value = num('halo', 0.6 - 0.25 * lateness);
const halo = new Points(matterGeometry, haloMaterial);
halo.frustumCulled = false;
scene.add(halo);

// --- Stars, galaxies and clusters at the peaks -----------------------------------
// A peak "lights" when D·δ·B reaches 1.686 (linear threshold of spherical
// collapse); B is chosen so that the highest peak lights at the first-stars
// stop (licence `structure`: our grid cannot resolve the first, tiny halos).
const COLLAPSE = 1.686;
const boost = COLLAPSE / (dFirstStars * web.peaks[Math.min(num('fs', 1500), web.peaks.length - 1)]!.delta);
const PEAKS = Math.min(6000, web.peaks.length);
const gal: number[] = [];
const galAttr: number[] = [];
let rng = 12345;
const rand = (): number => {
  rng = (rng * 1664525 + 1013904223) >>> 0;
  return rng / 4294967296;
};
for (let p = 0; p < PEAKS; p++) {
  const { index, delta } = web.peaks[p]!;
  const q = gridPos(index);
  const members = p < 12 ? 70 : p < 60 ? 14 : 1; // clusters and groups at the highest peaks
  for (let m = 0; m < members; m++) {
    const spread = m === 0 ? 0 : (0.004 + 0.01 * rand()) * (p < 12 ? 1.0 : 0.6);
    const theta = 2 * Math.PI * rand();
    const phi = Math.acos(2 * rand() - 1);
    gal.push(
      q.x + spread * Math.sin(phi) * Math.cos(theta),
      q.y + spread * Math.sin(phi) * Math.sin(theta),
      q.z + spread * Math.cos(phi),
    );
    // δ, member rank, seed, peak index for ψ (passed below)
    galAttr.push(delta * (m === 0 ? 1 : 0.92 - 0.25 * rand()), m === 0 ? 0 : 1, rand(), index);
  }
}
const galCount = gal.length / 3;
const galPsi = new Float32Array(3 * galCount);
const galData = new Float32Array(4 * galCount);
for (let g = 0; g < galCount; g++) {
  const index = galAttr[4 * g + 3]!;
  galPsi[3 * g] = web.displacement[3 * index]!;
  galPsi[3 * g + 1] = web.displacement[3 * index + 1]!;
  galPsi[3 * g + 2] = web.displacement[3 * index + 2]!;
  galData[4 * g] = galAttr[4 * g]!;
  galData[4 * g + 1] = galAttr[4 * g + 1]!;
  galData[4 * g + 2] = galAttr[4 * g + 2]!;
  galData[4 * g + 3] = rand();
}
const galGeometry = new BufferGeometry();
galGeometry.setAttribute('position', new Float32BufferAttribute(gal, 3));
galGeometry.setAttribute('aPsi', new Float32BufferAttribute(galPsi, 3));
galGeometry.setAttribute('aData', new Float32BufferAttribute(galData, 4));
const galaxies = new Points(
  galGeometry,
  new ShaderMaterial({
    glslVersion: GLSL3,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uD: { value: D },
      uBoost: { value: boost },
      uCam: { value: camBox },
      uBox: { value: BOX },
      uProj: { value: projScale },
      uVisible: { value: haze < 0.5 ? 1 : 0 },
      uDFirst: { value: dFirstStars },
    },
    vertexShader: /* glsl */ `
      uniform float uD, uBoost, uBox, uProj, uVisible, uDFirst;
      uniform vec3 uCam;
      in vec3 aPsi;
      in vec4 aData;
      out float vAge;
      out float vSeed;
      out float vKind;
      out float vMember;
      out float vFade;
      void main() {
        float growthRatio = uD * aData.x * uBoost / 1.686;
        vAge = log(max(growthRatio, 1e-6));
        vSeed = aData.z;
        vKind = aData.w;
        vMember = aData.y;
        vec3 x = position + uD * aPsi;
        vec3 rel = (fract(x - uCam + 0.5) - 0.5) * uBox;
        vec4 mv = modelViewMatrix * vec4(rel, 1.0);
        float r = length(rel);
        vFade = (1.0 - smoothstep(0.32 * uBox, 0.48 * uBox, r)) * uVisible;
        // Members of groups and clusters gather only once their peak is old.
        float memberOn = vMember > 0.5 ? smoothstep(1.4, 2.4, vAge) : 1.0;
        float lit = step(0.0, vAge) * memberOn;
        // Size: a young starburst is a point; galaxies grow with age (licence).
        float size = mix(0.9, 0.55 + 1.1 * vSeed, smoothstep(0.3, 1.6, vAge));
        if (vMember > 0.5) size *= 0.6;
        gl_PointSize = lit > 0.0 ? clamp(size * uProj / max(-mv.z, 0.1), 2.0, 96.0) : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      in float vAge;
      in float vSeed;
      in float vKind;
      in float vMember;
      in float vFade;
      out vec4 fragColour;
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        float young = 1.0 - smoothstep(0.3, 1.2, vAge);
        // Orientation and inclination per galaxy.
        float a = vSeed * 6.2831;
        mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        vec2 p = rot * c;
        float incl = mix(0.25, 1.0, fract(vSeed * 7.13));
        p.y /= incl;
        float r = length(p);
        if (r > 1.0) discard;
        float theta = atan(p.y, p.x);
        vec3 colour;
        if (young > 0.5) {
          // First stars: a hot blue flash.
          float core = exp(-r * r * 30.0);
          colour = vec3(0.55, 0.7, 1.0) * (core * 9.0 + exp(-r * 6.0) * 0.6);
        } else {
          bool spiral = vKind < 0.62 && vMember < 0.5;
          float bulge = exp(-r * r * 60.0);
          float disk = exp(-r * 4.5);
          float body;
          vec3 tint;
          if (spiral) {
            float arms = 0.5 + 0.5 * cos(2.0 * (theta - log(r + 0.02) * 3.2) + vSeed * 9.0);
            body = disk * (0.35 + 0.9 * arms * smoothstep(0.05, 0.25, r));
            tint = mix(vec3(0.55, 0.68, 1.0), vec3(1.0, 0.9, 0.75), bulge);
          } else {
            body = exp(-pow(r, 0.6) * 5.5);
            tint = vec3(1.0, 0.86, 0.68);
          }
          // Older galaxies are redder (licence).
          tint = mix(tint, tint * vec3(1.0, 0.92, 0.8), smoothstep(1.5, 3.0, vAge));
          colour = tint * (body * 2.2 + bulge * 6.0);
        }
        fragColour = vec4(colour * vFade, 1.0);
      }`,
  }),
);
galaxies.frustumCulled = false;
scene.add(galaxies);

// --- Post-processing -------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.renderTarget1.texture.type = HalfFloatType;
composer.renderTarget2.texture.type = HalfFloatType;
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), num('bs', haze > 0.5 ? 0.9 : haze > 0.05 ? 0.6 : 0.5 - 0.2 * lateness), num('br', 0.5), num('bt', haze > 0.5 ? 0.55 : haze > 0.05 ? 0.7 : 0.8));
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(
  new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0.37 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uSeed;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float vignette = mix(1.0, smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.4), 0.55);
        float grain = (hash(vUv * 1000.0) - 0.5) * 0.02;
        float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 graded = mix(vec3(luma), c.rgb, 1.2);
        gl_FragColor = vec4(graded * vignette + grain, 1.0);
      }`,
  }),
);

composer.render();
(window as unknown as { __ready: boolean }).__ready = true;

// Debug: how many lit sites are in view.
{
  const forward = new Vector3();
  camera.getWorldDirection(forward);
  let lit = 0;
  let inView = 0;
  for (let g = 0; g < galCount; g++) {
    if (galData[4 * g + 1]! > 0.5) continue;
    if (D * galData[4 * g]! * boost < COLLAPSE) continue;
    lit++;
    const x = new Vector3(gal[3 * g]! + D * galPsi[3 * g]!, gal[3 * g + 1]! + D * galPsi[3 * g + 1]!, gal[3 * g + 2]! + D * galPsi[3 * g + 2]!);
    const rel = x.sub(camBox);
    rel.set(rel.x - Math.round(rel.x), rel.y - Math.round(rel.y), rel.z - Math.round(rel.z)).multiplyScalar(BOX);
    if (rel.length() < 0.4 * BOX && rel.clone().normalize().dot(forward) > Math.cos(0.5)) inView++;
  }
  console.log(JSON.stringify({ lit, inView, boost }));
}
