// The information panel. Two parts: the instant (time, lookback, epoch name),
// which the app keeps fixed on screen, and the content, which scrolls: the
// main layer in everyday terms, the epoch, and the technical data folded away.

import type { Messages } from '../i18n';
import type { Source } from '../timeline';
import { el, link, setText } from './dom';
import type { PanelView } from './view';

export interface InfoPanel {
  /** Time, lookback and epoch name: meant for the fixed header. */
  readonly instant: HTMLElement;
  /** Everything else: meant for the scrolling area. */
  readonly element: HTMLElement;
  update(view: PanelView, m: Messages): void;
}

const sourceList = (sources: readonly Source[]): (Node | string)[] =>
  sources.flatMap((s, i) => (i === 0 ? [link(s.url, s.citation)] : ['; ', link(s.url, s.citation)]));

/** A <dl> whose rows are rebuilt only when their number or the language changes. */
function rowList<Row>(
  className: string,
  build: (row: Row) => { readonly row: HTMLElement; readonly set: (row: Row) => void },
): { readonly element: HTMLElement; update(rows: readonly Row[], rebuild: boolean): void } {
  const element = el('dl', { class: className });
  let setters: ((row: Row) => void)[] = [];
  return {
    element,
    update(rows, rebuild) {
      if (rebuild || setters.length !== rows.length) {
        const built = rows.map(build);
        element.replaceChildren(...built.map((b) => b.row));
        setters = built.map((b) => b.set);
      }
      rows.forEach((row, i) => setters[i]!(row));
    },
  };
}

