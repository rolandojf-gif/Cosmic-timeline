// The only place where physical data become visual parameters, and the
// register of every declared visual licence.
//
// The licence line in the interface is generated from VISUAL_LICENCES, so an
// interpretation cannot reach the screen without being declared there. Each
// licence also has an entry in docs/licencias-visuales.md and its texts in
// i18n (`licences.<id>`), both checked by tests.
//
// feat/ui only declares the scale of the time control; the particle scene adds
// its own licences (colour, density, camera, transitions) in feat/scene.

export type LicenceId = 'controlScale';

export const VISUAL_LICENCES: readonly LicenceId[] = ['controlScale'];
