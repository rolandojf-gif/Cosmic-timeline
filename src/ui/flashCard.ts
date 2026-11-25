// Compact, unobtrusive floating bookmark for major cosmic milestones.
// Displays a concise physical stamp alongside a 1-sentence summary; auto-fades
// during playback and dismisses immediately on click without altering playback.

import { el, setText } from './dom';
import type { FlashCardView } from './view';

export interface FlashCard {
  readonly element: HTMLElement;
  show(card: FlashCardView | null, isPlaying: boolean): void;
  dismiss(): void;
}

export function createFlashCard(): FlashCard {
  const icon = el('span', { class: 'flash-icon', 'aria-hidden': 'true' }, '✦');
  const tag = el('span', { class: 'flash-tag' });
  const tagGroup = el('div', { class: 'flash-tag-group' }, icon, tag);
  const meta = el('span', { class: 'flash-meta' });

  const header = el('div', { class: 'flash-header' }, tagGroup, meta);
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

  let currentId: string | null = null;
  let dismissedId: string | null = null;
  let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let isHovered = false;
  let currentPlaying = false;

  function clearTimer(): void {
    if (autoDismissTimer !== null) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
  }

  function clearHideTimer(): void {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function armTimer(ms = 4500): void {
    clearTimer();
    if (!currentPlaying || isHovered) return;
    autoDismissTimer = setTimeout(() => {
      dismiss();
    }, ms);
  }

  function dismiss(): void {
    clearTimer();
    clearHideTimer();
    element.classList.remove('visible');
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (!element.classList.contains('visible')) {
        element.hidden = true;
      }
    }, 300);
    dismissedId = currentId;
  }

  element.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    }
  });

  element.addEventListener('mouseenter', () => {
    isHovered = true;
    clearTimer();
  });

  element.addEventListener('mouseleave', () => {
    isHovered = false;
    if (currentPlaying && element.classList.contains('visible')) {
      armTimer(2500);
    }
  });

  return {
    element,
    dismiss,
    show(card, isPlaying) {
      currentPlaying = isPlaying;

      if (!isPlaying) {
        clearTimer();
      }

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
        dismissedId = null;
      }

      if (dismissedId === card.id) {
        return;
      }

      setText(tag, card.milestoneLabel);
      setText(meta, card.meta);
      setText(title, card.title);
      setText(detail, card.detail);
      element.setAttribute('aria-label', `${card.title}. ${card.closeLabel}`);
      element.setAttribute('title', card.closeLabel);

      if (element.hidden || !element.classList.contains('visible')) {
        clearHideTimer();
        element.hidden = false;
        void element.offsetWidth;
        element.classList.add('visible');
        if (isPlaying) {
          armTimer(4500);
        }
      } else if (isPlaying && autoDismissTimer === null && !isHovered) {
        armTimer(4500);
      }
    },
  };
}
