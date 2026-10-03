# Relevo: estado de feat/scene (PR 4)

Documento de traspaso para el agente que continúe la PR 4. Fecha: 2026-10-03. Léelo después de [`CLAUDE.md`](../CLAUDE.md), cuyas reglas siguen mandando. El plan general está en [`plan.md`](plan.md), las fuentes en [`fuentes.md`](fuentes.md) y las licencias en [`licencias-visuales.md`](licencias-visuales.md).

## 1. Dónde está la rama

La PR #4 (`feat/scene` → `main`) está abierta y **no se fusiona**: la fusiona Rolando cuando la apruebe. Las PR 1–3 (física, épocas y control, interfaz) ya están en `main`.

| Commit | Qué es | Estado |
|---|---|---|
| `e62fce6` | Color de cuerpo negro (`src/scene/blackbody.ts`) con sus fuentes y tests | Integrado. Se conserva. |
| `bf01a4a` | Primera escena: un `THREE.Points` de 30 000 partículas con licencias declaradas | Reemplazado por la escena de 5 regímenes. |
| `dab0b31` | Si el fragmento de la escena no carga, el panel sigue funcionando con un aviso (`scene.loadFailed`) | Integrado. Se conserva. |
| `17afe06` | Prototipo del rediseño (`prototype.html`, `src/prototype/`, `growth.ts`, `cosmicWeb.ts`, `fft.ts`, `noise3d.ts`) | Base del rediseño; integrado en producción y limpiado. |
| este commit | Integración de la escena de 5 regímenes con worker, shaders y licencias | Integrado en producción con verificación completa. |

Situación de cada pieza:

- **En producción**: `scene.ts`, `sceneShaders.ts`, `cosmicWeb.worker.ts`, `cosmicWebLoader.ts`, `visualMap.ts` con 15 licencias, `blackbody.ts`, `tween.ts`, `growth.ts`, `fft.ts`, `cosmicWeb.ts`, `noise3d.ts`.
- **Tests**: 189 tests pasando en 23 suites con `npm run verify`.
- **Prototipo**: Retirado limpiamente tras verificar la producción.

## 2. Decisiones tomadas en esta PR

1. **Primera versión rechazada (2026-10-03).** Rolando vio el preview y pidió un rediseño visual completo en la misma rama, sin merge. Sus motivos:
   - los quarks parecían nieve dispersa sobre lavanda, no una bruma opaca;
   - la Vía Láctea era un cielo estrellado genérico, no filamentos y galaxias;
   - las épocas solo se distinguían por el color de fondo.
2. **Listón y presupuesto.**
   - **Calidad:** de visualización científica profesional (ESA, NASA, IllustrisTNG).
   - **Escritorio:** prioridad absoluta, con 60 fps en un portátil medio con GPU integrada. Se permite postproceso (bloom, tone mapping HDR, grano sutil), cientos de miles de partículas y shaders complejos.
   - **Móvil:** basta con que funcione, en una versión reducida.
