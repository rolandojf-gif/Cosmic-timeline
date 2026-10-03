// English texts. `satisfies Messages` makes the typecheck fail on a missing or
// extra key; tests check that placeholders match the Spanish source.

import type { Messages } from './es';

export const en = {
  meta: {
    title: 'Cosmic Timeline',
    subtitle: 'The history of the universe, from the Planck epoch to today',
    description:
      'An interactive journey through the history of the universe, with the physical values of every instant computed with the Planck 2018 cosmological model.',
    switchLanguage: 'Español',
    switchLanguageLabel: 'View in Spanish',
  },
  control: {
    label: 'Cosmic time',
    valueText: '{time}, {epoch}',
    stops: 'Stops',
    rulerCaption: 'True time scale, in seconds: one tick per factor of ten.',
    keyboardHint: 'Arrows: fine steps (longer with Shift). Page Up and Page Down: next or previous stop.',
    play: 'Play',
    pause: 'Pause',
    reset: 'Reset',
    speed: 'Speed',
  },
  panel: {
    time: 'Cosmic time',
    lookback: 'Time ago',
    human: 'What the universe was like',
    temperatureLabel: 'Temperature',
    temperatureHot: '{degrees} degrees, {ratio} times the temperature {reference}',
    sunCore: 'at the centre of the Sun',
    sunSurface: 'at the surface of the Sun',
    temperatureCelsius: '{celsius} °C',
    temperatureCold: '{celsius} °C, {kelvin} degrees above absolute zero',
    distancesLabel: 'Distances',
    distances: 'Everything was {factor} times closer than today.',
    observedRegion: 'Radius of the region we observe today',
    regionNear: '{km} km, about {ratio} times the distance from the Earth to the Sun',
    expansionLabel: 'Expansion',
    expansion: 'At the rate of that instant, distances would double in {time}.',
    lightLabel: 'Light',
    lightOpaque: 'The universe is opaque: no light from this moment can reach us.',
    lightStretched: 'Light leaving this moment reaches us today stretched {factor} times.',
    technical: 'Technical data',
    temperature: 'Radiation temperature',
    thermalEnergy: 'Typical thermal energy of a particle: kT = {energy}.',
    redshift: 'Redshift z',
    redshiftMeaning: 'Light arrives stretched 1 + z = {factor} times.',
    scaleFactor: 'Scale factor a',
    scaleFactorMeaning: 'Distances were 1/a = {factor} times smaller than today.',
    hubble: 'Hubble parameter H',
    hubbleMeaning: 'Time for distances to double, ln 2 / H: {time}.',
    hubbleRadius: 'Hubble radius c/H',
    hubbleRadiusMeaning: 'Distance at which the expansion carries things away at the speed of light.',
    observedRegionMeaning: 'Today\'s radius, {today}, multiplied by a.',
    model: 'Flat ΛCDM model with the Planck 2018 parameters and the Standard Model degrees of freedom.',
    interval: 'Interval: from {start} to {end}',
    illustrative:
      'Illustrative anchor: the control stops at an instant chosen inside an interval, not at a defined event.',
    evidence: 'What happens in this epoch',
    landmarks: 'Observed in this epoch',
    landmark: '{name} (z = {z}, t = {time}): {description}.',
    sources: 'Sources',
    modelSources: 'Model sources',
    comparisonSources: 'Sources of the comparisons',
  },
  tier: {
    observed:
      'Values tested against observations: light-element abundances, the microwave background and the distribution of galaxies.',
    extrapolated:
      'Extrapolated values: particle physics tested in accelerators, applied to energies the universe reached according to the model.',
    speculative:
      'No confirmed model describes this instant. Only the time is shown; temperature, scale factor, redshift and radii have no reliable value here.',
  },
  evidence: {
    observed: 'observed',
    'established-physics': 'established physics, not directly observed',
    'model-dependent': 'model-dependent, not directly observed',
    speculative: 'speculative',
  },
  units: {
    picoseconds: { one: '{value} picosecond', other: '{value} picoseconds' },
    nanoseconds: { one: '{value} nanosecond', other: '{value} nanoseconds' },
    microseconds: { one: '{value} microsecond', other: '{value} microseconds' },
    milliseconds: { one: '{value} millisecond', other: '{value} milliseconds' },
    countMillion: { one: '{value} million', other: '{value} million' },
    countBillion: { one: '{value} billion', other: '{value} billion' },
    countTrillion: { one: '{value} trillion', other: '{value} trillion' },
    countQuadrillion: { one: '{value} quadrillion', other: '{value} quadrillion' },
    seconds: '{value} s',
    minutes: '{value} min',
    hours: '{value} h',
    days: { one: '{value} day', other: '{value} days' },
    years: { one: '{value} year', other: '{value} years' },
    millionYears: { one: '{value} million years', other: '{value} million years' },
    billionYears: { one: '{value} billion years', other: '{value} billion years' },
    millimeters: '{value} mm',
    meters: '{value} m',
    kilometers: '{value} km',
    astronomicalUnits: '{value} au',
    lightYears: { one: '{value} light-year', other: '{value} light-years' },
    millionLightYears: { one: '{value} million light-years', other: '{value} million light-years' },
    billionLightYears: { one: '{value} billion light-years', other: '{value} billion light-years' },
    kelvin: '{value} K',
    electronVolts: '{value} {prefix}eV',
    hubble: '{value} km s⁻¹ Mpc⁻¹',
  },
  epochs: {
    planck: {
      name: 'Planck epoch',
      short: 'Planck',
      description:
        'Here gravity would need a quantum theory that does not exist yet. No confirmed theory describes this instant: the control starts at the Planck time because that is where known theories stop working, not because something starts there. Time is counted from the extrapolated beginning of the expansion, which is not an observed event.',
    },
    inflation: {
      name: 'Inflation',
      short: 'Inflation',
      description:
        'A hypothesis: a very brief, accelerated expansion that would explain why the universe is so uniform and flat, and where the seeds of galaxies come from. Measurements of the microwave background are consistent with it and rule out many of its models, but they do not fix when it happened or at what energy.',
    },
    quarks: {
      name: 'Quark–gluon plasma',
      short: 'Quarks',
      description:
        'After the electroweak crossover, particles acquire mass through the Higgs field. Quarks and gluons are not confined: they form a plasma together with leptons and photons. This is physics tested in accelerators, applied to a universe nobody has observed at this temperature.',
    },
    hadrons: {
      name: 'Hadron epoch',
      short: 'Hadrons',
      description:
        'Below the quantum chromodynamics crossover, quarks become confined in protons, neutrons and other hadrons. Almost all hadrons and antihadrons annihilate, leaving a small excess of matter. Towards the end, neutrinos decouple and the ratio of neutrons to protons is nearly frozen.',
    },
    nucleosynthesis: {
      name: 'Big Bang nucleosynthesis',
      short: 'Nucleosynthesis',
      description:
        'Once photons stop breaking deuterium apart, protons and neutrons combine into nuclei of deuterium, helium and a little lithium. The abundances set in these minutes are measured today in very old gas and match the prediction, except for a known discrepancy in lithium.',
    },
    recombination: {
      name: 'Recombination',
      short: 'Recombination',
      description:
        'Electrons and nuclei combine into neutral atoms and light stops scattering off them. That light, stretched by the expansion ever since, is the cosmic microwave background: the oldest image of the universe we can observe.',
    },
    darkAges: {
      name: 'Dark ages',
      short: 'Dark ages',
      description:
        'The gas is neutral hydrogen and helium and there are no stars yet. Dark matter and gas slowly gather around the small irregularities seen in the microwave background. There is no direct observation of this epoch; the radio line of neutral hydrogen could provide one.',
    },
    firstStars: {
      name: 'First stars',
      short: 'First stars',
      description:
        'According to simulations, the first stars form in small dark matter halos, from hydrogen and helium without heavier elements, and were probably very massive and short-lived. They have not been observed yet.',
    },
    reionization: {
      name: 'Reionization',
      short: 'Reionization',
      description:
        'Ultraviolet light from the first galaxies strips the electrons from hydrogen again, and the gas between galaxies stops absorbing that light. The anchor is the midpoint measured by Planck; spectra of distant quasars date the end.',
    },
    milkyWay: {
      name: 'Milky Way',
      short: 'Milky Way',
      description:
        'The thick disk of our galaxy starts to form, before reionization is over: epochs overlap. The date comes from ages of subgiant stars measured one by one, and its uncertainty is much larger than that of the cosmological epochs.',
    },
    solarSystem: {
      name: 'Solar System',
      short: 'Solar System',
      description:
        'The first solids condense in the disk around the young Sun. Their age, measured with radioactive lead clocks in meteorites, is one of the most precise dates in this history.',
    },
    earth: {
      name: 'Earth',
      short: 'Earth',
      description:
        'The Earth forms from the disk of the Solar System. Its age comes from radioactive dating of meteorites and terrestrial lead; its uncertainty is larger than the gap to the previous stop.',
    },
    today: {
      name: 'Today',
      short: 'Today',
      description:
        'The expansion started to accelerate {acceleration} ago, and dark energy has dominated over matter for {darkEnergy}. The region we can observe has the radius shown in the panel; beyond it the universe goes on, perhaps without end.',
    },
  },
  landmarks: {
    momZ14: {
      name: 'MoM-z14',
      description: 'the most distant galaxy confirmed by spectroscopy as of {date}',
    },
    jadesGsZ14: {
      name: 'JADES-GS-z14-0',
      description: 'galaxy confirmed by spectroscopy with the James Webb Space Telescope',
    },
  },
  licences: {
    heading: 'Declared interpretations',
    intro:
      'The values in the panel come from the model and are never adjusted. What follows is interpretation, chosen so that the history can be explored:',
    controlScale: {
      name: 'control scale',
      detail:
        'The control is logarithmic by segments: each stop has a fixed position and, between two stops, time advances logarithmically. {equalShare} of the track is shared equally between segments and the rest follows their true logarithmic length. The ruler under the control shows the true scale.',
    },
    colour: {
      name: 'colour of the light',
      detail:
        'The colour is that of a black body at the model temperature, computed with the colour-matching functions of the CIE standard observer. Above {saturation} kelvin the hue no longer changes: that light is mostly ultraviolet, X-rays or gamma rays, and the screen only shows its visible part. At the Planck and inflation stops the model gives no temperature; the violet says the scene is an interpretation.',
    },
    brightness: {
      name: 'brightness',
      detail:
        'True brightness changes by tens of orders of magnitude; here it follows a logarithmic scale of temperature. The light goes out completely below {draper} K ({celsius} °C), where a black body stops being visible to the eye. Once the universe is transparent, matter is drawn as a very faint grey gas so that the dark ages do not look like an empty screen.',
    },
    haze: {
      name: 'haze',
      detail:
        'Until last scattering, at z = {zStar}, light cannot travel freely and the scene looks like a glowing haze. Afterwards the haze clears; how quickly it clears is a choice.',
    },
    plasma: {
      name: 'plasma',
      detail:
        'Before recombination, primordial plasma is drawn using illustrative three-dimensional turbulence that becomes more agitated at higher temperatures. It does not represent measured individual filaments, but the turbulent regime of the medium.',
    },
    cmbContrast: {
      name: 'microwave background contrast',
      detail:
        'On the sky, temperature fluctuations of the cosmic microwave background are drawn with their characteristic angular scale but with greatly exaggerated contrast so colder and hotter patches are visible to the eye.',
    },
    separation: {
      name: 'separation',
      detail:
        'Between the first instant with model values and today, distances grow about {range} times. On screen, the separation between particles follows the logarithm of that growth, not its value.',
    },
    motion: {
      name: 'motion',
      detail:
        'The camera drifts slowly and continuously through the periodic box while the page is visible, showing depth and parallax across structures. With reduced motion preference, the camera stays fixed.',
    },
    structure: {
      name: 'structure',
      detail:
        'The distribution of matter is computed using the truncated Zel\'dovich approximation from the linear power spectrum normalised with Planck 2018. Particles follow displacements and densities derived from the deformation tensor.',
    },
    density: {
      name: 'number of particles',
      detail:
        'The scene draws {desktop} particles on desktop and {mobile} on mobile. They are not specific atoms, stars or galaxies.',
    },
    peaks: {
      name: 'galaxy lighting',
      detail:
        'Galaxies and clusters light up at linear density peaks when they exceed the spherical collapse threshold. The mass scale is calibrated so that the highest peak begins shining at the first-stars anchor.',
    },
    galaxySize: {
      name: 'galaxy size',
      detail:
        'Galaxies are drawn as small procedural elliptical or spiral shapes whose apparent size and hue evolve with age, making their morphology distinguishable in the cosmic field.',
    },
    camera: {
      name: 'camera',
      detail:
        'The camera is inside a field with no centre and no edge: space repeats in every direction and everything moves away from everything else. There is no point from which the universe explodes.',
    },
    transitions: {
      name: 'steps between instants',
      detail:
        'When the instant changes, the scene takes {duration} to arrive, speeding up and slowing down gently. If the system asks for less motion, the change is instant. The panel always shows the values of the chosen instant, without delay.',
    },
    grading: {
      name: 'grading and post-processing',
      detail:
        'The final image undergoes tone mapping to compress the dynamic range of glowing light, subtle edge vignetting, and fine grain to prevent colour banding across soft gradients.',
    },
    milkyWayPin: {
      name: 'Milky Way location',
      detail:
        'In the periodic cosmic web, a representative spiral galaxy is marked illustratively to spatially contextualise the origin of our galaxy, the Solar System, and the Earth.',
    },
  },
  callout: {
    milkyWay: 'Milky Way',
    milkyWaySub: 'Our galaxy forming',
    solarSystem: 'Solar System',
    solarSystemSub: 'Forming in the Orion Arm',
    earth: 'The Earth',
    earthSub: 'Accretion and planetary formation',
    today: 'Milky Way',
    todaySub: 'Our home in the cosmos',
  },
  scene: {
    unavailable: 'The scene is not available in this browser: it needs WebGL.',
    loadFailed: 'The scene could not be loaded. The panel and the control work as usual; reload the page to try again.',
  },
} satisfies Messages;
