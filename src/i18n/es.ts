// Spanish texts: the source of the message keys. en.ts must match them.
//
// Texts never contain figures. Every number is interpolated from the model or
// from epochs.ts through a {placeholder}, so a text cannot contradict the data.

import type { Evidence, EpochId } from '../timeline';
import type { Tier } from '../physics';

export interface EpochText {
  /** Full name, shown as the panel heading. */
  readonly name: string;
  /** Short label for the list of stops. */
  readonly short: string;
  readonly description: string;
}

export interface LandmarkText {
  readonly name: string;
  readonly description: string;
}

/** Plural forms selected with Intl.PluralRules. */
export interface Plural {
  readonly one: string;
  readonly other: string;
}

export const es = {
  meta: {
    title: 'Cosmic Timeline',
    subtitle: 'La historia del universo, de la época de Planck a hoy',
    description:
      'Recorrido interactivo por la historia del universo con los valores físicos de cada instante, calculados con el modelo cosmológico de Planck 2018.',
    switchLanguage: 'English',
    switchLanguageLabel: 'Ver en inglés',
  },
  control: {
    label: 'Tiempo cósmico',
    valueText: '{time}, {epoch}',
    stops: 'Paradas',
    rulerCaption: 'Escala real del tiempo, en segundos: una marca por cada factor diez.',
    keyboardHint: 'Flechas: avance fino (con Mayús, más largo). Re Pág y Av Pág: parada siguiente o anterior.',
  },
  panel: {
    time: 'Tiempo cósmico',
    lookback: 'Hace',
    human: 'Así era el universo',
    temperatureLabel: 'Temperatura',
    temperatureHot: '{degrees} grados, {ratio} veces la temperatura {reference}',
    sunCore: 'del centro del Sol',
    sunSurface: 'de la superficie del Sol',
    temperatureCelsius: '{celsius} °C',
    temperatureCold: '{celsius} °C, a {kelvin} grados del cero absoluto',
    distancesLabel: 'Distancias',
    distances: 'Todo estaba {factor} veces más cerca que hoy.',
    observedRegion: 'Radio de la región que hoy observamos',
    regionNear: '{km} km, unas {ratio} veces la distancia de la Tierra al Sol',
    expansionLabel: 'Expansión',
    expansion: 'Al ritmo de ese instante, las distancias se duplicarían en {time}.',
    lightLabel: 'Luz',
    lightOpaque: 'El universo es opaco: ninguna luz de este momento puede llegarnos.',
    lightStretched: 'La luz que sale de aquí nos llega hoy estirada {factor} veces.',
    technical: 'Datos técnicos',
    temperature: 'Temperatura de la radiación',
    thermalEnergy: 'Energía térmica típica de una partícula: kT = {energy}.',
    redshift: 'Corrimiento al rojo z',
    redshiftMeaning: 'La luz llega estirada 1 + z = {factor} veces.',
    scaleFactor: 'Factor de escala a',
    scaleFactorMeaning: 'Las distancias eran 1/a = {factor} veces menores que hoy.',
    hubble: 'Parámetro de Hubble H',
    hubbleMeaning: 'Tiempo en que se duplicarían las distancias, ln 2 / H: {time}.',
    hubbleRadius: 'Radio de Hubble c/H',
    hubbleRadiusMeaning: 'Distancia a la que la expansión aleja las cosas a la velocidad de la luz.',
    observedRegionMeaning: 'El radio de hoy, {today}, multiplicado por a.',
    model: 'Modelo ΛCDM plano con los parámetros de Planck 2018 y los grados de libertad del Modelo Estándar.',
    interval: 'Intervalo: de {start} a {end}',
    illustrative:
      'Ancla ilustrativa: el control se detiene en un instante elegido dentro de un intervalo, no en un suceso definido.',
    evidence: 'Lo que ocurre en esta época',
    landmarks: 'Observado en esta época',
    landmark: '{name} (z = {z}, t = {time}): {description}.',
    sources: 'Fuentes',
    modelSources: 'Fuentes del modelo',
    comparisonSources: 'Fuentes de las comparaciones',
  },
  tier: {
    observed:
      'Valores contrastados con observaciones: abundancias de los elementos ligeros, fondo de microondas y distribución de galaxias.',
    extrapolated:
      'Valores extrapolados: física de partículas probada en aceleradores, aplicada a energías que el universo alcanzó según el modelo.',
    speculative:
      'Ningún modelo confirmado describe este instante. Solo se muestra el tiempo; temperatura, factor de escala, corrimiento al rojo y radios no tienen aquí un valor fiable.',
  } satisfies Record<Tier, string>,
  evidence: {
    observed: 'observado',
    'established-physics': 'física establecida, sin observación directa',
    'model-dependent': 'dependiente de modelos, sin observación directa',
    speculative: 'especulativo',
  } satisfies Record<Evidence, string>,
  units: {
    picoseconds: { one: '{value} picosegundo', other: '{value} picosegundos' },
    nanoseconds: { one: '{value} nanosegundo', other: '{value} nanosegundos' },
    microseconds: { one: '{value} microsegundo', other: '{value} microsegundos' },
    milliseconds: { one: '{value} milisegundo', other: '{value} milisegundos' },
    countMillion: { one: '{value} millón de', other: '{value} millones de' },
    countBillion: { one: '{value} mil millones de', other: '{value} mil millones de' },
    countTrillion: { one: '{value} billón de', other: '{value} billones de' },
    countQuadrillion: { one: '{value} mil billones de', other: '{value} mil billones de' },
    seconds: '{value} s',
    minutes: '{value} min',
    hours: '{value} h',
    days: { one: '{value} día', other: '{value} días' },
    years: { one: '{value} año', other: '{value} años' },
    millionYears: { one: '{value} millón de años', other: '{value} millones de años' },
    billionYears: { one: '{value} mil millones de años', other: '{value} mil millones de años' },
    millimeters: '{value} mm',
    meters: '{value} m',
    kilometers: '{value} km',
    astronomicalUnits: '{value} ua',
    lightYears: { one: '{value} año luz', other: '{value} años luz' },
    millionLightYears: { one: '{value} millón de años luz', other: '{value} millones de años luz' },
    billionLightYears: { one: '{value} mil millones de años luz', other: '{value} mil millones de años luz' },
    kelvin: '{value} K',
    electronVolts: '{value} {prefix}eV',
    hubble: '{value} km s⁻¹ Mpc⁻¹',
  } satisfies Record<string, string | Plural>,
  epochs: {
    planck: {
      name: 'Época de Planck',
      short: 'Planck',
      description:
        'Aquí la gravedad necesitaría una teoría cuántica que todavía no existe. Ninguna teoría confirmada describe este instante: el control empieza en el tiempo de Planck porque ahí dejan de valer las conocidas, no porque ahí empiece algo. El tiempo se cuenta desde el inicio extrapolado de la expansión, que no es un suceso observado.',
    },
    inflation: {
      name: 'Inflación',
      short: 'Inflación',
      description:
        'Una hipótesis: una expansión acelerada y muy breve que explicaría por qué el universo es tan homogéneo y plano y de dónde salen las semillas de las galaxias. Las medidas del fondo de microondas son compatibles con ella y descartan muchos de sus modelos, pero no fijan cuándo ocurrió ni a qué energía.',
    },
    quarks: {
      name: 'Plasma de quarks y gluones',
      short: 'Quarks',
      description:
        'Tras el cruce electrodébil, las partículas adquieren masa a través del campo de Higgs. Los quarks y los gluones no están confinados: forman un plasma junto a leptones y fotones. Es física probada en aceleradores, aplicada a un universo que nadie ha observado a esta temperatura.',
    },
    hadrons: {
      name: 'Época hadrónica',
      short: 'Hadrones',
      description:
        'Por debajo del cruce de la cromodinámica cuántica, los quarks quedan confinados en protones, neutrones y otros hadrones. Casi todos los hadrones y antihadrones se aniquilan y queda un pequeño exceso de materia. Hacia el final, los neutrinos se desacoplan y la proporción entre neutrones y protones queda casi congelada.',
    },
    nucleosynthesis: {
      name: 'Nucleosíntesis primordial',
      short: 'Nucleosíntesis',
      description:
        'Cuando los fotones dejan de romper el deuterio, protones y neutrones se unen en núcleos de deuterio, helio y algo de litio. Las abundancias que salen de estos minutos se miden hoy en gas muy antiguo y coinciden con la predicción, salvo una discrepancia conocida en el litio.',
    },
    recombination: {
      name: 'Recombinación',
      short: 'Recombinación',
      description:
        'Electrones y núcleos se unen en átomos neutros y la luz deja de chocar con ellos. Esa luz, estirada desde entonces por la expansión, es el fondo cósmico de microondas: la imagen más antigua del universo que podemos observar.',
    },
    darkAges: {
      name: 'Edad oscura',
      short: 'Edad oscura',
      description:
        'El gas es hidrógeno y helio neutros y aún no hay estrellas. La materia oscura y el gas se agrupan poco a poco alrededor de las pequeñas irregularidades que se ven en el fondo de microondas. No hay observación directa de esta época; la línea de radio del hidrógeno neutro podría darla.',
    },
    firstStars: {
      name: 'Primeras estrellas',
      short: 'Primeras estrellas',
      description:
        'Según las simulaciones, las primeras estrellas se forman en pequeños halos de materia oscura, a partir de hidrógeno y helio sin elementos más pesados, y probablemente eran muy masivas y de vida corta. Aún no se han observado.',
    },
    reionization: {
      name: 'Reionización',
      short: 'Reionización',
      description:
        'La luz ultravioleta de las primeras galaxias vuelve a arrancar los electrones del hidrógeno, y el gas entre galaxias deja de absorber esa luz. El ancla es el punto medio que mide Planck; los espectros de cuásares lejanos fechan el final.',
    },
    milkyWay: {
      name: 'Vía Láctea',
      short: 'Vía Láctea',
      description:
        'Empieza a formarse el disco grueso de nuestra galaxia, antes de que termine la reionización: las épocas se solapan. La fecha sale de edades de estrellas subgigantes medidas una a una, y su incertidumbre es mucho mayor que la de las épocas cosmológicas.',
    },
    solarSystem: {
      name: 'Sistema Solar',
      short: 'Sistema Solar',
      description:
        'Se condensan los primeros sólidos del disco que rodea al Sol joven. Su edad, medida con relojes radiactivos de plomo en meteoritos, es una de las fechas más precisas de esta historia.',
    },
    earth: {
      name: 'Tierra',
      short: 'Tierra',
      description:
        'La Tierra se forma a partir del disco del Sistema Solar. Su edad sale de la datación radiactiva de meteoritos y del plomo terrestre; su incertidumbre es mayor que la separación con la parada anterior.',
    },
    today: {
      name: 'Hoy',
      short: 'Hoy',
      description:
        'La expansión empezó a acelerarse hace {acceleration}, y la energía oscura domina sobre la materia desde hace {darkEnergy}. La región que podemos observar tiene el radio que muestra el panel; fuera de ella el universo continúa, quizá sin fin.',
    },
  } satisfies Record<EpochId, EpochText>,
  landmarks: {
    momZ14: {
      name: 'MoM-z14',
      description: 'la galaxia más lejana confirmada por espectroscopia a fecha de {date}',
    },
    jadesGsZ14: {
      name: 'JADES-GS-z14-0',
      description: 'galaxia confirmada por espectroscopia con el telescopio espacial James Webb',
    },
  } satisfies Record<string, LandmarkText>,
  licences: {
    heading: 'Interpretaciones declaradas',
    intro:
      'Los valores del panel salen del modelo y no se ajustan. Lo que sigue es interpretación, elegida para que la historia se pueda recorrer:',
    controlScale: {
      name: 'escala del control',
      detail:
        'El control es logarítmico por tramos: cada parada tiene una posición fija y, entre dos paradas, el tiempo avanza de forma logarítmica. El {equalShare} del recorrido se reparte a partes iguales entre los tramos y el resto sigue su duración logarítmica real. La regla bajo el control muestra la escala real.',
    },
    colour: {
      name: 'color de la luz',
      detail:
        'El color es el que tendría un cuerpo negro a la temperatura del modelo, calculado con las funciones de color del observador patrón CIE. Por encima de {saturation} kelvin el tono ya no cambia: esa luz es sobre todo ultravioleta, rayos X o gamma, y la pantalla solo muestra su parte visible. En Planck e inflación no hay temperatura del modelo; el violeta indica que la escena es una interpretación.',
    },
    brightness: {
      name: 'brillo',
      detail:
        'El brillo real cambia en decenas de órdenes de magnitud; aquí sigue una escala logarítmica de la temperatura. La luz se apaga del todo por debajo de {draper} K ({celsius} °C), donde un cuerpo negro deja de verse a simple vista. Desde que el universo se vuelve transparente, la materia se dibuja como un gas gris muy tenue para que la edad oscura no parezca una pantalla vacía.',
    },
    haze: {
      name: 'bruma',
      detail:
        'Hasta la última dispersión, a z = {zStar}, la luz no viaja libre y la escena se ve como una bruma luminosa. Después la bruma se despeja; la rapidez con que lo hace es una elección.',
    },
    separation: {
      name: 'separación',
      detail:
        'Entre el primer instante con valores del modelo y hoy las distancias crecen unas {range} veces. En pantalla, la separación entre partículas sigue el logaritmo de ese crecimiento, no su valor.',
    },
    motion: {
      name: 'movimiento',
      detail:
        'La escena está quieta salvo al cambiar de instante. Tras cada paso, las partículas siguen separándose durante {drift}, más deprisa cuanto mayor es H·t: cuánto crecen las distancias por unidad de edad del universo.',
    },
    structure: {
      name: 'estructura',
      detail:
        'Desde las primeras estrellas la materia se agrupa en filamentos y nudos, y aparecen estrellas y galaxias. El dibujo es ilustrativo, no un mapa de objetos reales; cuánto ha avanzado sigue el logaritmo del tiempo transcurrido desde las primeras estrellas.',
    },
    density: {
      name: 'número de partículas',
      detail:
        'La escena dibuja {desktop} partículas en escritorio y {mobile} en móvil. No son átomos, estrellas ni galaxias concretos.',
    },
    camera: {
      name: 'cámara',
      detail:
        'La cámara está dentro de un campo sin centro ni borde: el espacio se repite en todas direcciones y todo se aleja de todo. No hay un punto desde el que el universo explote.',
    },
    transitions: {
      name: 'pasos entre instantes',
      detail:
        'Al cambiar de instante la escena tarda {duration} en llegar, acelerando y frenando con suavidad. Si el sistema pide menos movimiento, el cambio es instantáneo. El panel muestra siempre los valores del instante elegido, sin retraso.',
    },
  },
  scene: {
    unavailable: 'La escena no está disponible en este navegador: necesita WebGL.',
  },
};

export type Messages = typeof es;
