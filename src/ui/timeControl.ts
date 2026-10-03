// The time control: a slider over the piecewise-logarithmic scale, a ruler with
// the true logarithmic scale underneath, and the list of stops.
//
// The position u ∈ [0, 1] is held as a double by the app; the DOM only shows it,
// so the control's resolution never limits which instant can be reached.

import type { TimeScale } from '../timeline';
import { positionAfterKey } from './controlKeys';
import { el, setText } from './dom';
import { formatPowerOfTen } from './format';

export interface ControlTexts {
  readonly label: string;
  readonly valueText: string;
  readonly stopsLabel: string;
  readonly stopLabels: readonly string[];
  readonly rulerCaption: string;
  readonly keyboardHint: string;
  readonly play: string;
  readonly pause: string;
  readonly reset: string;
  readonly speed: string;
}

export interface TimeControl {
  readonly element: HTMLElement;
  update(u: number, currentStop: number): void;
  setTexts(texts: ControlTexts): void;
  jumpTo(position: number, autoPlay?: boolean): void;
}

/** Ruler labels every this many powers of ten. */
const LABEL_EVERY = 10;
/** Minimum distance between ruler labels on narrow screens, as a fraction of the control. */
const NARROW_LABEL_GAP = 0.11;

const percent = (u: number): string => `${(u * 100).toFixed(3)}%`;