3. **Criterio de aceptación.** Viendo una captura sin texto de cada parada, alguien debe poder distinguir las épocas y ordenarlas.
4. **Rediseño por regímenes.** Hay cinco regímenes visuales; la técnica de cada uno está en §3.
5. **Prototipo aprobado (2026-10-03).** Las cinco capturas cumplen el criterio. Rolando dijo de *hoy* y de *recombinación* que «son exactamente lo que buscaba». Las capturas están en `/mnt/project-files/scene-pr4-v2/` y la ficha completa, con técnica y desglose de dato y licencia, en el artifact «Prototipo de la escena cósmica».
6. **Ajuste pendiente en nucleosíntesis.** Hoy se lee azul oscuro, y el azul transmite «frío» y rompe la narrativa de enfriamiento (blanco → amarillo → naranja). Rolando pide mantener el color de cuerpo negro y que, al bajar el brillo, siga leyéndose como un blanco incandescente más calmado, no como azul profundo. Si no se puede hacer sin falsear el dato, hay que explicárselo y decide él. Análisis en §3.1.
7. **Sistema Solar y Tierra se ven iguales** (decisión de Rolando, 2026-10-03). Entre las dos paradas pasan unos 27 millones de años (0,2 % de la edad) y D apenas cambia, así que con datos reales sus capturas son idénticas. Los distingue el panel, y se documenta como límite del dato. No se inventa ninguna licencia para separarlas.
8. **Reionización frente a Vía Láctea.** Propuesta presentada y no rechazada: distinguirlas con burbujas de gas ionizado según la historia tanh de Planck (50 % ionizado en la parada de reionización, ~98 % en la de la Vía Láctea). Es un dato del modelo, no una licencia, pero falta implementarlo y verificar la fuente.
9. **Transiciones.** El paso entre paradas dura de 1,5 a 2 s con ease-in-out (hoy `TRANSITION_SECONDS = 1.75` en `visualMap.ts`) y debe sentirse pausado. Con `prefers-reduced-motion` el cambio es instantáneo.
10. **Cámara.** La revisión pide una deriva muy lenta y continua mientras la página está visible, con profundidad y paralaje, siempre dentro del campo y sin centro ni borde. Esto **sustituye** a la decisión anterior de que la escena estuviera quieta salvo al cambiar de instante.
11. **Se mantienen los principios.**
    - El panel muestra datos reales.
    - Toda licencia nueva se registra en `VISUAL_LICENCES` y tiene sus textos en i18n y su entrada en `licencias-visuales.md`.
    - Nunca se muestra una explosión vista desde fuera.
    - En la UI nunca se dice «tamaño del universo».

## 3. Técnica de cada régimen (prototipo aprobado)

Todo está en `src/prototype/main.ts`. Pila de render (three.js r186):

- `WebGLRenderer` con tone mapping ACES;
- `EffectComposer` con buffers HalfFloat, en este orden: `RenderPass` → `UnrealBloomPass` → `OutputPass` → pase propio de etalonaje (viñeta, grano de 0,02 y saturación × 1,2).

El fondo es un triángulo a pantalla completa con `ShaderMaterial` GLSL3. La materia son `Points` aditivos.

**Estado visual.** Al integrarlo, todo esto pasa a `visualMap.ts`:

- Opacidad: haze = 1 − e^(−τ), con τ = ((1+z)/(1+z*))¹² y z* = 1089,8. τ = 1 en z* es la definición de Planck; el exponente 12 es licencia.
- Brillo: intensidad = visible·(0,3 + 0,025·log₁₀(T/3000)), donde `visible` apaga la luz entre 2970 K y el punto de Draper. El brillo real crece como T⁴: esto es licencia.
- Turbulencia = (log₁₀T − 3,4)/12, recortada a [0, 1].
- D(a) sale de `growth.ts`. Contraste del gas = 1 + 7·(1 − smoothstep((D − 0,05)/0,25)).

### 3.1 Plasma opaco (quarks → recombinación)

**Técnica.** Raymarching de 28 pasos con paso creciente sobre una textura 3D de ruido de 64³ (`noise3d.ts`):

- distorsión de dominio y ruido con crestas: filamentos más finos, más contorsionados y más rápidos cuanto más caliente;
- emisión y absorción acumuladas en HDR;
- lo que queda del rayo ve más del mismo brillo, así que nunca hay borde ni fondo.

**Dato.** El color es `blackbodySrgb(T)` con T recortada a [punto de Draper, 10⁶ K]. La opacidad sale de τ.

**Licencia.**
- La turbulencia: el plasma real es uniforme hasta una parte en 10⁵.
- La escala logarítmica del brillo.
- La rampa de emisión: las zonas densas tiran hacia blanco y las vacías caen a 0,3 × el color.

**Nucleosíntesis: análisis del ajuste pedido (todavía sin hacer).**
- **El tono es un dato y es el mismo que en los quarks.** Por encima de unos 10⁵ K el cuerpo negro está en el límite de Rayleigh-Jeans: en sRGB, (0,584; 0,694; 1,000) a 10⁶ K, frente a (1,000; 0,976; 0,997) a 6500 K. Es un blanco azulado.
- **Los quarks se leen blancos solo porque son cegadores:** ACES y el bloom desaturan las altas luces.
- **El azul profundo de la nucleosíntesis viene de licencias, no del dato:**
  1. el brillo, menor;
  2. los valles de la rampa de emisión (0,3 × el color), que a baja luminancia dan azul oscuro;
  3. la saturación × 1,2 del etalonaje, que se aleja del dato.
