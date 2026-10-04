// The redesigned 5-regime scene: raymarched plasma background, Zel'dovich
// matter particles, peak galaxies, and ACES tone mapping with bloom and grading.
// Follows visualState() strictly for all visual properties. Pure WebGL/three.js.

import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferGeometry,
  Color,
  Data3DTexture,
  Euler,
  Float32BufferAttribute,
  GLSL3,
  HalfFloatType,
  Int16BufferAttribute,
  LinearFilter,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RedFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PLANCK2018 } from '../physics';
import type { CosmicWeb } from './cosmicWeb';
import { generateCosmicWeb } from './cosmicWebLoader';
import { tileableNoise } from './noise3d';
import { createTween } from './tween';
import {
  BACKGROUND_FRAGMENT_SHADER,
  BACKGROUND_VERTEX_SHADER,
  GALAXIES_FRAGMENT_SHADER,
  GALAXIES_VERTEX_SHADER,
  GRADING_FRAGMENT_SHADER,
  GRADING_VERTEX_SHADER,
  MATTER_FRAGMENT_SHADER,
  MATTER_VERTEX_SHADER,
} from './sceneShaders';
import {
  PARTICLES_DESKTOP,
  PARTICLES_MOBILE,
  TRANSITION_SECONDS,
  type VisualState,
} from './visualMap';

const BOX = 200; // Mpc/h
const PSI_SCALE = 0.25; // |ψ| < 0.25 box
const LAMBDA_SCALE = 8;
const COLLAPSE = 1.686;
const WIDE_FROM_PX = 900;
const WIDE_SHIFT = 0.1;

export interface SceneOptions {
  /** Visual state at a control position u ∈ [0, 1]. */
  readonly stateAt: (u: number) => VisualState;
  readonly reducedMotion: boolean;
  readonly mobile: boolean;
  readonly onTargetScreenPos?: (pos: { x: number; y: number; visible: boolean }) => void;
  readonly onSceneClick?: () => void;
}

export interface ParticleScene {
  readonly element: HTMLCanvasElement;
  /** Ease towards control position u (or jump with reduced motion / direct sync). */
  show(u: number, immediate?: boolean): void;
  dispose(): void;
}

function buildMatterGeometry(web: CosmicWeb, n: number): BufferGeometry {
  const n3 = n * n * n;
  const psi = new Int16Array(3 * n3);
  const lambda = new Int16Array(3 * n3);
  for (let i = 0; i < 3 * n3; i++) {
    psi[i] = Math.round(Math.max(-1, Math.min(1, web.displacement[i]! / PSI_SCALE)) * 32767);
    lambda[i] = Math.round(Math.max(-1, Math.min(1, web.eigenvalues[i]! / LAMBDA_SCALE)) * 32767);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Int16BufferAttribute(psi, 3, true));
  geometry.setAttribute('aLambda', new Int16BufferAttribute(lambda, 3, true));
  return geometry;
}

function buildGalaxies(
  web: CosmicWeb,
  dFirstStars: number,
  n: number,
): {
  readonly geometry: BufferGeometry;
  readonly boost: number;
  readonly targetQ: Vector3;
  readonly targetPsi: Vector3;
} {
  const boost = COLLAPSE / (dFirstStars * web.peaks[Math.min(1500, web.peaks.length - 1)]!.delta);
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
    const qx = ((index % n) + 0.5) / n;
    const qy = ((Math.floor(index / n) % n) + 0.5) / n;
    const qz = (Math.floor(index / (n * n)) + 0.5) / n;
    const members = p < 12 ? 70 : p < 60 ? 14 : 1;
    for (let m = 0; m < members; m++) {
      const spread = m === 0 ? 0 : (0.004 + 0.01 * rand()) * (p < 12 ? 1.0 : 0.6);
      const theta = 2 * Math.PI * rand();
      const phi = Math.acos(2 * rand() - 1);
      gal.push(
        qx + spread * Math.sin(phi) * Math.cos(theta),
        qy + spread * Math.sin(phi) * Math.sin(theta),
        qz + spread * Math.cos(phi),
      );
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
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(gal, 3));
  geometry.setAttribute('aPsi', new Float32BufferAttribute(galPsi, 3));
  geometry.setAttribute('aData', new Float32BufferAttribute(galData, 4));

  // Designated Milky Way representative galaxy (member 2 of primary cluster)
  const targetQ = new Vector3(gal[6] ?? 0.5, gal[7] ?? 0.5, gal[8] ?? 0.5);
  const targetPsi = new Vector3(galPsi[6] ?? 0, galPsi[7] ?? 0, galPsi[8] ?? 0);

  return { geometry, boost, targetQ, targetPsi };
}

