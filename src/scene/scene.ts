// The particle scene: one THREE.Points with a raw shader, drawn on demand.
//
// It follows the control with a pause (licence `transitions`): the control
// position shown by the scene eases towards the chosen one, and the visual
// state is recomputed from the model at the eased position, so a long step
// passes through the epochs in between. After each step the field keeps
// drifting apart for a moment (licence `motion`), then the scene stops
// drawing until something changes.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  RawShaderMaterial,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { busiestDirection, createField } from './field';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';
import { createTween } from './tween';
import {
  DRIFT_SECONDS,
  PARTICLES_DESKTOP,
  PARTICLES_MOBILE,
  TRANSITION_SECONDS,
  type VisualState,
} from './visualMap';

/** Side of the periodic box at the start, in world units (licence `separation`). */
const BOX = 4;
/** The box grows to BOX × (1 + SEPARATION_GAIN) today. */
const SEPARATION_GAIN = 1.0;
/**
 * Particles fade out before half the box, so no edge is ever visible. The fade
 * radius grows with the square root of the box, so the field thins out as it
 * expands (about four times fewer particles in view today) without emptying.
 */
const FADE_RADIUS = 0.48 * BOX;
/** Extra growth during the drift after a step, per unit of H·t (licence `motion`). */
const DRIFT_GAIN = 0.04;
/** From this width [CSS px] the view centre moves right by WIDE_SHIFT of the width. */
const WIDE_FROM_PX = 900;
const WIDE_SHIFT = 0.1;
/** Point size in CSS pixels at unit distance. */
const POINT_SIZE = 6;
/** Warm white of starlight (licence `structure`). */
const STAR_COLOUR = [1, 0.93, 0.82] as const;
/** Share of the radiation light that fills the background, more while the universe is opaque. */
const SKY_CLEAR = 0.12;
const SKY_HAZE = 0.4;

export interface SceneOptions {
  /** Visual state at a control position u ∈ [0, 1]. */
  readonly stateAt: (u: number) => VisualState;
  readonly reducedMotion: boolean;
  readonly mobile: boolean;
}

export interface ParticleScene {
  readonly element: HTMLCanvasElement;
  /** Ease towards control position u (or jump there, the first time and with reduced motion). */
  show(u: number): void;
  dispose(): void;
}

const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);

/** The scene, or null when WebGL is not available. */
export function createParticleScene(options: SceneOptions): ParticleScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.mobile ? 1.5 : 2));

  const field = createField(options.mobile ? PARTICLES_MOBILE : PARTICLES_DESKTOP);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(field.uniform, 3));
  geometry.setAttribute('aWeb', new BufferAttribute(field.web, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(field.seed, 1));
  geometry.setAttribute('aStar', new BufferAttribute(field.star, 1));

  const uniforms = {
    uBox: { value: BOX },
    uFadeRadius: { value: FADE_RADIUS },
    uStructure: { value: 0 },
    uStars: { value: 0 },
    uPointSize: { value: POINT_SIZE * renderer.getPixelRatio() },
    uColour: { value: new Color() },
    uGlow: { value: 0 },
    uHaze: { value: 0 },
    uGas: { value: 0 },
    uStarColour: { value: new Color(...STAR_COLOUR) },
  };
  const material = new RawShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const points = new Points(geometry, material);
  // Positions are wrapped in the shader: the CPU bounding sphere means nothing.
  points.frustumCulled = false;

  const scene = new Scene();
  scene.add(points);
  const camera = new PerspectiveCamera(60, 1, 0.01, 20);
  // Look towards a populated part of today's web rather than into a void (licence `camera`).
  const growthToday = 1 + SEPARATION_GAIN;
  const look = busiestDirection(field, (FADE_RADIUS * Math.sqrt(growthToday)) / (BOX * growthToday), Math.PI / 6);
  camera.lookAt(look[0], look[1], look[2]);
  const sky = new Color();

  const tween = createTween(0, TRANSITION_SECONDS);
  let first = true;
  let driftStart = -Infinity;
  let drift = 0;
  let driftFrom = 0;
  let frame = 0;

  const now = (): number => performance.now() / 1000;

  function resize(): void {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    // On wide screens the text column covers the left: centre the view in the open part.
    if (width >= WIDE_FROM_PX) camera.setViewOffset(width, height, -WIDE_SHIFT * width, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function draw(time: number): void {
    const u = Math.min(1, Math.max(0, tween.valueAt(time)));
    const state = options.stateAt(u);

    // While stepping, the drift of the previous instant fades out; afterwards a new one grows.
    if (!tween.doneAt(time)) {
      drift = driftFrom * (1 - Math.min(1, (time - (driftStart - TRANSITION_SECONDS)) / TRANSITION_SECONDS));
    } else if (!options.reducedMotion) {
      drift = DRIFT_GAIN * state.expansion * easeOut(Math.min(1, (time - driftStart) / DRIFT_SECONDS));
    }

    const growth = (1 + SEPARATION_GAIN * state.separation) * Math.exp(drift);
    uniforms.uBox.value = BOX * growth;
    uniforms.uFadeRadius.value = FADE_RADIUS * Math.sqrt(growth);
    uniforms.uStructure.value = state.structure;
    uniforms.uStars.value = state.stars;
    uniforms.uGlow.value = state.glow;
    uniforms.uHaze.value = state.haze;
    uniforms.uGas.value = state.gas;
    // The shader writes sRGB values directly; the sky goes through three's colour management.
    uniforms.uColour.value.setRGB(state.colour[0], state.colour[1], state.colour[2]);
    const skyLevel = state.glow * (SKY_CLEAR + SKY_HAZE * state.haze);
    sky.setRGB(state.colour[0] * skyLevel, state.colour[1] * skyLevel, state.colour[2] * skyLevel, SRGBColorSpace);
    renderer.setClearColor(sky);
    renderer.render(scene, camera);
  }

  function animating(time: number): boolean {
    return !tween.doneAt(time) || (!options.reducedMotion && time - driftStart < DRIFT_SECONDS);
  }

  function loop(): void {
    frame = 0;
    const time = now();
    draw(time);
    if (animating(time) && !document.hidden) frame = requestAnimationFrame(loop);
  }

  function request(): void {
    if (frame === 0) frame = requestAnimationFrame(loop);
  }

  const onResize = (): void => {
    resize();
    request();
  };
  const onVisibility = (): void => {
    if (!document.hidden) request();
  };
  const onLost = (event: Event): void => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onRestored = (): void => {
    resize();
    request();
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  resize();

  return {
    element: canvas,
    show(u) {
      const time = now();
      if (first || options.reducedMotion) {
        first = false;
        tween.jump(u);
        driftStart = options.reducedMotion ? -Infinity : time;
        drift = 0;
      } else if (u !== tween.target) {
        driftFrom = drift;
        tween.retarget(u, time);
        // The new drift starts when the step ends.
        driftStart = time + TRANSITION_SECONDS;
      }
      request();
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