- **Plan propuesto, que no falsea nada:**
  - saturación 1,0 en el régimen de plasma;
  - subir el suelo de luminancia de la nucleosíntesis y aplanar sus valles, con menos contraste de densidad (es «más calmado»), de modo que la parada siga más baja que los quarks pero en altas luces;
  - comprobarlo con una captura.
- **Si aun así se lee azul, la única palanca que queda es el punto blanco**, una adaptación cromática declarada como licencia. Cambiaría el tono mostrado en *todas* las épocas (las bajas temperaturas se verían más rojas), así que eso se le plantea a Rolando antes de hacerlo.

### 3.2 Recombinación: la transición cumbre

**Técnica.** El mismo volumen en calma (`calm` → 1 cuando la turbulencia → 0). Al bajar la opacidad (`emerge = 1 − haze²`), el volumen muestra parches calientes y fríos (`cmbPatch`) y detrás aparece un cielo de fondo de microondas:
- ruido sobre la dirección con escala de ~1°, la del primer pico acústico (ℓ ≈ 220);
- colores de cuerpo negro a T·1,3 (caliente) y T·0,75 (frío).

Hay una tira de la transición en la ficha (f = 0,9 / 1,0 / 1,15 del tiempo de la parada).

**Dato.** z* y τ, y el naranja del cuerpo negro a 2970 K. La luz se apaga en el punto de Draper, hacia 3,15 millones de años.

**Licencia.**
- El contraste está exagerado unas 10⁴ veces (real ~10⁻⁵).
- El patrón es ruido ilustrativo, no el mapa de Planck: ese mapa es el cielo visto desde aquí, no desde dentro.
- La rapidez del despeje.

### 3.3 Edad oscura

Aún no está prototipada. Será casi negra, con el gas tenue de la red en su D (contraste aún bajo) y las fluctuaciones creciendo de forma apenas perceptible. Debe distinguirse de recombinación (sin brillo) y de primeras estrellas (sin destellos).

### 3.4 Red cósmica (primeras estrellas → hoy)

**Técnica.**
- **Campo gaussiano** (`cosmicWeb.ts`): 128³ celdas en una caja periódica de 200 Mpc/h, con semilla 11.
  - P(k) ∝ kⁿˢ·T(k)², donde T(k) es la función de transferencia sin oscilaciones de Eisenstein y Hu 1998.
  - Normalizado a σ₈ por la varianza esperada con filtro esférico de 8 Mpc/h en la rejilla.
- **Zel'dovich truncado** (suavizado gaussiano de 2,5 Mpc/h): x = q + D·ψ, con ψ_k = i k δ_k/k².
- **Densidad**: la de cada partícula se calcula en la GPU como 1/Π(1 − Dλᵢ), con los autovalores del tensor de deformación.
- **Partículas**: 2,1 millones, con atributos Int16 normalizados y posición de rejilla por `gl_VertexID` con desplazamiento aleatorio por hash (sin él aparece moiré). Se dibujan con:
  - una capa fina;
  - una capa de halo (1 de cada 8 partículas, × 5 de tamaño) para que los filamentos se lean continuos.
  - El tamaño conserva el flujo.
- **Galaxias** (sprites procedimentales): un pico se enciende cuando D·δ·B ≥ 1,686.
  - B se fija para que el pico nº 1500 se encienda en la parada de primeras estrellas (`?fs=`).
  - Cada galaxia aparece primero como destello azul y después como espiral o elíptica; enrojece con la edad.
  - Hay cúmulos de unas 70 galaxias en los 12 picos mayores y grupos de 14 en los 60 siguientes.
- **Cámara**: dentro de la caja periódica, cerca del pico mayor; el desvanecimiento antes de media caja oculta el borde.

**Dato.**
- D(a).
- P(k) con los parámetros de Planck 2018.
- La forma y posición de filamentos, nudos y vacíos.
- δc = 1,686, el umbral de colapso esférico lineal.

