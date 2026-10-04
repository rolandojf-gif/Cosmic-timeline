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
  readonly reheatingName?: string;
  readonly reheatingDescription?: string;
  readonly primordialPlasmaName?: string;
  readonly primordialPlasmaDescription?: string;
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
    sciencePanel: 'Panel científico',
    sciencePanelLabel: 'Abrir o cerrar el panel de datos científicos',
    tierBadges: {
      speculative: 'Frontera teórica',
      extrapolated: 'Física de aceleradores',
      observed: 'Régimen observacional',
    },
  },
  control: {
    label: 'Tiempo cósmico',
    valueText: '{time}, {epoch}',
    stops: 'Paradas',
    rulerCaption: 'Escala real del tiempo, en segundos: una marca por cada factor diez.',
    keyboardHint: 'Flechas: avance fino (con Mayús, más largo). Re Pág y Av Pág: parada siguiente o anterior.',
    play: 'Reproducir',
    pause: 'Pausar',
    reset: 'Reiniciar',
    prevStop: 'Época anterior',
    nextStop: 'Época siguiente',
    autoPause: 'Pausa en hitos',
    autoPauseLabel: 'Pausar automáticamente al alcanzar hitos cósmicos',
    speed: 'Velocidad',
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
    drawerTitle: 'Panel científico',
    pinPanel: 'Fijar panel',
    unpinPanel: 'Desfijar panel',
    closePanel: 'Cerrar panel',
  },
  tier: {
    observed:
      'Valores contrastados con observaciones: abundancias de los elementos ligeros, fondo de microondas y distribución de galaxias.',
    extrapolated:
      'Valores extrapolados: física de partículas probada en aceleradores, aplicada a energías que el universo alcanzó según el modelo.',
    speculative:
      'Ningún modelo confirmado describe este instante. Solo se muestra el tiempo; temperatura, factor de escala, corrimiento al rojo y radios no tienen aquí un valor fiable.',
  } satisfies Record<Tier, string>,
  speculative: {
    badge: 'Frontera de la física teórica',
    badgeSub: 'Estimaciones de modelos no confirmados experimentalmente',
    stateLabel: 'Estado del espacio-tiempo',
    tempLabel: 'Temperatura teórica estimada',
    forcesLabel: 'Fuerzas fundamentales',
    limitLabel: 'Límite del dato experimental',
    planck: {
      state: 'Espuma cuántica: el espacio-tiempo continuo se descompone en fluctuaciones cuánticas a la escala de Planck.',
      temp: 'Aproximadamente {temp}: temperatura límite de Planck, donde la gravedad exige una formulación cuántica.',
      forces: 'Gravedad cuántica unificada: las cuatro fuerzas fundamentales operaban presumiblemente como una sola interacción.',
      limit: 'Ningún experimento puede alcanzar energías de Planck ({energy}). Se carece de una teoría comprobada de gravedad cuántica.',
    },
    inflation: {
      state: 'Vacío cuántico superenfriado en expansión exponencial acelerada impulsada por el campo inflatón.',
      temp: 'Superenfriada: la violenta expansión métrica diluye toda radiación térmica previa, acercando la temperatura al cero absoluto.',
      forces: 'Gravedad desacoplada; interacciones fuerte y electrodébil probablemente unificadas en la escala GUT.',
      limit: 'La escala de energía de la inflación está acotada superiormente por límites en modos B del fondo de microondas, sin detección directa.',
    },
    reheating: {
      state: 'Ignición térmica omnidireccional: el inflatón decae súbitamente y llena el espacio de un plasma incandescente.',
      temp: 'Aproximadamente {temp}: el vacío frío se enciende en el auténtico Big Bang caliente tras el cese de la inflación.',
      forces: 'Fuerza nuclear fuerte y electrodébil en desacoplamiento durante la termalización del plasma.',
      limit: 'La temperatura de recalentamiento depende del modelo específico de inflatón y carece de cota inferior observacional estricta.',
    },
    primordialPlasma: {
      state: 'Sopa térmica relativista: plasma ultradenso de partículas fundamentales sin masa en equilibrio térmico.',
      temp: 'Enfriamiento continuo desde {tempHigh} hasta {tempLow} en la antesala de la escala electrodébil.',
      forces: 'Fuerzas electromagnética y débil unificadas en una única interacción; el campo de Higgs aún no condensa masa.',
      limit: 'Los colisionadores actuales como el LHC exploran energías hasta la escala electrodébil. Por encima no hay datos de laboratorio.',
    },
  },
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
        'Una hipótesis: una expansión acelerada que estira el vacío y diluye cualquier fluctuación previa, enfriando el universo casi hasta el cero absoluto. Las fluctuaciones cuánticas del espacio se estiran a escalas macroscópicas, sembrando las futuras galaxias.',
      reheatingName: 'Recalentamiento: Big Bang caliente',
      reheatingDescription:
        'Al frenar la inflación, el decaimiento del inflatón libera su inmensa energía en un recalentamiento térmico violento: el auténtico Big Bang caliente. El vacío frío se enciende en un plasma incandescente de partículas que inunda todo el cosmos sin centro ni frontera.',
      primordialPlasmaName: 'Plasma primordial',
      primordialPlasmaDescription:
        'Tras la ignición térmica del Big Bang caliente, el cosmos es una densa sopa ultra-relativista de todas las partículas del Modelo Estándar sin masa. A medida que el espacio se expande, el plasma se enfría de forma continua en su camino hacia el cruce electrodébil.',
    },
    quarks: {
      name: 'Plasma de quarks y gluones',
      short: 'Quarks',
      description:
        'Heredero directo del recalentamiento que encendió el Big Bang caliente, este plasma hirviente atraviesa el cruce electrodébil, donde las partículas adquieren masa con el campo de Higgs. Quarks y gluones campan libres a velocidades relativistas junto a leptones y fotones. Es física probada en colisionadores, aplicada a un universo primordial a billones de grados.',
    },
    hadrons: {
      name: 'Época hadrónica',
      short: 'Hadrones',
      description:
        'Al enfriarse por debajo del cruce de la cromodinámica cuántica, los quarks quedan confinados para siempre en protones, neutrones y otros hadrones. La aniquilación casi total de materia y antimateria deja un tenue exceso de materia y apacigua el fluido, volviéndolo más denso y pesado. Hacia el final, los neutrinos se desacoplan y la proporción entre neutrones y protones queda congelada.',
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
    reheating: {
      name: 'Recalentamiento',
      description: 'nacimiento del Big Bang caliente: el decaimiento del inflatón llena todo el espacio de un plasma térmico incandescente',
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
        'El color es el que tendría un cuerpo negro a la temperatura del modelo, calculado con las funciones de color del observador patrón CIE. Por encima de {saturation} kelvin el tono ya no cambia: esa luz es sobre todo ultravioleta, rayos X o gamma, y la pantalla solo muestra su parte visible. En el tramo especulativo, el violeta representa la espuma cuántica y el vacío inflacionario, iluminándose en un blanco incandescente durante el recalentamiento térmico.',
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
    plasma: {
      name: 'plasma',
      detail:
        'El medio temprano evoluciona a través de regímenes físicos ilustrativos: espuma cuántica con microondulaciones en Planck, estrías de estiramiento cuántico en inflación, una llamarada volumétrica incandescente en el recalentamiento térmico del Big Bang caliente, y una turbulencia tridimensional que distingue el plasma continuo de quarks de los glóbulos confinados de hadrones. No representa filamentos individuales medidos, sino los regímenes dinámicos del medio.',
    },
    cmbContrast: {
      name: 'contraste del fondo de microondas',
      detail:
        'En el cielo, las fluctuaciones de temperatura del fondo cósmico de microondas se dibujan con su escala angular característica pero con un contraste muy exagerado para que las zonas más frías y más cálidas sean visibles a simple vista.',
    },
    separation: {
      name: 'separación',
      detail:
        'Entre el primer instante con valores del modelo y hoy las distancias crecen unas {range} veces. En pantalla, la separación entre partículas sigue el logaritmo de ese crecimiento, no su valor.',
    },
    motion: {
      name: 'movimiento',
      detail:
        'La cámara recorre el campo periódico con una deriva lenta y continua mientras la página está visible, mostrando la profundidad y el paralaje de las estructuras. Con preferencia de movimiento reducido, la cámara permanece fija.',
    },
    structure: {
      name: 'estructura',
      detail:
        'La distribución de materia se calcula mediante la aproximación de Zel\'dovich truncada a partir del espectro lineal de potencias normalizado con Planck 2018. Las partículas siguen los desplazamientos y densidades derivados del tensor de deformación.',
    },
    density: {
      name: 'número de partículas',
      detail:
        'La escena dibuja {desktop} partículas en escritorio y {mobile} en móvil. No son átomos, estrellas ni galaxias concretos.',
    },
    peaks: {
      name: 'encendido de galaxias',
      detail:
        'Las galaxias y cúmulos se encienden en los picos de densidad lineal cuando superan el umbral de colapso esférico. La escala de masa se calibra para que el pico más alto comience a brillar en el ancla de las primeras estrellas.',
    },
    galaxySize: {
      name: 'tamaño de las galaxias',
      detail:
        'Las galaxias se representan como pequeñas formas procedimentales elípticas o espirales cuyo tamaño aparente y tono evolucionan con la edad, facilitando distinguir su morfología en el campo cósmico.',
    },
    camera: {
      name: 'cámara',
      detail:
        'La cámara está dentro de un campo sin centro ni borde: el espacio se repite en todas direcciones y todo se aleja de todo. Permite orientar la mirada, desplazarse y variar el campo de visión libremente con el ratón o pantalla táctil, volviendo al encuadre inicial con un doble clic.',
    },
    transitions: {
      name: 'pasos entre instantes',
      detail:
        'Al cambiar de instante la escena tarda {duration} en llegar, acelerando y frenando con suavidad. Si el sistema pide menos movimiento, el cambio es instantáneo. El panel muestra siempre los valores del instante elegido, sin retraso.',
    },
    grading: {
      name: 'etalonaje y postproceso',
      detail:
        'La imagen final pasa por un mapeo de tonos para comprimir el rango dinámico del resplandor, un ligero viñeteado en los bordes y un grano sutil para evitar bandas de color en los degradados suaves.',
    },
    milkyWayPin: {
      name: 'posición de la Vía Láctea',
      detail:
        'En la red cósmica periódica, se señala ilustrativamente una galaxia espiral representativa para contextualizar espacialmente el origen de nuestra galaxia, el Sistema Solar y la Tierra.',
    },
  },
  callout: {
    reheating: 'El Big Bang caliente',
    reheatingSub: 'Recalentamiento: nacimiento del cosmos térmico',
    milkyWay: 'Vía Láctea',
    milkyWaySub: 'Nuestra galaxia en formación',
    solarSystem: 'Sistema Solar',
    solarSystemSub: 'Formación en el brazo de Orión',
    earth: 'La Tierra',
    earthSub: 'Acreción y formación planetaria',
    today: 'Vía Láctea',
    todaySub: 'Nuestro lugar en el cosmos',
  },
  ticker: {
    cosmicTime: 'Tiempo cósmico',
    lookback: 'Hace',
    epoch: 'Época',
    keyData: 'Dato clave',
    items: {
      planck: 'Espuma cuántica del espacio-tiempo a densidades extremas',
      inflation: 'Expansión métrica hiperlumínica que alisa el espacio-tiempo',
      reheating: 'Decaimiento del inflatón: nace el Big Bang caliente térmico',
      primordialPlasma: 'Fuerzas unificadas y partículas elementales sin masa en equilibrio térmico',
      quarks: 'Sopa ultradensa de quarks y gluones en estado de plasma líquido',
      hadrons: 'Descenso térmico por debajo del cruce QCD: confinamiento de protones y neutrones',
      nucleosynthesis: 'Fusión primordial: formación de núcleos de helio, deuterio y litio',
      recombination: 'Los electrones se unen a los núcleos: el universo se vuelve transparente y libera el fondo cósmico',
      darkAges: 'Oscuridad cósmica total antes del encendido de las primeras estrellas',
      firstStars: 'Colapso gravitatorio de nubes primordiales: nace la Población III',
      reionization: 'La radiación ultravioleta de las primeras galaxias ioniza de nuevo el gas intergaláctico',
      milkyWay: 'Ensamblaje del disco galáctico primitivo en el filamento local',
      solarSystem: 'Colapso de una nebulosa molecular rica en metales generados por supernovas',
      earth: 'Acreción planetaria y enfriamiento de la corteza en la zona habitable',
      today: 'Universo dominado por la energía oscura en expansión cósmica acelerada',
    },
  },
  flash: {
    close: 'Cerrar aviso',
    milestone: 'Hito cósmico',
    items: {
      reheating: {
        title: 'El Big Bang caliente',
        detail: 'El decaimiento del inflatón inunda el espacio de radiación térmica. Nace el universo caliente y observable.',
      },
      hadrons: {
        title: 'Confinamiento de quarks',
        detail: 'Al enfriarse el plasma por debajo del cruce QCD, los quarks y gluones quedan atrapados para siempre en protones y neutrones.',
      },
      nucleosynthesis: {
        title: 'Nucleosíntesis primordial',
        detail: 'Los protones y neutrones se fusionan en los primeros núcleos atómicos de helio, deuterio y trazas de litio.',
      },
      recombination: {
        title: 'Recombinación y primera luz',
        detail: 'Los núcleos capturan electrones formando átomos neutros. La niebla se disipa y la primera luz viaja libre como el fondo cósmico.',
      },
      firstStars: {
        title: 'Primeras estrellas',
        detail: 'La gravedad vence la presión térmica en las sobredensidades primordiales. Los primeros soles masivos ponen fin a la edad oscura.',
      },
      milkyWay: {
        title: 'Nacimiento de la Vía Láctea',
        detail: 'La fusión de protogalaxias a lo largo de los filamentos cósmicos da forma al disco primordial de nuestra galaxia.',
      },
      solarSystem: {
        title: 'El Sistema Solar',
        detail: 'Una nube de gas enriquecida por generaciones previas de supernovas colapsa formando el Sol y el disco protoplanetario.',
      },
      earth: {
        title: 'Formación de la Tierra',
        detail: 'Colisiones de planetesimales agregan la Tierra primitiva; se forma el núcleo metálico, la Luna y los primeros océanos.',
      },
      today: {
        title: 'El cosmos actual',
        detail: 'Miles de millones de galaxias se alejan aceleradamente impulsadas por la energía oscura, con la humanidad observando su historia.',
      },
    },
  },
  scene: {
    unavailable: 'La escena no está disponible en este navegador: necesita WebGL.',
    loadFailed: 'No se ha podido cargar la escena. El panel y el control funcionan igual; recarga la página para volver a intentarlo.',
  },
};

export type Messages = typeof es;
