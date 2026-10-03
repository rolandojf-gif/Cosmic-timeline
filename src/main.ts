import { createCosmology } from './physics';

// The background model is precomputed once at load. The interface arrives in
// later milestones (timeline, ui, scene).
const cosmology = createCosmology();

const app = document.querySelector<HTMLElement>('#app');
if (app) {
  app.dataset['ageSeconds'] = String(cosmology.age);
}
