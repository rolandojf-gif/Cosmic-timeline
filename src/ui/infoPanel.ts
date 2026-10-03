// The information panel: the instant, its epoch, and the model's values.

import type { Messages } from '../i18n';
import type { Source } from '../timeline';
import { el, link, setText } from './dom';
import type { PanelView } from './view';

export interface InfoPanel {
  readonly element: HTMLElement;
  update(view: PanelView, m: Messages): void;
}

const sourceList = (sources: readonly Source[]): (Node | string)[] =>
  sources.flatMap((s, i) => (i === 0 ? [link(s.url, s.citation)] : ['; ', link(s.url, s.citation)]));

export function createInfoPanel(): InfoPanel {
  const timeLabel = el('p', { class: 'time-label' });
  const time = el('p', { class: 'time-value' });
  const lookback = el('p', { class: 'lookback' });

  const evidence = el('p', { class: 'epoch-evidence' });
  const name = el('h2', { class: 'epoch-name', 'aria-live': 'polite' });
  const interval = el('p', { class: 'epoch-interval' });
  const illustrative = el('p', { class: 'epoch-illustrative' });
  const description = el('p', { class: 'epoch-description' });
  const landmarksHeading = el('h3', { class: 'landmarks-heading' });
  const landmarks = el('ul', { class: 'landmarks' });
  const sources = el('p', { class: 'sources' });

  const valuesHeading = el('h3', { class: 'values-heading' });
  const values = el('dl', { class: 'values' });
  const tier = el('p', { class: 'tier' });
  const model = el('p', { class: 'model' });

  const element = el(
    'section',
    { class: 'panel' },
    el('div', { class: 'instant' }, timeLabel, time, lookback),
    el('div', { class: 'epoch' }, evidence, name, interval, illustrative, description, landmarksHeading, landmarks, sources),
    el('div', { class: 'model-values' }, valuesHeading, tier, values, model),
  );

  let renderedEpoch = -1;
  let renderedMessages: Messages | null = null;
  let valueRows: { dd: HTMLElement }[] = [];

  return {
    element,
    update(view, m) {
      setText(timeLabel, m.panel.time);
      setText(time, view.time);
      lookback.hidden = view.lookback === null;
      setText(lookback, view.lookback === null ? '' : `${m.panel.lookback}: ${view.lookback}`);

      // Epoch texts change only with the stop or the language.
      if (view.epochIndex !== renderedEpoch || m !== renderedMessages) {
        setText(evidence, `${m.panel.evidence}: ${view.evidence}`);
        setText(name, view.epochName);
        interval.hidden = view.interval === null;
        setText(interval, view.interval ?? '');
        illustrative.hidden = view.illustrative === null;
        setText(illustrative, view.illustrative ?? '');
        setText(description, view.description);
        landmarksHeading.hidden = view.landmarks.length === 0;
        setText(landmarksHeading, m.panel.landmarks);
        landmarks.replaceChildren(...view.landmarks.map((l) => el('li', {}, l)));
        sources.replaceChildren(`${m.panel.sources}: `, ...sourceList(view.sources));
        setText(valuesHeading, m.panel.values);
        model.replaceChildren(m.panel.model, ' ', `${m.panel.modelSources}: `, ...sourceList(view.modelSources), '.');
        renderedEpoch = view.epochIndex;
      }
      setText(tier, view.tier);
      tier.dataset['tier'] = view.values === null ? 'speculative' : 'model';

      if (view.values === null) {
        values.hidden = true;
      } else {
        values.hidden = false;
        if (valueRows.length !== view.values.length || m !== renderedMessages) {
          values.replaceChildren();
          valueRows = view.values.map((row) => {
            const dd = el('dd', {});
            values.append(el('div', { class: 'value-row' }, el('dt', {}, row.label), dd));
            return { dd };
          });
        }
        view.values.forEach((row, i) => setText(valueRows[i]!.dd, row.value));
      }
      renderedMessages = m;
    },
  };
}
