// Locale detection and message interpolation. Pure: the DOM side lives in ui/.

import { en } from './en';
import { es, type Messages } from './es';

export type { EpochText, LandmarkText, Messages, Plural } from './es';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const MESSAGES: Readonly<Record<Locale, Messages>> = { es, en };

const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

/**
 * Locale from an explicit `?lang=` parameter, else the first preferred browser
 * language we support, else English (the more widely read of the two for
 * visitors who speak neither).
 */
export function detectLocale(search: string, languages: readonly string[]): Locale {
  const requested = new URLSearchParams(search).get('lang');
  if (requested !== null && isLocale(requested)) return requested;
  for (const tag of languages) {
    const primary = tag.toLowerCase().split('-')[0] ?? '';
    if (isLocale(primary)) return primary;
  }
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
