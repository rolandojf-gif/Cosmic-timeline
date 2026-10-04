// Prominent horizontal ticker displaying cosmic time, current epoch,
// and key physical insight for the instant in a single cinematic bar.

import { el, setText } from './dom';
import type { TickerView } from './view';

export interface Ticker {
  readonly element: HTMLElement;
  update(ticker: TickerView): void;
}

export function createTicker(): Ticker {
  const timeLabel = el('span', { class: 'ticker-label' });
  const timeValue = el('span', { class: 'ticker-value' });
  const timeSub = el('span', { class: 'ticker-sub' });
  const timeCol = el('div', { class: 'ticker-col ticker-col-time' }, timeLabel, timeValue, timeSub);

  const epochLabel = el('span', { class: 'ticker-label' });
  const epochPulse = el('span', { class: 'ticker-pulse' });
  const epochName = el('span', { class: 'ticker-epoch-name' });
  const epochRow = el('div', { class: 'ticker-epoch-row' }, epochPulse, epochName);
  const epochCol = el('div', { class: 'ticker-col ticker-col-epoch' }, epochLabel, epochRow);

  const keyDataLabel = el('span', { class: 'ticker-label' });
  const keyDataText = el('span', { class: 'ticker-insight-text' });
  const keyDataCol = el('div', { class: 'ticker-col ticker-col-insight' }, keyDataLabel, keyDataText);

  const element = el('div', { class: 'cosmic-ticker' }, timeCol, epochCol, keyDataCol);

  return {
    element,
    update(ticker) {
      setText(timeLabel, ticker.cosmicTimeLabel);
      setText(timeValue, ticker.time);
      if (ticker.lookback) {
        setText(timeSub, `${ticker.lookbackLabel}: ${ticker.lookback}`);
        timeSub.hidden = false;
      } else {
        timeSub.hidden = true;
      }

      setText(epochLabel, ticker.epochLabel);
      setText(epochName, ticker.epochName);

      setText(keyDataLabel, ticker.keyDataLabel);
      setText(keyDataText, ticker.keyData);
    },
  };
}