export function createInfoPanel(): InfoPanel {
  const timeLabel = el('p', { class: 'time-label' });
  const time = el('p', { class: 'time-value' });
  const lookback = el('p', { class: 'lookback' });
  const name = el('h2', { class: 'epoch-name', 'aria-live': 'polite' });
  const instant = el('div', { class: 'instant' }, timeLabel, time, lookback, name);

  const humanHeading = el('h3', { class: 'section-heading' });
  const tier = el('p', { class: 'tier' });
  const human = rowList<{ label: string; text: string }>('human-values', () => {
    const dt = el('dt', {});
    const dd = el('dd', {});
    return {
      row: el('div', { class: 'value-row' }, dt, dd),
      set(row) {
        setText(dt, row.label);
        setText(dd, row.text);
      },
    };
  });

  const evidence = el('p', { class: 'section-heading' });
  const interval = el('p', { class: 'epoch-interval' });
  const illustrative = el('p', { class: 'epoch-illustrative' });
  const description = el('p', { class: 'epoch-description' });
  const landmarksHeading = el('h3', { class: 'section-heading landmarks-heading' });
  const landmarks = el('ul', { class: 'landmarks' });
  const sources = el('p', { class: 'sources' });

  const technicalSummary = el('summary', {});
  const technical = rowList<{ label: string; value: string; meaning: string | null }>('technical-values', () => {
    const dt = el('dt', {});
    const value = el('span', { class: 'technical-value' });
    const meaning = el('span', { class: 'technical-meaning' });
    return {
      row: el('div', { class: 'value-row' }, dt, el('dd', {}, value, meaning)),
      set(row) {
        setText(dt, row.label);
        setText(value, row.value);
        meaning.hidden = row.meaning === null;
        setText(meaning, row.meaning ?? '');
      },
    };
  });
  const model = el('p', { class: 'model' });
  const comparisons = el('p', { class: 'model' });
  // Open by default: technical data is visible without needing to expand, but foldable.
  const technicalBlock = el('details', { class: 'technical', open: '' }, technicalSummary, technical.element, model, comparisons);

  const specBadge = el('span', { class: 'speculative-badge' });
  const specBadgeSub = el('span', { class: 'speculative-badge-sub' });
  const specHeader = el('div', { class: 'speculative-header' }, specBadge, specBadgeSub);

  const specStateDt = el('dt', {});
  const specStateDd = el('dd', {});
  const specStateRow = el('div', { class: 'value-row speculative-row' }, specStateDt, specStateDd);

  const specTempDt = el('dt', {});
  const specTempDd = el('dd', {});
  const specTempRow = el('div', { class: 'value-row speculative-row' }, specTempDt, specTempDd);

  const specForcesDt = el('dt', {});
  const specForcesDd = el('dd', {});
  const specForcesRow = el('div', { class: 'value-row speculative-row' }, specForcesDt, specForcesDd);

  const specLimitDt = el('dt', {});
  const specLimitDd = el('dd', {});
  const specLimitRow = el('div', { class: 'value-row speculative-row' }, specLimitDt, specLimitDd);

  const specList = el('dl', { class: 'speculative-values' }, specStateRow, specTempRow, specForcesRow, specLimitRow);
  const specDisclaimer = el('p', { class: 'tier', 'data-tier': 'speculative' });
  const speculativeCard = el('div', { class: 'speculative-card' }, specHeader, specList, specDisclaimer);

  const element = el(
    'section',
    { class: 'panel' },
    el('div', { class: 'human' }, humanHeading, human.element, tier, speculativeCard),
    el('div', { class: 'epoch' }, evidence, description, interval, illustrative, landmarksHeading, landmarks, sources),
    technicalBlock,
  );

  let renderedEpoch = -1;
  let renderedEpochName = '';
  let renderedMessages: Messages | null = null;

  return {
    instant,
    element,
    update(view, m) {
      const languageChanged = m !== renderedMessages;
      setText(timeLabel, m.panel.time);
      setText(time, view.time);
      lookback.hidden = view.lookback === null;
      setText(lookback, view.lookback === null ? '' : `${m.panel.lookback}: ${view.lookback}`);

      // Epoch texts change only with the stop, sub-epoch transition, or language.
      if (view.epochIndex !== renderedEpoch || view.epochName !== renderedEpochName || languageChanged) {
        setText(name, view.epochName);
        setText(evidence, `${m.panel.evidence}: ${view.evidence}`);
        interval.hidden = view.interval === null;
        setText(interval, view.interval ?? '');
        illustrative.hidden = view.illustrative === null;
        setText(illustrative, view.illustrative ?? '');
        setText(description, view.description);
        landmarksHeading.hidden = view.landmarks.length === 0;
        setText(landmarksHeading, m.panel.landmarks);
        landmarks.replaceChildren(
          ...view.landmarks.map((l) => el('li', {}, l.text, ' ', el('span', { class: 'landmark-sources' }, ...sourceList(l.sources)))),
        );
        sources.replaceChildren(`${m.panel.sources}: `, ...sourceList(view.sources));
        renderedEpoch = view.epochIndex;
        renderedEpochName = view.epochName;
      }
      if (languageChanged) {
        setText(humanHeading, m.panel.human);
        setText(technicalSummary, m.panel.technical);
        model.replaceChildren(m.panel.model, ' ', `${m.panel.modelSources}: `, ...sourceList(view.modelSources), '.');
        comparisons.replaceChildren(`${m.panel.comparisonSources}: `, ...sourceList(view.comparisonSources), '.');
      }

      if (view.speculative !== null) {
        setText(specBadge, view.speculative.badge);
        setText(specBadgeSub, view.speculative.badgeSub);
        setText(specStateDt, view.speculative.stateLabel);
        setText(specStateDd, view.speculative.state);
        setText(specTempDt, view.speculative.tempLabel);
        setText(specTempDd, view.speculative.temperature);
        setText(specForcesDt, view.speculative.forcesLabel);
        setText(specForcesDd, view.speculative.forces);
        setText(specLimitDt, view.speculative.limitLabel);
        setText(specLimitDd, view.speculative.limit);
        setText(specDisclaimer, view.tier);
        speculativeCard.hidden = false;
        human.element.hidden = true;
        tier.hidden = true;
      } else {
        speculativeCard.hidden = true;
        human.element.hidden = false;
        tier.hidden = false;
        setText(tier, view.tier);
        tier.dataset['tier'] = 'model';
        if (view.human !== null) human.update(view.human, languageChanged);
      }
      // In the speculative tier the model gives no values, technical or otherwise.
      technicalBlock.hidden = view.technical === null;
      if (view.technical !== null) technical.update(view.technical, languageChanged);
      renderedMessages = m;
    },
  };
}
