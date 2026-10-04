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
  readonly prevStop: string;
  readonly nextStop: string;
  readonly autoPause: string;
  readonly autoPauseLabel: string;
  readonly speed: string;
}

export interface TimeControl {
  readonly element: HTMLElement;
  update(u: number, currentStop: number): void;
  setTexts(texts: ControlTexts): void;
  jumpTo(position: number, autoPlay?: boolean, isMilestone?: boolean): void;
  setPlaying(playing: boolean, isMilestone?: boolean): void;
  isPlaying(): boolean;
  togglePlay(): void;
  setAutoPause(enabled: boolean): void;
  isAutoPauseEnabled(): boolean;
}

/** Ruler labels every this many powers of ten. */
const LABEL_EVERY = 10;
/** Minimum distance between ruler labels on narrow screens, as a fraction of the control. */
const NARROW_LABEL_GAP = 0.11;

const percent = (u: number): string => `${(u * 100).toFixed(3)}%`;

export function createTimeControl(
  scale: TimeScale,
  onChange: (u: number, isPlaying: boolean, isMilestonePause?: boolean) => void,
  extraActions?: readonly HTMLElement[],
): TimeControl {
  let u = 0;
  let current = -1;
  let isPlaying = false;
  let speed = 1;
  const BASE_DURATION_SECONDS = 60;
  let lastTimestamp = 0;
  let animId = 0;

  const reheatingPos = scale.positionOf(1e-32);
  const milestoneAnchors = [...new Set([...scale.positions, reheatingPos])].sort((a, b) => a - b);
  let autoPauseEnabled = true;
  let lastPausedMilestone = -1;

  // Track the position at once: several key presses can arrive before the
  // next render, and each must start from the previous one.
  const change = (next: number, playing = isPlaying, isMilestonePause = false): void => {
    u = next;
    onChange(next, playing, isMilestonePause);
  };

  /**
   * Cinematic pacing curve for timeline playback:
   * - Early epochs (Planck through Inflation, u < 0.12): serene, stately pace (~0.65x)
   *   letting the quantum foam and metric stretching be appreciated without haste.
   * - Reheating / Hot Big Bang flash (0.12 to 0.22): gentle deceleration (~0.42x)
   *   letting the volumetric ignition and creation climax be savored and understood.
   * - Quarks and Hadrons (0.22 to 0.38): unhurried pace (~0.58x) showing the transition
   *   from relativistic quark soup to discrete nucleon confinement.
   * - Nucleosynthesis to Pre-Recombination (0.38 to 0.58): steady pace (~0.65x).
   * - Recombination & Dark Ages (0.58 to 0.70): slow, atmospheric pace (0.38x)
   *   allowing photon decoupling and deep dark ages to be savored.
   * - Cosmic Web & Galaxies (0.70 to 0.88): unhurried pace (0.50x) allowing filaments to condense
   *   and landmark callouts to appear.
   * - Solar System to Earth (0.88 to 0.94): transit smoothly through the short 27-Myr segment (~1.4x).
   * - Earth to Today (0.94 to 1.0): serene, contemplative pace (~0.36x).
   */
  function pacingFactor(pos: number): number {
    if (pos < 0.10) return 0.65;
    if (pos < 0.14) {
      const f = (pos - 0.10) / (0.14 - 0.10);
      return 0.65 - (0.65 - 0.42) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.22) return 0.42;
    if (pos < 0.26) {
      const f = (pos - 0.22) / (0.26 - 0.22);
      return 0.42 + (0.58 - 0.42) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.36) return 0.58;
    if (pos < 0.40) {
      const f = (pos - 0.36) / (0.40 - 0.36);
      return 0.58 + (0.65 - 0.58) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.58) return 0.65;
    if (pos < 0.62) {
      const f = (pos - 0.58) / (0.62 - 0.58);
      return 0.65 - (0.65 - 0.38) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.70) return 0.38;
    if (pos < 0.78) {
      const f = (pos - 0.70) / (0.78 - 0.70);
      return 0.38 + (0.50 - 0.38) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.88) return 0.50;
    if (pos < 0.90) {
      const f = (pos - 0.88) / (0.90 - 0.88);
      return 0.50 + (1.40 - 0.50) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    if (pos < 0.94) return 1.40;
    if (pos < 0.96) {
      const f = (pos - 0.94) / (0.96 - 0.94);
      return 1.40 - (1.40 - 0.36) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
    return 0.36;
  }

  function playLoop(timestamp: number): void {
    if (!isPlaying) return;
    if (lastTimestamp > 0) {
      const dt = (timestamp - lastTimestamp) / 1000;
      const rate = pacingFactor(u);
      const du = (dt * speed * rate) / BASE_DURATION_SECONDS;
      let nextU = u + du;

      if (autoPauseEnabled) {
        const crossed = milestoneAnchors.find((m) => m > u + 0.0005 && m <= nextU + 0.0005);
        if (crossed !== undefined && Math.abs(crossed - lastPausedMilestone) > 0.002) {
          u = crossed;
          lastPausedMilestone = crossed;
          setPlaying(false, true);
          return;
        }
      }

      if (nextU >= 1) {
        u = 1;
        lastPausedMilestone = 1;
        setPlaying(false, true);
        return;
      }
      change(nextU, true, false);
    }
    lastTimestamp = timestamp;
    if (isPlaying) {
      animId = requestAnimationFrame(playLoop);
    }
  }

  function setPlaying(playing: boolean, isMilestone = false): void {
    if (isPlaying === playing) return;
    isPlaying = playing;
    if (isPlaying) {
      if (u >= 1) {
        u = 0;
      }
      lastPausedMilestone = u;
      lastTimestamp = performance.now();
      animId = requestAnimationFrame(playLoop);
      btnPlay.classList.add('active');
      btnPlay.setAttribute('aria-pressed', 'true');
      btnPause.classList.remove('active');
      btnPause.setAttribute('aria-pressed', 'false');
      change(u, true, false);
    } else {
      cancelAnimationFrame(animId);
      lastTimestamp = 0;
      btnPlay.classList.remove('active');
      btnPlay.setAttribute('aria-pressed', 'false');
      btnPause.classList.add('active');
      btnPause.setAttribute('aria-pressed', 'true');
      change(u, false, isMilestone);
    }
  }

  function jumpTo(position: number, autoPlay = true, isMilestone = false): void {
    lastPausedMilestone = position;
    u = position;
    if (autoPlay) {
      if (!isPlaying) {
        setPlaying(true);
      } else {
        lastTimestamp = performance.now();
        change(position, true, false);
      }
    } else {
      if (isPlaying) {
        setPlaying(false, isMilestone);
      } else {
        change(position, false, isMilestone);
      }
    }
  }

  const btnPrev = el('button', { type: 'button', class: 'playback-btn prev' });
  setText(btnPrev, '⏮');
  btnPrev.addEventListener('click', () => {
    const prevAnchor = [...milestoneAnchors].reverse().find((m) => m < u - 0.008);
    const target = prevAnchor !== undefined ? prevAnchor : 0;
    jumpTo(target, isPlaying && !autoPauseEnabled, true);
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

  const btnNext = el('button', { type: 'button', class: 'playback-btn next' });
  setText(btnNext, '⏭');
  btnNext.addEventListener('click', () => {
    const nextAnchor = milestoneAnchors.find((m) => m > u + 0.008);
    const target = nextAnchor !== undefined ? nextAnchor : 1;
    jumpTo(target, isPlaying && !autoPauseEnabled, true);
  });

  const autoPauseIcon = el('span', { class: 'autopause-icon' }, '⏸');
  const autoPauseText = el('span', { class: 'autopause-text' });
  const btnAutoPause = el(
    'button',
    {
      type: 'button',
      class: 'autopause-btn active',
      'aria-pressed': 'true',
    },
    autoPauseIcon,
    autoPauseText,
  );
  btnAutoPause.addEventListener('click', () => {
    autoPauseEnabled = !autoPauseEnabled;
    btnAutoPause.classList.toggle('active', autoPauseEnabled);
    btnAutoPause.setAttribute('aria-pressed', autoPauseEnabled ? 'true' : 'false');
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
  const playbackActionElements: HTMLElement[] = [
    btnPrev,
    btnPlay,
    btnPause,
    btnNext,
    speedGroup,
    btnAutoPause,
  ];
  if (extraActions && extraActions.length > 0) {
    const divider = el('div', { class: 'playback-divider', 'aria-hidden': 'true' });
    playbackActionElements.push(divider, ...extraActions);
  }
  const playbackActions = el('div', { class: 'playback-actions' }, ...playbackActionElements);

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
      jumpTo(p, isPlaying && !autoPauseEnabled, true);
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
      btnPrev.setAttribute('aria-label', texts.prevStop);
      btnPlay.setAttribute('aria-label', texts.play);
      btnPause.setAttribute('aria-label', texts.pause);
      btnNext.setAttribute('aria-label', texts.nextStop);
      speedGroup.setAttribute('aria-label', texts.speed);
      btnAutoPause.setAttribute('aria-label', texts.autoPauseLabel);
      setText(autoPauseText, texts.autoPause);
      stopsNav.setAttribute('aria-label', texts.stopsLabel);
      texts.stopLabels.forEach((label, i) => setText(stopButtons[i]!, label));
      setText(rulerCaption, texts.rulerCaption);
      setText(hint, texts.keyboardHint);
    },
    jumpTo,
    setPlaying,
    isPlaying: () => isPlaying,
    togglePlay: () => setPlaying(!isPlaying),
    setAutoPause(enabled: boolean) {
      autoPauseEnabled = enabled;
      btnAutoPause.classList.toggle('active', autoPauseEnabled);
      btnAutoPause.setAttribute('aria-pressed', autoPauseEnabled ? 'true' : 'false');
    },
    isAutoPauseEnabled: () => autoPauseEnabled,
  };
}
