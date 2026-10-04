// Wires the model, the control, the panel, the scene and the language together.
//
// State is one number, the control position u, plus the locale. Every change
// schedules a single render on the next animation frame. The panel follows u at
// once; the scene eases towards it (licence `transitions`).

import { LOCALES, MESSAGES, detectLocale, type Locale } from '../i18n';
import { PLANCK2018_DERIVED, accelerationOnset, createCosmology, matterLambdaEquality } from '../physics';
import type { ParticleScene } from '../scene/scene';
import { createVisualMap } from '../scene/visualMap';
import { EPOCHS, createTimeScale, resolveEpochs, type EpochId } from '../timeline';
import { el, setText } from './dom';
import { createFlashCard } from './flashCard';
import { createInfoPanel } from './infoPanel';
import { licenceVars } from './licenceVars';
import { createLicenseLine } from './licenseLine';
import { createTicker } from './ticker';
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
  const masthead = el('div', { class: 'masthead' }, el('div', { class: 'title-group' }, title, subtitle));

  const panelToggle = el('button', {
    type: 'button',
    class: 'panel-toggle',
    'aria-expanded': 'false',
  });
  const languageButton = el('button', { type: 'button', class: 'language' });

  const panel = createInfoPanel();
  const ticker = createTicker();

  let togglePlayAndPanel = (): void => {};
  const flashCard = createFlashCard(() => togglePlayAndPanel());

  const header = el('header', { class: 'site-header' }, masthead);

  const stage = el('main', { class: 'stage' }, el('div', { class: 'scene-window' }), panel.element);

  function updateDrawerClasses(open: boolean, pinned: boolean): void {
    stage.classList.toggle('drawer-open', open);
    stage.classList.toggle('drawer-pinned', pinned);
    panelToggle.classList.toggle('active', open);
    panelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  panel.setOnOpenChange((open, pinned) => {
    updateDrawerClasses(open, pinned);
  });

  panelToggle.addEventListener('click', () => {
    panel.setOpen(!panel.isOpen());
  });

  let isPlaying = false;
  const control = createTimeControl(
    scale,
    (next, playing, isMilestonePause) => {
      u = next;
      isPlaying = playing;
      if (isPlaying && !panel.isPinned()) {
        panel.setOpen(false);
      } else if (!isPlaying && isMilestonePause && !panel.isPinned()) {
        panel.setOpen(true);
      }
      schedule();
    },
    [panelToggle, languageButton],
  );

  togglePlayAndPanel = () => {
    const playing = control.isPlaying();
    if (playing) {
      control.setPlaying(false);
      panel.setOpen(true);
    } else {
      panel.setOpen(false);
      control.setPlaying(true);
    }
  };
  const licences = createLicenseLine();

  const visualMap = createVisualMap(cosmology, epochs);
  // three.js arrives in its own chunk after the panel is up (see loadScene below).
  let scene: ParticleScene | null = null;
  const sceneLayer = el('div', { class: 'scene' });
  sceneLayer.addEventListener('click', (e) => {
    if (e.target === sceneLayer) {
      togglePlayAndPanel();
    }
  });
  const sceneNote = el('p', { class: 'scene-note' });
  sceneNote.hidden = true;
  // Why the scene is missing, when it is: no WebGL, or the chunk failed to load.
  let sceneProblem: 'unavailable' | 'loadFailed' = 'unavailable';

  // 3D scene callout for Milky Way / Solar System / Earth landmarks
  const calloutTitle = el('span', { class: 'callout-title' });
  const calloutSub = el('span', { class: 'callout-subtitle' });
  const calloutCard = el('div', { class: 'callout-card' }, calloutTitle, calloutSub);
  const calloutReticle = el('div', { class: 'callout-reticle' });
  const callout = el(
    'button',
    {
      type: 'button',
      class: 'scene-callout',
      'aria-label': '',
    },
    calloutCard,
    calloutReticle,
  );
  callout.hidden = true;

  const calloutLayer = el('div', { class: 'callout-layer' }, callout);

  let currentTargetEpochId: 'reheating' | 'milkyWay' | 'solarSystem' | 'earth' | 'today' | null = null;
  let targetScreenPos: { x: number; y: number; visible: boolean } | null = null;

  callout.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTargetEpochId === 'reheating') {
      control.jumpTo(scale.positionOf(1e-30), true);
      return;
    }
    if (currentTargetEpochId) {
      const sequence: EpochId[] = ['milkyWay', 'solarSystem', 'earth', 'today'];
      const currentIdx = sequence.indexOf(currentTargetEpochId);
      if (currentIdx !== -1) {
        // Always advance cleanly in landmark sequence: Milky Way -> Solar System -> Earth -> Today -> Milky Way
        const nextIdx = (currentIdx + 1) % sequence.length;
        const nextEpoch = epochs.find((ep) => ep.id === sequence[nextIdx]);
        if (nextEpoch) {
          control.jumpTo(scale.positionOf(nextEpoch.anchor), true);
        }
      }
    }
  });

  function updateCalloutPosition(): void {
    if (!targetScreenPos || !targetScreenPos.visible || !currentTargetEpochId) {
      callout.classList.remove('visible');
      callout.hidden = true;
      return;
    }
    callout.hidden = false;
    callout.style.left = `${targetScreenPos.x}px`;
    callout.style.top = `${targetScreenPos.y}px`;
    callout.classList.add('visible');
  }

  const dock = el('div', { class: 'dock' }, control.element, sceneNote, licences.element);
  const updateDockHeight = () => {
    const dockHeight = dock.offsetHeight;
    if (dockHeight > 0) {
      document.documentElement.style.setProperty('--dock-height', `${dockHeight}px`);
    }
  };
  const dockObserver = new ResizeObserver(updateDockHeight);
  dockObserver.observe(dock);
  requestAnimationFrame(updateDockHeight);

  root.replaceChildren(
    sceneLayer,
    header,
    stage,
    ticker.element,
    flashCard.element,
    dock,
    calloutLayer,
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
      setText(panelToggle, m.meta.sciencePanel);
      panelToggle.setAttribute('aria-label', m.meta.sciencePanelLabel);
      setText(languageButton, m.meta.switchLanguage);
      languageButton.setAttribute('aria-label', m.meta.switchLanguageLabel);
      languageButton.setAttribute('lang', locale === 'es' ? 'en' : 'es');
      licences.update(m, licenceVars(locale, m, visualMap.growth));
      setText(sceneNote, m.scene[sceneProblem]);
      localeChanged = false;
    }

    panel.update(view, m);
    ticker.update(view.ticker);
    flashCard.show(view.flashCard, isPlaying);
    scene?.show(u, isPlaying);
    control.update(u, view.epochIndex);
    control.setTexts({
      label: m.control.label,
      valueText: view.valueText,
      stopsLabel: m.control.stops,
      stopLabels: epochs.map((e) => m.epochs[e.id].short),
      rulerCaption: m.control.rulerCaption,
      keyboardHint: m.control.keyboardHint,
      play: m.control.play,
      pause: m.control.pause,
      reset: m.control.reset,
      prevStop: m.control.prevStop,
      nextStop: m.control.nextStop,
      autoPause: m.control.autoPause,
      autoPauseLabel: m.control.autoPauseLabel,
      speed: m.control.speed,
    });

    const currentEpoch = epochs[view.epochIndex];
    const epochId = currentEpoch?.id;
    if (epochId === 'inflation' && t >= 1e-32 && t <= 1e-28) {
      currentTargetEpochId = 'reheating';
      setText(calloutTitle, m.callout.reheating);
      setText(calloutSub, m.callout.reheatingSub);
      callout.setAttribute('aria-label', `${m.callout.reheating}: ${m.callout.reheatingSub}`);
      targetScreenPos = { x: Math.round(window.innerWidth * 0.65), y: Math.round(window.innerHeight * 0.40), visible: true };
    } else if (epochId === 'milkyWay') {
      currentTargetEpochId = 'milkyWay';
      setText(calloutTitle, m.callout.milkyWay);
      setText(calloutSub, m.callout.milkyWaySub);
      callout.setAttribute('aria-label', `${m.callout.milkyWay}: ${m.callout.milkyWaySub}`);
    } else if (epochId === 'solarSystem') {
      currentTargetEpochId = 'solarSystem';
      setText(calloutTitle, m.callout.solarSystem);
      setText(calloutSub, m.callout.solarSystemSub);
      callout.setAttribute('aria-label', `${m.callout.solarSystem}: ${m.callout.solarSystemSub}`);
    } else if (epochId === 'earth') {
      currentTargetEpochId = 'earth';
      setText(calloutTitle, m.callout.earth);
      setText(calloutSub, m.callout.earthSub);
      callout.setAttribute('aria-label', `${m.callout.earth}: ${m.callout.earthSub}`);
    } else if (epochId === 'today') {
      currentTargetEpochId = 'today';
      setText(calloutTitle, m.callout.today);
      setText(calloutSub, m.callout.todaySub);
      callout.setAttribute('aria-label', `${m.callout.today}: ${m.callout.todaySub}`);
    } else {
      currentTargetEpochId = null;
    }
    updateCalloutPosition();
  }

  function schedule(): void {
    if (frame === 0) frame = requestAnimationFrame(render);
  }

  render();
  void loadScene();

  async function loadScene(): Promise<void> {
    // A failed chunk download (offline, CDN error) or WebGL setup leaves the
    // page as a browser without WebGL does: panel, control and a note saying why.
    let createParticleScene: typeof import('../scene/scene').createParticleScene;
    try {
      ({ createParticleScene } = await import('../scene/scene'));
    } catch (error) {
      console.error('cosmic-timeline: scene chunk failed to load', error);
      sceneProblem = 'loadFailed';
      setText(sceneNote, MESSAGES[locale].scene.loadFailed);
      sceneNote.hidden = false;
      return;
    }
    try {
      const sceneStart = performance.now();
      scene = createParticleScene({
        stateAt: (position) => visualMap.visualState(scale.timeAt(position)),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        mobile: matchMedia('(max-width: 599px), (pointer: coarse)').matches,
        onTargetScreenPos: (pos) => {
          if (currentTargetEpochId === 'reheating') return;
          targetScreenPos = pos;
          updateCalloutPosition();
        },
        onSceneClick: () => togglePlayAndPanel(),
      });
      // Field generation and WebGL setup, after the panel is already visible.
      performance.measure('cosmic-timeline:scene', { start: sceneStart });
    } catch (error) {
      console.error('cosmic-timeline: scene setup failed', error);
      scene = null;
    }
    if (scene) {
      sceneLayer.append(scene.element);
      scene.show(u);
    }
    sceneNote.hidden = scene !== null;
    document.body.classList.toggle('has-scene', scene !== null);
  }
}
