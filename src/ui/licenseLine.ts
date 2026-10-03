// The licence line: every declared visual interpretation, generated from the
// register in scene/visualMap.ts so that none can be left out.

import { fill, type Messages } from '../i18n';
import { VISUAL_LICENCES, type LicenceId } from '../scene/visualMap';
import { el } from './dom';

export interface LicenseLine {
  readonly element: HTMLElement;
  update(m: Messages, vars: Readonly<Record<LicenceId, Readonly<Record<string, string>>>>): void;
}

export function createLicenseLine(): LicenseLine {
  const summary = el('summary', {});
  const body = el('div', { class: 'licences-body' });
  const details = el('details', {}, summary, body);
  const element = el('footer', { class: 'licences' }, details);

  return {
    element,
    update(m, vars) {
      const names = VISUAL_LICENCES.map((id) => m.licences[id].name);
      summary.textContent = `${m.licences.heading}: ${names.join(', ')}`;
      body.replaceChildren(
        el('p', {}, m.licences.intro),
        el(
          'dl',
          {},
          ...VISUAL_LICENCES.flatMap((id) => [
            el('dt', {}, m.licences[id].name),
            el('dd', {}, fill(m.licences[id].detail, vars[id])),
          ]),
        ),
      );
    },
  };
}
