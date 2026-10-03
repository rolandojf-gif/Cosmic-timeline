// Wires the model, the control, the panel, the scene and the language together.
//
// State is one number, the control position u, plus the locale. Every change
// schedules a single render on the next animation frame. The panel follows u at
// once; the scene eases towards it (licence `transitions`).

import { LOCALES, MESSAGES, detectLocale, type Locale } from '../i18n';
import { PLANCK2018_DERIVED, accelerationOnset, createCosmology, matterLambdaEquality } from '../physics';
import type { ParticleScene } from '../scene/scene';
import { createVisualMap } from '../scene/visualMap';
import { EPOCHS, createTimeScale, resolveEpochs } from '../timeline';
import { el, setText } from './dom';
import { createInfoPanel } from './infoPanel';
import { licenceVars } from './licenceVars';
import { createLicenseLine } from './licenseLine';
import { createTimeControl } from './timeControl';
import { panelView, type Context } from './view';

export function startApp(root: HTMLElement): void {
  const modelStart = performance.now();
  const cosmology = createCosmology();
  const epochs = resolveEpochs(cosmology, EPOCHS);
  const scale = createTimeScale(epochs.map((e) => e.anchor));
  const context: Context = {
    cosmology,
    epochs,
    milestones: {
      acceleration: accelerationOnset(cosmology).t,
      darkEnergy: matterLambdaEquality(cosmology).t,
    },
    lastScattering: cosmology.timeAtRedshift(PLANCK2018_DERIVED.zStar.value),
  };
  // Visible in the browser's performance tools; the plan's budget is 30 ms on a mid-range phone.
  performance.measure('cosmic-timeline:model', { start: modelStart });

  let locale: Locale = detectLocale(location.search, navigator.languages);
  // The journey starts at the beginning of the control.
  let u = 0;
  let localeChanged = true;
  let frame = 0;

  const title = el('h1', { class: 'title' });
  const subtitle = el('p', { class: 'subtitle' });
  const languageButton = el('button', { type: 'button', class: 'language' });
  const panel = createInfoPanel();
  // The instant lives in the header, outside the scrolling area, so it stays on screen.
  const header = el(
    'header',
    { class: 'site-header' },
    el('div', { class: 'masthead' }, el('div', {}, title, subtitle), languageButton),
    panel.instant,
  );

  const control = createTimeControl(scale, (next) => {
    u = next;
    schedule();
  });
  const licences = createLicenseLine();

  const visualMap = createVisualMap(cosmology, epochs);
  // three.js arrives in its own chunk after the panel is up (see loadScene below).
  let scene: ParticleScene | null = null;
  const sceneLayer = el('div', { class: 'scene' });
  const sceneNote = el('p', { class: 'scene-note' });
  sceneNote.hidden = true;

  root.replaceChildren(
    sceneLayer,
    header,
    // On narrow screens the content starts below a transparent window onto the scene.
    el('main', { class: 'stage' }, el('div', { class: 'scene-window' }), panel.element),
    el('div', { class: 'dock' }, control.element, sceneNote, licences.element),
  );

  languageButton.addEventListener('click', () => {
    locale = LOCALES.find((l) => l !== locale) ?? locale;
    const url = new URL(location.href);
    url.searchParams.set('lang', locale);
    history.replaceState(null, '', url);
    localeChanged = true;
    schedule();
  });

  function render(): void {
    frame = 0;
    const m = MESSAGES[locale];
    const t = scale.timeAt(u);
    const view = panelView(context, t, locale, m);

    if (localeChanged) {
      document.documentElement.lang = locale;
      document.title = `${m.meta.title}: ${m.meta.subtitle}`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', m.meta.description);
      setText(title, m.meta.title);
      setText(subtitle, m.meta.subtitle);
      setText(languageButton, m.meta.switchLanguage);
      languageButton.setAttribute('aria-label', m.meta.switchLanguageLabel);
      languageButton.setAttribute('lang', locale === 'es' ? 'en' : 'es');
      licences.update(m, licenceVars(locale, m, visualMap.growth));
      setText(sceneNote, m.scene.unavailable);
      localeChanged = false;
    }

    panel.update(view, m);
    scene?.show(u);
    control.update(u, view.epochIndex);
    control.setTexts({
      label: m.control.label,
      valueText: view.valueText,
      stopsLabel: m.control.stops,
      stopLabels: epochs.map((e) => m.epochs[e.id].short),
      rulerCaption: m.control.rulerCaption,
      keyboardHint: m.control.keyboardHint,
    });
  }

  function schedule(): void {
    if (frame === 0) frame = requestAnimationFrame(render);
  }

  render();
  void loadScene();

  async function loadScene(): Promise<void> {
    const { createParticleScene } = await import('../scene/scene');
    const sceneStart = performance.now();
    scene = createParticleScene({
      stateAt: (position) => visualMap.visualState(scale.timeAt(position)),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      mobile: matchMedia('(max-width: 599px), (pointer: coarse)').matches,
    });
    // Field generation and WebGL setup, after the panel is already visible.
    performance.measure('cosmic-timeline:scene', { start: sceneStart });
    if (scene) {
      sceneLayer.append(scene.element);
      scene.show(u);
    }
    sceneNote.hidden = scene !== null;
    document.body.classList.toggle('has-scene', scene !== null);
  }
}