export function createTimeControl(scale: TimeScale, onChange: (u: number) => void): TimeControl {
  let u = 0;
  let current = -1;
  let isPlaying = false;
  let speed = 1;
  const BASE_DURATION_SECONDS = 60;
  let lastTimestamp = 0;
  let animId = 0;

  // Track the position at once: several key presses can arrive before the
  // next render, and each must start from the previous one.
  const change = (next: number): void => {
    u = next;
    onChange(next);
  };

  /**
   * Cinematic pacing curve for timeline playback:
   * - Early epochs (Planck to Nucleosynthesis, u < 0.42): visually uniform plasma,
   *   paced briskly (~1.9x) so it does not feel sluggish (~13 s at 1x).
   * - Transition into Recombination (0.42 to 0.58): smooth deceleration (~8 s at 1x).
   * - Recombination & Dark Ages (0.58 to 0.68): slow, atmospheric pace (0.42x, ~14 s at 1x)
   *   allowing photon decoupling, CMB glow extinguishing, and deep dark ages to be savored.
   * - Cosmic Web, Galaxies & Today (0.68 to 1.0): unhurried pace (0.55x, ~35 s at 1x)
   *   giving time to watch filaments condense and 3D galaxy landmark callouts to appear and be clicked.
   */
  function pacingFactor(pos: number): number {
    if (pos < 0.42) return 1.9;
    if (pos < 0.58) {
      const f = (pos - 0.42) / (0.58 - 0.42);
      return 1.9 - (1.9 - 0.42) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.68) return 0.42;
    if (pos < 0.80) {
      const f = (pos - 0.68) / (0.80 - 0.68);
      return 0.42 + (0.55 - 0.42) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    return 0.55;
  }

  function playLoop(timestamp: number): void {
    if (!isPlaying) return;
    if (lastTimestamp > 0) {
      const dt = (timestamp - lastTimestamp) / 1000;
      const rate = pacingFactor(u);
      const du = (dt * speed * rate) / BASE_DURATION_SECONDS;
      let nextU = u + du;
      if (nextU >= 1) {
        nextU = 1;
        setPlaying(false);
      }
      change(nextU);
    }
    lastTimestamp = timestamp;
    if (isPlaying) {
      animId = requestAnimationFrame(playLoop);
    }
  }

  function setPlaying(playing: boolean): void {
    if (isPlaying === playing) return;
    isPlaying = playing;
    if (isPlaying) {
      if (u >= 1) {
        change(0);
      }
      lastTimestamp = performance.now();
      animId = requestAnimationFrame(playLoop);
      btnPlay.classList.add('active');
      btnPlay.setAttribute('aria-pressed', 'true');
      btnPause.classList.remove('active');
      btnPause.setAttribute('aria-pressed', 'false');
    } else {
      cancelAnimationFrame(animId);
      lastTimestamp = 0;
      btnPlay.classList.remove('active');
      btnPlay.setAttribute('aria-pressed', 'false');
      btnPause.classList.add('active');
      btnPause.setAttribute('aria-pressed', 'true');
    }
  }

  const btnReset = el('button', { type: 'button', class: 'playback-btn reset' });
  setText(btnReset, '⏮');
  btnReset.addEventListener('click', () => {
    change(0);
  });

  const btnPlay = el('button', { type: 'button', class: 'playback-btn play' });
  setText(btnPlay, '▶');
  btnPlay.addEventListener('click', () => {
    setPlaying(true);
  });

  const btnPause = el('button', { type: 'button', class: 'playback-btn pause active', 'aria-pressed': 'true' });
  setText(btnPause, '⏸');
  btnPause.addEventListener('click', () => {
    setPlaying(false);
  });

  const SPEEDS = [1, 2, 4] as const;
  const speedButtons = SPEEDS.map((s) => {
    const btn = el('button', { type: 'button', class: s === speed ? 'speed-btn active' : 'speed-btn' });
    setText(btn, `${s}×`);
    btn.addEventListener('click', () => {
      speed = s;
      speedButtons.forEach((b, idx) => b.classList.toggle('active', SPEEDS[idx] === speed));
    });
    return btn;
  });
  const speedGroup = el('div', { class: 'speed-group', role: 'group' }, ...speedButtons);
  const playbackActions = el('div', { class: 'playback-actions' }, btnReset, btnPlay, btnPause, speedGroup);

  const fill = el('div', { class: 'control-fill' });
  const thumb = el('div', { class: 'control-thumb' });
  const marks = scale.positions.map((p) => {
    const mark = el('span', { class: 'control-stop' });
    mark.style.left = percent(p);
    return mark;
  });
  const rail = el('div', { class: 'control-rail' }, fill, ...marks, thumb);
  const hint = el('p', { id: 'control-hint', class: 'visually-hidden' });
  const slider = el(
    'div',
    {
      class: 'control-slider',
      role: 'slider',
      tabindex: '0',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-describedby': 'control-hint',
    },
    rail,
  );

  // True logarithmic scale: one tick per power of ten of time in seconds.
  const first = scale.anchors[0]!;
  const last = scale.anchors[scale.anchors.length - 1]!;
  const ticks: HTMLElement[] = [];
  let lastKeptLabel = -Infinity;
  for (let k = Math.ceil(Math.log10(first)); k <= Math.floor(Math.log10(last)); k++) {
    const major = k % LABEL_EVERY === 0;
    const position = scale.positionOf(10 ** k);
    const tick = el('span', { class: major ? 'ruler-tick major' : 'ruler-tick' });
    tick.style.left = percent(position);
    ticks.push(tick);
    if (major) {
      // Labels too close to the previous kept one are hidden on narrow screens.
      const crowded = position - lastKeptLabel < NARROW_LABEL_GAP;
      if (!crowded) lastKeptLabel = position;
      const label = el('span', { class: crowded ? 'ruler-label crowded' : 'ruler-label' }, formatPowerOfTen(k));
      label.style.left = tick.style.left;
      ticks.push(label);
    }
  }
  const ruler = el('div', { class: 'ruler', 'aria-hidden': 'true' }, ...ticks);
  const rulerCaption = el('p', { class: 'ruler-caption' });
  const playbackBar = el('div', { class: 'playback-bar' }, playbackActions, rulerCaption);

  const stopButtons = scale.positions.map((p) => {
    const button = el('button', { type: 'button', class: 'stop-button' });
    button.addEventListener('click', () => {
      change(p);
      lastTimestamp = performance.now();
      setPlaying(true);
    });
    return button;
  });
  const stopsNav = el('nav', { class: 'stops' }, el('ol', {}, ...stopButtons.map((b) => el('li', {}, b))));

  const element = el('section', { class: 'control' }, playbackBar, slider, ruler, hint, stopsNav);

  slider.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      setPlaying(!isPlaying);
      return;
    }
    const next = positionAfterKey(event.key, event.shiftKey, u, scale.positions);
    if (next === null) return;
    event.preventDefault();
    setPlaying(false);
    change(next);
  });

  const positionFromPointer = (clientX: number): number => {
    const rect = rail.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  slider.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    setPlaying(false);
    slider.setPointerCapture(event.pointerId);
    slider.focus({ preventScroll: true });
    change(positionFromPointer(event.clientX));
  });
  slider.addEventListener('pointermove', (event) => {
    if (slider.hasPointerCapture(event.pointerId)) {
      setPlaying(false);
      change(positionFromPointer(event.clientX));
    }
  });

  return {
    element,
    update(position, currentStop) {
      u = position;
      fill.style.width = percent(u);
      thumb.style.left = percent(u);
      slider.setAttribute('aria-valuenow', (u * 100).toFixed(1));
      if (u >= 1 && isPlaying) {
        setPlaying(false);
      }
      if (currentStop !== current) {
        stopButtons[current]?.removeAttribute('aria-current');
        marks[current]?.classList.remove('current');
        current = currentStop;
        stopButtons[current]?.setAttribute('aria-current', 'step');
        marks[current]?.classList.add('current');
        stopButtons[current]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    },
    setTexts(texts) {
      slider.setAttribute('aria-label', texts.label);
      slider.setAttribute('aria-valuetext', texts.valueText);
      btnPlay.setAttribute('aria-label', texts.play);
      btnPause.setAttribute('aria-label', texts.pause);
      btnReset.setAttribute('aria-label', texts.reset);
      speedGroup.setAttribute('aria-label', texts.speed);
      stopsNav.setAttribute('aria-label', texts.stopsLabel);
      texts.stopLabels.forEach((label, i) => setText(stopButtons[i]!, label));
      setText(rulerCaption, texts.rulerCaption);
      setText(hint, texts.keyboardHint);
    },
    jumpTo(position, autoPlay = true) {
      change(position);
      if (autoPlay) {
        lastTimestamp = performance.now();
        setPlaying(true);
      }
    },
  };
}
