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
}

export interface TimeControl {
  readonly element: HTMLElement;
  update(u: number, currentStop: number): void;
  setTexts(texts: ControlTexts): void;
}

/** Ruler labels every this many powers of ten. */
const LABEL_EVERY = 10;
/** Minimum distance between ruler labels on narrow screens, as a fraction of the control. */
const NARROW_LABEL_GAP = 0.11;

const percent = (u: number): string => `${(u * 100).toFixed(3)}%`;

export function createTimeControl(scale: TimeScale, onChange: (u: number) => void): TimeControl {
  let u = 0;
  let current = -1;
  // Track the position at once: several key presses can arrive before the
  // next render, and each must start from the previous one.
  const change = (next: number): void => {
    u = next;
    onChange(next);
  };

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

  const stopButtons = scale.positions.map((p) => {
    const button = el('button', { type: 'button', class: 'stop-button' });
    button.addEventListener('click', () => change(p));
    return button;
  });
  const stopsNav = el('nav', { class: 'stops' }, el('ol', {}, ...stopButtons.map((b) => el('li', {}, b))));

  const element = el('section', { class: 'control' }, slider, ruler, rulerCaption, hint, stopsNav);

  slider.addEventListener('keydown', (event) => {
    const next = positionAfterKey(event.key, event.shiftKey, u, scale.positions);
    if (next === null) return;
    event.preventDefault();
    change(next);
  });

  const positionFromPointer = (clientX: number): number => {
    const rect = rail.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  slider.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    slider.setPointerCapture(event.pointerId);
    slider.focus({ preventScroll: true });
    change(positionFromPointer(event.clientX));
  });
  slider.addEventListener('pointermove', (event) => {
    if (slider.hasPointerCapture(event.pointerId)) change(positionFromPointer(event.clientX));
  });

  return {
    element,
    update(position, currentStop) {
      u = position;
      fill.style.width = percent(u);
      thumb.style.left = percent(u);
      slider.setAttribute('aria-valuenow', (u * 100).toFixed(1));
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
      stopsNav.setAttribute('aria-label', texts.stopsLabel);
      texts.stopLabels.forEach((label, i) => setText(stopButtons[i]!, label));
      setText(rulerCaption, texts.rulerCaption);
      setText(hint, texts.keyboardHint);
    },
  };
}
