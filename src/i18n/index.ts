// Locale detection and message interpolation. Pure: the DOM side lives in ui/.

import { en } from './en';
import { es, type Messages } from './es';

export type { EpochText, LandmarkText, Messages, Plural } from './es';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const MESSAGES: Readonly<Record<Locale, Messages>> = { es, en };

const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

/**
 * Locale from an explicit `?lang=` parameter, else English. English is the
 * default for every visitor (and for crawlers); Spanish is one click away or
 * via `?lang=es`. The browser language list is deliberately ignored.
 */
export function detectLocale(search: string, _languages: readonly string[] = []): Locale {
  const requested = new URLSearchParams(search).get('lang');
  if (requested !== null && isLocale(requested)) return requested;
  return 'en';
}

/** Replaces each {name} with vars[name]. A missing variable is a bug, not a blank. */
export function fill(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined) throw new Error(`missing value for {${name}} in "${template}"`);
    return value;
  });
}

/** Placeholder names of a template, sorted. */
export function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}