**Licencia.**
- El contraste del gas × 8 al principio.
- El encendido en los 1500 picos mayores: los halos reales son demasiado pequeños para la rejilla.
- Las galaxias se dibujan unas 30 veces mayores de lo real.
- Formas, colores, número de galaxias por cúmulo, y el brillo del gas que baja con la estructura.

### 3.5 Cámara

Aún no está implementada: deriva lenta continua con paralaje (§2, punto 10). Se pausa con la página oculta y con `prefers-reduced-motion`.

## 4. Fuentes pendientes de verificar

En el prototipo estos valores están puestos de memoria. Antes de integrarlos hay que cotejarlos con la fuente y añadirlos a `fuentes.md` con DOI o arXiv. Si uno no se puede verificar, no se añade: se pregunta a Rolando.

- Eisenstein y Hu 1998, ApJ 496, 605: función de transferencia sin oscilaciones.
- Planck 2018 VI: nˢ = 0,9665, σ₈ = 0,8102 y Ωbh² = 0,02242. Comprobar que corresponden a TT,TE,EE+lowE+lensing+BAO, como el resto de `params.ts`; en ese caso deben vivir en `params.ts`, no en el prototipo.
- Zel'dovich 1970, A&A 5, 84: aproximación de Zel'dovich.
- Coles, Melott y Shandarin 1993, MNRAS 260, 765: aproximación truncada.
- Heath 1977, MNRAS 179, 351: integral de D(a).
- Posición del primer pico acústico, ℓ ≈ 220: Planck 2018.
- Historia de reionización tanh de Planck 2018, si se implementan las burbujas.
- δc = 1,686 (colapso esférico): en un texto de referencia (por ejemplo Gunn y Gott 1972, o Peebles 1980).

En el entorno cloud el proxy bloquea `curl` a Crossref, arXiv, etc.: se usa WebFetch, y cada lectura pide permiso a Rolando.

## 5. Estado de la integración (Completada)

Todos los pasos del plan de integración se han completado y verificado en `feat/scene`:

1. **Ajuste de nucleosíntesis**: Rolando prefirió conservar el aspecto original de la captura del prototipo (azul profundo incandescente con contraste de filamentos), por lo que se mantuvo el renderizado original aprobado.
2. **Física y tests**:
   - Parámetros cosmológicos $\Omega_b h^2 = 0{,}02242$, $n_s = 0{,}9665$ y $\sigma_8 = 0{,}8102$ incorporados a `src/physics/params.ts` desde Planck 2018 Tabla 2 (TT,TE,EE+lowE+lensing+BAO), y documentados en `docs/fuentes.md` con las referencias de Heath (1977), Eisenstein & Hu (1998), Zel'dovich (1970) y Coles et al. (1993).
   - Cobertura completa de tests unitarios: `growth.test.ts` (10 tests), `fft.test.ts` (5 tests), `noise3d.test.ts` (5 tests), `cosmicWeb.test.ts` (10 tests) y `cosmicWebLoader.test.ts` (1 test).
3. **Web Worker para el campo**: Implementado en `src/scene/cosmicWeb.worker.ts` con transferencia de memoria sin copia de los `ArrayBuffer` de desplazamientos, autovalores y densidades. Cargador asíncrono con fallback síncrono en `src/scene/cosmicWebLoader.ts`.
4. **Escena nueva en `src/scene/`**:
   - Fondo a pantalla completa con raymarching volumétrico de plasma GLSL3 y cielo de microondas continuo sobre textura 3D de ruido de $64^3$.
   - Capa de materia con partículas de Zel'dovich (capa fina + halo al $1/8$) y galaxias procedimentales (espirales y elípticas) en picos de sobredensidad.
   - Pila de postprocesado con `ACESFilmicToneMapping`, `UnrealBloomPass` adaptado a la opacidad y pase de etalonaje (viñeta, grano $0{,}02$, contraste).
   - Deriva lenta continua de cámara con profundidad y paralaje mientras la página está visible (pausada al ocultar la pestaña o con `prefers-reduced-motion`).
   - Ficheros obsoletos `field.ts`, `shaders.ts` y `field.test.ts` eliminados.