export function createParticleScene(options: SceneOptions): ParticleScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.mobile ? 1.5 : 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.05, 400);
  camera.position.set(0, 0, 0);

  const baseCamBox = new Vector3(0.5, 0.5, 0.5);
  const camBox = baseCamBox.clone();
  const toTop = new Vector3(-0.17, -0.08, -0.14).normalize();
  camera.lookAt(toTop.clone().add(new Vector3(0.12, 0.05, 0)));

  // Interactive camera controls (zoom & pan/orbit)
  const DEFAULT_FOV = 55;
  const MIN_FOV = 22;
  const MAX_FOV = 85;
  let targetFov = DEFAULT_FOV;
  let currentFov = DEFAULT_FOV;

  let targetYaw = 0;
  let currentYaw = 0;
  let targetPitch = 0;
  let currentPitch = 0;

  const targetPan = new Vector3(0, 0, 0);
  const currentPan = new Vector3(0, 0, 0);

  const baseLookDir = toTop.clone().add(new Vector3(0.12, 0.05, 0)).normalize();
  const baseLookQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), baseLookDir);
  const rotEuler = new Euler(0, 0, 0, 'YXZ');
  const rotQuat = new Quaternion();

  // --- Background: 3D noise texture and raymarched plasma/CMB sky ---
  const noiseSize = 64;
  const noise = new Data3DTexture(tileableNoise(noiseSize), noiseSize, noiseSize, noiseSize);
  noise.format = RedFormat;
  noise.minFilter = noise.magFilter = LinearFilter;
  noise.wrapS = noise.wrapT = noise.wrapR = RepeatWrapping;
  noise.needsUpdate = true;

  const bgUniforms = {
    uNoise: { value: noise },
    uCamera: { value: camera.matrixWorld },
    uProjInv: { value: camera.projectionMatrixInverse },
    uOrigin: { value: camBox.clone().multiplyScalar(4) },
    uTime: { value: 0 },
    uHaze: { value: 0 },
    uColour: { value: new Color(1, 1, 1) },
    uIntensity: { value: 1 },
    uTurbulence: { value: 0 },
    uCmbHot: { value: new Color(1, 1, 1) },
    uCmbCold: { value: new Color(1, 1, 1) },
    uCmbLevel: { value: 0 },
    uLow: { value: 0.4 },
    uHigh: { value: 0.85 },
    uSigma: { value: 1 },
    uEmit: { value: 3 },
    uStretch: { value: 0 },
    uClump: { value: 0 },
  };

  const bgMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    depthTest: false,
    depthWrite: false,
    uniforms: bgUniforms,
    vertexShader: BACKGROUND_VERTEX_SHADER,
    fragmentShader: BACKGROUND_FRAGMENT_SHADER,
  });

  const background = new Mesh(new PlaneGeometry(2, 2), bgMaterial);
  background.frustumCulled = false;
  background.renderOrder = -1;
  scene.add(background);

  // --- Post-processing Composer ---
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.texture.type = HalfFloatType;
  composer.renderTarget2.texture.type = HalfFloatType;
  composer.addPass(new RenderPass(scene, camera));

  let bloomPass: UnrealBloomPass | null = null;
  if (!options.mobile) {
    bloomPass = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.7);
    composer.addPass(bloomPass);
  }
  composer.addPass(new OutputPass());

  const gradingPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0.37 } },
    vertexShader: GRADING_VERTEX_SHADER,
    fragmentShader: GRADING_FRAGMENT_SHADER,
  });
  composer.addPass(gradingPass);

  // --- Matter & Galaxies: populated when Cosmic Web worker resolves ---
  let matterGeometry: BufferGeometry | null = null;
  let matterMaterial: ShaderMaterial | null = null;
  let haloMaterial: ShaderMaterial | null = null;
  let galaxiesGeometry: BufferGeometry | null = null;
  let galaxiesMaterial: ShaderMaterial | null = null;
  let targetQ: Vector3 | null = null;
  let targetPsi: Vector3 | null = null;

  const N = options.mobile ? 64 : 128;
  const initialProjScale = innerHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));

  void generateCosmicWeb(
    {
      omegaM: PLANCK2018.omegaM,
      h: PLANCK2018.H0 / 100,
      omegaBh2: PLANCK2018.omegaBh2,
      TCMB0: PLANCK2018.TCMB0,
      ns: PLANCK2018.ns,
      sigma8: PLANCK2018.sigma8,
    },
    { n: N, boxMpcH: BOX, smoothingMpcH: 2.5, seed: 11 },
  ).then((web) => {
    if (disposed) return;

    const top = web.peaks[0];
    if (top) {
      const topX = ((top.index % N) + 0.5) / N + web.displacement[3 * top.index]!;
      const topY = ((Math.floor(top.index / N) % N) + 0.5) / N + web.displacement[3 * top.index + 1]!;
      const topZ = (Math.floor(top.index / (N * N)) + 0.5) / N + web.displacement[3 * top.index + 2]!;
      baseCamBox.set(topX + 0.17, topY + 0.08, topZ + 0.14);
      baseCamBox.set(
        baseCamBox.x - Math.floor(baseCamBox.x),
        baseCamBox.y - Math.floor(baseCamBox.y),
        baseCamBox.z - Math.floor(baseCamBox.z),
      );
      camBox.copy(baseCamBox);
      baseLookDir.copy(toTop).add(new Vector3(0.12, 0.05, 0)).normalize();
      baseLookQuat.setFromUnitVectors(new Vector3(0, 0, -1), baseLookDir);
    }

    matterGeometry = buildMatterGeometry(web, N);
    const height = canvas.clientHeight || window.innerHeight;
    const projScale = height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    matterMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      uniforms: {
        uN: { value: N },
        uD: { value: 0 },
        uCam: { value: camBox },
        uBox: { value: BOX },
        uPsiScale: { value: PSI_SCALE },
        uLambdaScale: { value: LAMBDA_SCALE },
        uGas: { value: 0 },
        uGain: { value: 1 },
        uProj: { value: projScale },
        uPointScale: { value: 1 },
        uHalo: { value: 0 },
      },
      vertexShader: MATTER_VERTEX_SHADER,
      fragmentShader: MATTER_FRAGMENT_SHADER,
    });

    const matter = new Points(matterGeometry, matterMaterial);
    matter.frustumCulled = false;
    scene.add(matter);

    haloMaterial = matterMaterial.clone();
    haloMaterial.uniforms.uHalo!.value = 0.6;
    const halo = new Points(matterGeometry, haloMaterial);
    halo.frustumCulled = false;
    scene.add(halo);

    const firstState = options.stateAt(currentU);
    const { geometry: galGeom, boost, targetQ: tQ, targetPsi: tPsi } = buildGalaxies(web, firstState.dFirstStars, N);
    galaxiesGeometry = galGeom;
    targetQ = tQ;
    targetPsi = tPsi;

    galaxiesMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      uniforms: {
        uD: { value: 0 },
        uBoost: { value: boost },
        uCam: { value: camBox },
        uBox: { value: BOX },
        uProj: { value: projScale },
        uVisible: { value: 0 },
        uDFirst: { value: firstState.dFirstStars },
      },
      vertexShader: GALAXIES_VERTEX_SHADER,
      fragmentShader: GALAXIES_FRAGMENT_SHADER,
    });

    const galaxies = new Points(galaxiesGeometry, galaxiesMaterial);
    galaxies.frustumCulled = false;
    scene.add(galaxies);

    scheduleFrame();
  });

  // --- Animation loop, tweens and camera drift ---
  const tween = createTween(0, TRANSITION_SECONDS);
  let currentU = 0;
  let isFirstJump = true;
  let disposed = false;
  let animFrameId = 0;
  let isRunning = false;

  // --- Development FPS counter (?fps in URL or press 'f' key) ---
  let fpsVisible = typeof location !== 'undefined' && new URLSearchParams(location.search).has('fps');
  const fpsEl = document.createElement('div');
  fpsEl.className = 'scene-fps';
  fpsEl.style.cssText =
    'position:fixed;bottom:12px;right:12px;padding:4px 8px;background:rgba(0,0,0,0.8);color:#4ade80;font:11px monospace;border-radius:4px;z-index:9999;pointer-events:none;letter-spacing:0.05em;border:1px solid rgba(255,255,255,0.1);';
  fpsEl.hidden = !fpsVisible;
  document.body.appendChild(fpsEl);

  let lastFpsTime = performance.now();
  let frameCount = 0;

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'f' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      fpsVisible = !fpsVisible;
      fpsEl.hidden = !fpsVisible;
    }
  }

  function updateProjection(): void {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    camera.fov = currentFov;
    camera.aspect = width / Math.max(1, height);
    if (width >= WIDE_FROM_PX) {
      camera.setViewOffset(width, height, -WIDE_SHIFT * width, 0, width, height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();

    const projScale = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (matterMaterial) matterMaterial.uniforms.uProj!.value = projScale;
    if (haloMaterial) haloMaterial.uniforms.uProj!.value = projScale;
    if (galaxiesMaterial) galaxiesMaterial.uniforms.uProj!.value = projScale;
  }

  function resize(): void {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    if (bloomPass) bloomPass.resolution.set(width, height);
    updateProjection();
    scheduleFrame();
  }

  function step(timestamp: number): void {
    animFrameId = 0;
    if (disposed) return;

    const nowSec = timestamp / 1000;
    const isTransitioning = !tween.doneAt(nowSec);
    const u = options.reducedMotion ? currentU : Math.min(1, Math.max(0, tween.valueAt(nowSec)));
    const state = options.stateAt(u);

    // Smooth damping for interactive camera controls
    const damp = options.reducedMotion ? 1 : 0.12;
    currentYaw = MathUtils.lerp(currentYaw, targetYaw, damp);
    currentPitch = MathUtils.lerp(currentPitch, targetPitch, damp);
    currentPan.lerp(targetPan, damp);

    const prevFov = currentFov;
    currentFov = MathUtils.lerp(currentFov, targetFov, damp);
    if (Math.abs(currentFov - prevFov) > 0.01) {
      updateProjection();
    }

    const isInteracting =
      pointers.size > 0 ||
      Math.abs(currentYaw - targetYaw) > 0.0001 ||
      Math.abs(currentPitch - targetPitch) > 0.0001 ||
      Math.abs(currentFov - targetFov) > 0.01 ||
      currentPan.distanceToSquared(targetPan) > 1e-6;

    // Apply interactive rotation: yaw around world Y, pitch around local X
    rotEuler.set(currentPitch, currentYaw, 0, 'YXZ');
    rotQuat.setFromEuler(rotEuler);
    camera.quaternion.copy(baseLookQuat).multiply(rotQuat);

    // Continuous subtle camera drift with parallax: steady forward glide through the periodic box
    if (!options.reducedMotion) {
      const driftSpeed = 0.0003;
      const driftOffset = new Vector3(
        (nowSec * driftSpeed * 0.8) % 1,
        (nowSec * driftSpeed * 0.4) % 1,
        (nowSec * driftSpeed * 0.6) % 1,
      );
      camBox.copy(baseCamBox).add(driftOffset).add(currentPan);
      camBox.set(
        camBox.x - Math.floor(camBox.x),
        camBox.y - Math.floor(camBox.y),
        camBox.z - Math.floor(camBox.z),
      );
    } else {
      camBox.copy(baseCamBox).add(currentPan);
      camBox.set(
        camBox.x - Math.floor(camBox.x),
        camBox.y - Math.floor(camBox.y),
        camBox.z - Math.floor(camBox.z),
      );
    }

    camera.updateMatrixWorld();

    // Background uniforms
    bgMaterial.uniforms.uCamera!.value = camera.matrixWorld;
    bgMaterial.uniforms.uProjInv!.value = camera.projectionMatrixInverse;
    bgMaterial.uniforms.uOrigin!.value.copy(camBox).multiplyScalar(4);
    bgMaterial.uniforms.uTime!.value = nowSec;
    bgMaterial.uniforms.uHaze!.value = state.haze;
    (bgMaterial.uniforms.uColour!.value as Color).setRGB(
      state.colour[0],
      state.colour[1],
      state.colour[2],
      SRGBColorSpace,
    );
    bgMaterial.uniforms.uIntensity!.value = state.intensity;
    bgMaterial.uniforms.uTurbulence!.value = state.turbulence;
    bgMaterial.uniforms.uEmit!.value = state.emit;
    (bgMaterial.uniforms.uCmbHot!.value as Color).setRGB(
      state.cmbHot[0],
      state.cmbHot[1],
      state.cmbHot[2],
      SRGBColorSpace,
    );
    (bgMaterial.uniforms.uCmbCold!.value as Color).setRGB(
      state.cmbCold[0],
      state.cmbCold[1],
      state.cmbCold[2],
      SRGBColorSpace,
    );
    bgMaterial.uniforms.uCmbLevel!.value = state.cmbLevel;
    bgMaterial.uniforms.uStretch!.value = state.stretch;
    bgMaterial.uniforms.uClump!.value = state.clump;

    // Matter uniforms
    if (matterMaterial && haloMaterial) {
      matterMaterial.uniforms.uD!.value = state.growthD;
      matterMaterial.uniforms.uCam!.value.copy(camBox);
      matterMaterial.uniforms.uGas!.value = state.gasLevel;
      matterMaterial.uniforms.uGain!.value = state.contrastGain;

      haloMaterial.uniforms.uD!.value = state.growthD;
      haloMaterial.uniforms.uCam!.value.copy(camBox);
      haloMaterial.uniforms.uGas!.value = state.gasLevel;
      haloMaterial.uniforms.uGain!.value = state.contrastGain;
      haloMaterial.uniforms.uHalo!.value = state.halo;
    }

    // Galaxy uniforms
    if (galaxiesMaterial) {
      galaxiesMaterial.uniforms.uD!.value = state.growthD;
      galaxiesMaterial.uniforms.uCam!.value.copy(camBox);
      galaxiesMaterial.uniforms.uVisible!.value = state.galaxiesVisible;
    }

    // Bloom parameters
    if (bloomPass) {
      bloomPass.strength = state.bloomStrength;
      bloomPass.threshold = state.bloomThreshold;
    }

    composer.render();

    // Target galaxy screen projection for local landmark callouts (Milky Way / Solar System / Earth)
    if (options.onTargetScreenPos && targetQ && targetPsi) {
      const D = state.growthD;
      let dx = targetQ.x + D * targetPsi.x - camBox.x;
      let dy = targetQ.y + D * targetPsi.y - camBox.y;
      let dz = targetQ.z + D * targetPsi.z - camBox.z;
      dx -= Math.round(dx);
      dy -= Math.round(dy);
      dz -= Math.round(dz);
      const worldPos = new Vector3(dx * BOX, dy * BOX, dz * BOX);
      const proj = worldPos.clone().project(camera);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      const sx = (proj.x * 0.5 + 0.5) * width;
      const sy = (-proj.y * 0.5 + 0.5) * height;
      const inView = proj.z > 0 && proj.z < 1 && proj.x >= -0.9 && proj.x <= 0.9 && proj.y >= -0.9 && proj.y <= 0.9;
      options.onTargetScreenPos({ x: sx, y: sy, visible: inView && state.galaxiesVisible > 0.05 });
    }

    // Dev FPS counter
    frameCount++;
    if (timestamp - lastFpsTime >= 500) {
      if (fpsVisible) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsTime));
        const ms = ((timestamp - lastFpsTime) / frameCount).toFixed(1);
        fpsEl.textContent = `${fps} fps · ${ms} ms`;
      }
      frameCount = 0;
      lastFpsTime = timestamp;
    }

    // Render loop continuation: keep running if transitioning, continuous drift, or interaction damping is active
    if (!document.hidden && (!options.reducedMotion || isTransitioning || isInteracting)) {
      animFrameId = requestAnimationFrame(step);
      isRunning = true;
    } else {
      isRunning = false;
    }
  }

  function scheduleFrame(): void {
    if (!isRunning && !document.hidden) {
      animFrameId = requestAnimationFrame(step);
      isRunning = true;
    }
  }

  function onVisibilityChange(): void {
    if (document.hidden) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = 0;
      }
      isRunning = false;
    } else {
      scheduleFrame();
    }
  }

  // --- Interactive camera gestures: drag look/pan & wheel zoom ---
  const pointers = new Map<number, { x: number; y: number }>();
  let prevPinchDist = 0;
  let clickCandidate: { x: number; y: number; time: number } | null = null;
  let didMovePointer = false;

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      canvas.setPointerCapture?.(e.pointerId);
      if (e.button === 0) {
        clickCandidate = { x: e.clientX, y: e.clientY, time: performance.now() };
        didMovePointer = false;
      }
    } else {
      clickCandidate = null;
      if (pointers.size === 2) {
        const [p1, p2] = Array.from(pointers.values());
        prevPinchDist = Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y);
      }
    }
    scheduleFrame();
  }

  function onPointerMove(e: PointerEvent): void {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;

    if (clickCandidate) {
      const dist = Math.hypot(e.clientX - clickCandidate.x, e.clientY - clickCandidate.y);
      if (dist > 8) {
        didMovePointer = true;
      }
    }

    if (pointers.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      // Primary drag / Shift drag
      if (e.shiftKey || e.button === 2) {
        // Lateral pan through periodic box space
        const panSpeed = (0.0006 * targetFov) / DEFAULT_FOV;
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        targetPan.addScaledVector(right, -dx * panSpeed);
        targetPan.addScaledVector(up, dy * panSpeed);
      } else {
        // Orbit / Look around
        const rotSpeed = 0.0035;
        targetYaw -= dx * rotSpeed;
        targetPitch -= dy * rotSpeed;
        // Clamp pitch to prevent flipping (approx ±80°)
        const maxPitch = (80 * Math.PI) / 180;
        targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));
      }
      scheduleFrame();
    } else if (pointers.size === 2) {
      prev.x = e.clientX;
      prev.y = e.clientY;
      const [p1, p2] = Array.from(pointers.values());
      const dist = Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y);
      if (prevPinchDist > 0 && dist > 0) {
        const factor = prevPinchDist / dist;
        targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFov * factor));
        scheduleFrame();
      }
      prevPinchDist = dist;
    }
  }

  function onPointerUp(e: PointerEvent): void {
    if (clickCandidate && !didMovePointer && e.button === 0) {
      const elapsed = performance.now() - clickCandidate.time;
      if (elapsed < 500) {
        options.onSceneClick?.();
      }
    }
    clickCandidate = null;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      prevPinchDist = 0;
    }
    scheduleFrame();
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = Math.exp(e.deltaY * 0.0018);
    targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFov * zoomFactor));
    scheduleFrame();
  }

  function onDblClick(): void {
    // Double click resets camera view to default orientation and FOV
    targetFov = DEFAULT_FOV;
    targetYaw = 0;
    targetPitch = 0;
    targetPan.set(0, 0, 0);
    scheduleFrame();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDblClick);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  resize();

  return {
    element: canvas,
    show(u: number, immediate?: boolean) {
      currentU = u;
      const nowSec = performance.now() / 1000;
      if (options.reducedMotion || isFirstJump || immediate) {
        tween.jump(u);
        isFirstJump = false;
      } else {
        tween.retarget(u, nowSec);
      }
      scheduleFrame();
    },
    dispose() {
      disposed = true;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = 0;
      }
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      fpsEl.remove();

      noise.dispose();
      bgMaterial.dispose();
      background.geometry.dispose();

      matterGeometry?.dispose();
      matterMaterial?.dispose();
      haloMaterial?.dispose();
      galaxiesGeometry?.dispose();
      galaxiesMaterial?.dispose();

      composer.dispose();
      renderer.dispose();
    },
  };
}
