// Wires the model, the control, the panel and the language together.
//
// State is one number, the control position u, plus the locale. Every change
// schedules a single render on the next animation frame.

import { LOCALES, MESSAGES, detectLocale, fill, type Locale } from '../i18n';
import { accelerationOnset, createCosmology, matterLambdaEquality } from '../physics';
import { DEFAULT_EQUAL_SHARE, EPOCHS, createTimeScale, resolveEpochs } from '../timeline';
import { el, setText } from './dom';
import { formatPercent, formatPowerOfTen } from './format';
import { createInfoPanel } from './infoPanel';
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
  const header = el('header', { class: 'site-header' }, el('div', {}, title, subtitle), languageButton);

  const panel = createInfoPanel();
  const control = createTimeControl(scale, (next) => {
    u = next;
    schedule();
  });
  const licences = createLicenseLine();

  root.replaceChildren(
    header,
    el('main', { class: 'stage' }, panel.element),
    el('div', { class: 'dock' }, control.element, licences.element),
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
      licences.update(m, { controlScale: { equalShare: formatPercent(DEFAULT_EQUAL_SHARE, locale) } });
      localeChanged = false;
    }

    panel.update(view, m);
    control.update(u, view.epochIndex);
    control.setTexts({
      label: m.control.label,
      valueText: view.valueText,
      stopsLabel: m.control.stops,
      stopLabels: epochs.map((e) => m.epochs[e.id].short),
      rulerCaption: fill(m.control.rulerCaption, {
        from: formatPowerOfTen(Math.ceil(Math.log10(scale.anchors[0]!))),
        to: formatPowerOfTen(Math.floor(Math.log10(scale.anchors[scale.anchors.length - 1]!))),
      }),
      keyboardHint: m.control.keyboardHint,
    });
  }

  function schedule(): void {
    if (frame === 0) frame = requestAnimationFrame(render);
  }

  render();
}
