// Ephemeral floating card appearing at major milestone transitions.
// Explains the cosmological milestone in 1–2 impactful sentences,
// auto-fading after 5 seconds during playback, but staying on pause or hover.

import { el, setText } from './dom';
import type { FlashCardView } from './view';

export interface FlashCard {
  readonly element: HTMLElement;
  show(card: FlashCardView | null, isPlaying: boolean): void;
  dismiss(): void;
}

export function createFlashCard(onClick?: () => void): FlashCard {
  const icon = el('span', { class: 'flash-icon' }, '✦');
  const tag = el('span', { class: 'flash-tag' });
  const tagGroup = el('div', { class: 'flash-tag-group' }, icon, tag);

  const header = el('div', { class: 'flash-header' }, tagGroup);
  const title = el('h4', { class: 'flash-title' });
  const detail = el('p', { class: 'flash-detail' });

  const element = el(
    'aside',
    {
      class: 'milestone-flash',
      'aria-live': 'polite',
      role: 'button',
      tabindex: '0',
    },
    header,
    title,
    detail,
  );
  element.hidden = true;

  element.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick?.();
  });
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    }
  });

  let currentId: string | null = null;
  let dismissedId: string | null = null;
  let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  let isHovered = false;
  let currentPlaying = false;

  function clearTimer(): void {
    if (autoDismissTimer !== null) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
  }

  function armTimer(ms = 5000): void {
    clearTimer();
    if (!currentPlaying || isHovered) return;
    autoDismissTimer = setTimeout(() => {
      dismiss();
    }, ms);
  }

  function dismiss(): void {
    clearTimer();
    element.classList.remove('visible');
    setTimeout(() => {
      if (!element.classList.contains('visible')) {
        element.hidden = true;
      }
    }, 400);
    dismissedId = currentId;
  }


  element.addEventListener('mouseenter', () => {
    isHovered = true;
    clearTimer();
  });

  element.addEventListener('mouseleave', () => {
    isHovered = false;
    if (currentPlaying && element.classList.contains('visible')) {
      armTimer(3000);
    }
  });

  return {
    element,
    dismiss,
    show(card, isPlaying) {
      currentPlaying = isPlaying;

      if (!card) {
        if (currentId !== null) {
          currentId = null;
          dismissedId = null;
          dismiss();
        }
        return;
      }

      if (card.id !== currentId) {
        currentId = card.id;
        dismissedId = null; // New milestone reached: reset dismissal
      }

      if (dismissedId === card.id) {
        // User already closed this card for this milestone encounter
        return;
      }

      setText(tag, card.milestoneLabel);
      setText(title, card.title);
      setText(detail, card.detail);

      if (element.hidden || !element.classList.contains('visible')) {
        element.hidden = false;
        // Trigger reflow for CSS transition
        void element.offsetWidth;
        element.classList.add('visible');
        if (isPlaying) {
          armTimer(5000);
        }
      } else if (isPlaying && autoDismissTimer === null && !isHovered) {
        armTimer(5000);
      }
    },
  };
}