5. **Licencias visuales**: 15 licencias registradas en `VISUAL_LICENCES`, documentadas en `docs/licencias-visuales.md` y con textos bilingües ES/EN en `src/i18n/` (incorporadas `plasma`, `cmbContrast`, `peaks`, `galaxySize` y `grading`; actualizadas `density`, `structure`, `separation` y `motion`).
6. **Paradas especulativas y edad oscura**: Comprobadas visualmente; Planck e inflación se muestran como un velo violeta abstracto sin parámetros físicos del modelo, y la edad oscura muestra un tenue gas frío sin estrellas.
7. **Perfil móvil**: Rejilla reducida a $64^3$ (262 144 partículas), sin pase de bloom y DPR limitado a 1,5.
8. **Contador de desarrollo**: Monitor de fps y tiempo de cuadro en `src/scene/scene.ts`, activable con `?fps` en la URL o pulsando la tecla `f`.
9. **Limpieza del prototipo**: Eliminados `prototype.html`, `src/prototype/` y `scripts/capture-prototype.mjs`; añadido `scripts/capture-scene.mjs` para capturar la aplicación en producción.
10. **Métricas finales de verificación**:
    - `npm run verify` pasa al 100 % (189 tests en 23 suites, typecheck estricto).
    - Cero errores en consola en el navegador.
11. **Reproductor y etiquetas interactivas en escena**:
    - Controles de reproducción en la barra de tiempo: reinicio (⏮), reproducción (▶), pausa (⏸) y selector de velocidad (1×, 2×, 4×).
    - Ritmo cinemático adaptado: avance ágil (2×, ~17 s a 1×) a lo largo de toda la niebla uniforme temprana (de Planck a nucleosíntesis y enfriamiento de plasma previo a recombinación hasta $u = 0{,}58$), frenado suave en 2 s justo al entrar el resplandor de recombinación ($u = 0{,}62$), ritmo pausado y majestuoso en recombinación y edad oscura (0,38×, ~13 s) y ritmo contemplativo en formación de estrellas, red cósmica y galaxias (0,50×, ~36 s).
    - Sincronización directa en reproducción continua: `scene.show(u, isPlaying)` pasa a modo directo inmediato durante el playLoop, eliminando el retraso de 1,75 s del tween Hermite y previniendo oscilaciones o inversiones espurias de velocidad en el crecimiento de estructuras ($D(a)$).
    - Al pulsar cualquier parada en la regla o la tarjeta flotante 3D, el cabezal avanza en secuencia estricta hacia adelante (Vía Láctea → Sistema Solar → Tierra → Hoy; y en Hoy reinicia desde la Vía Láctea) y reanuda la reproducción sin saltar hacia atrás.
    - Marcador y tarjeta 3D en capa superior flotante `.callout-layer` (z-index 25 con pointer-events), garantizando la interactividad directa de clic y efecto hover, con licencia declarada `milkyWayPin`.
    - Bloque de datos técnicos desplegado por defecto (`<details open>`) para que toda la información quede visible de inmediato sin ocultarse.

## 6. Forma de trabajo

- **Ramas.** Una rama por tarea. La v1 va en PRs secuenciales a `main`, y esta es la PR 4 (`feat/scene`).
- **PRs.** No se fusiona ninguna. Las fusiona Rolando.
- **Verificación.** `npm run verify` (typecheck + tests + build) debe pasar antes de cada commit; es el gate de Netlify.
- **Tests.** Los cambios en `physics/` o `timeline/` llevan test. Nunca se amplía una tolerancia ni se cambia un valor esperado sin explicar en el commit por qué y con qué fuente.
- **Decisiones visuales.** Se proponen con capturas y se espera la aprobación de Rolando antes de implementarlas. Ante una ambigüedad se le pregunta en vez de suponer.
- **Comunicación.** Rolando escribe en español; código y comentarios en inglés; documentación de usuario en español e inglés.
- **Público.** No es especialista, y Rolando tampoco lo es en cosmología: las explicaciones al usuario van en lenguaje claro.
