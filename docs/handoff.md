# Relevo: estado de feat/scene (PR 4)

Documento de traspaso para el agente que continúe la PR 4. Fecha: 2026-10-03. Léelo después de [`CLAUDE.md`](../CLAUDE.md), cuyas reglas siguen mandando. El plan general está en [`plan.md`](plan.md), las fuentes en [`fuentes.md`](fuentes.md) y las licencias en [`licencias-visuales.md`](licencias-visuales.md).

## 1. Dónde está la rama

La PR #4 (`feat/scene` → `main`) está abierta y **no se fusiona**: la fusiona Rolando cuando la apruebe. Las PR 1–3 (física, épocas y control, interfaz) ya están en `main`.

| Commit | Qué es | Estado |
|---|---|---|
| `e62fce6` | Color de cuerpo negro (`src/scene/blackbody.ts`) con sus fuentes y tests | Integrado. Se conserva. |
| `bf01a4a` | Primera escena: un `THREE.Points` de 30 000 partículas con licencias declaradas | Integrado, pero **rechazado visualmente**: hay que sustituirlo (§2). |
| `dab0b31` | Si el fragmento de la escena no carga, el panel sigue funcionando con un aviso (`scene.loadFailed`) | Integrado. Se conserva. |
| `17afe06` | Prototipo del rediseño (`prototype.html`, `src/prototype/`, `growth.ts`, `cosmicWeb.ts`, `fft.ts`, `noise3d.ts`) | **Prototipo aprobado, sin integrar**. Sin tests. |
| este commit | `docs/handoff.md`, `AGENTS.md`, `scripts/capture-prototype.mjs` | Documentación del relevo. |

Situación de cada pieza:

- **Hecho y en uso por la app**: `blackbody.ts`, `tween.ts` (paso con curva de Hermite que se puede redirigir a mitad), `visualMap.ts` con diez licencias, la carga diferida de three.js y el aviso sin WebGL. `npm run verify` pasa con 163 tests.
- **Prototipo, fuera de la app**: `prototype.html` (raíz) y `src/prototype/main.ts` dibujan un solo instante (`?stop=<id de época>` o `?t=<s>`) para las capturas. Vite no lo incluye en el build porque el build solo parte de `index.html`, pero `tsc` sí lo comprueba. Al final de `main.ts` hay un bloque de depuración que cuenta las galaxias visibles; hay que quitarlo.
- **Código nuevo sin tests todavía**:
  - `src/physics/growth.ts`: factor de crecimiento lineal D(a) de Heath 1977, normalizado a D(1) = 1, integrado con Gauss-Legendre.
  - `src/scene/fft.ts`: FFT 3D compleja radix-2.
  - `src/scene/cosmicWeb.ts`: campo gaussiano, desplazamientos de Zel'dovich, autovalores del tensor de deformación y picos.
  - `src/scene/noise3d.ts`: ruido de valor periódico para la textura 3D.
- **Rama auxiliar**: `claude/project-thread-0pvavz` contiene el mismo commit de prototipo. Se creó solo para no perderlo y se puede borrar.

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

## 5. Pasos de integración que quedan

En este orden, todo en `feat/scene`:

1. **Ajuste de nucleosíntesis** (§3.1), con una captura antes de seguir. Si hace falta tocar el punto blanco, se pregunta.
2. **Física y tests**:
   - test de `growth.ts`: límite de Einstein-de Sitter D ∝ a al principio, D(1) = 1 y comparación con una referencia, si existe en la fixture de astropy o en la literatura;
   - tests de `fft.ts` (ida y vuelta, delta), `cosmicWeb.ts` (σ₈ medido en el campo frente al pedido, simetría de los autovalores) y `noise3d.ts` (periodicidad);
   - parámetros nuevos en `params.ts` con su referencia.
3. **Web Worker para el campo.** Generar 128³ tarda 2,8 s en el contenedor (~1 s estimado en escritorio). Va en un worker mientras el panel y el plasma ya se muestran; los buffers se transfieren, no se copian.
4. **Escena nueva** en `src/scene/`, sustituyendo a `field.ts` y `shaders.ts` y a la escena de `bf01a4a`:
   - todo el estado visual pasa por `visualMap.ts`;
   - uniforms normalizados o logaritmos pequeños;
   - se mantienen render bajo demanda y respeto a `prefers-reduced-motion`, con la deriva continua de cámara solo mientras la página está visible;
   - transiciones de 1,5–2 s ease-in-out con `tween.ts`.
5. **Licencias nuevas** en `VISUAL_LICENCES`, cada una con textos ES/EN en i18n y entrada en `licencias-visuales.md`. Mínimo:
   - plasma (turbulencia);
   - contraste del fondo de microondas;
   - etalonaje y postproceso;
   - encendido de picos y galaxias;
   - tamaño de las galaxias.

   Revisar también las diez existentes: algunas cambian de sentido (`density`, `separation`, `structure`).
6. **Edad oscura y reionización** (§3.3, §2 punto 8) y **paradas especulativas** (Planck, inflación): sin a, T ni z, campo abstracto.
7. **Móvil reducido**: rejilla de 64³ (262 000 partículas), plasma con ruido 2D, sin bloom, DPR limitado.
8. **Contador `?fps`** para que Rolando mida en su portátil. El contenedor solo tiene WebGL por software (SwiftShader), así que sus fps no son representativos. Si no llega a 60 fps, el primer ajuste es bajar a ~1 millón de partículas y renderizar el volumen a media resolución.
9. **Limpieza**: quitar `prototype.html`, `src/prototype/` y `scripts/capture-prototype.mjs`, o adaptar el script para capturar la app real.
10. **Cierre**:
    - `npm run verify`;
    - medidas de fps (con su advertencia), del bundle (gzip) y del arranque (`cosmic-timeline:scene`, worker incluido), y del precálculo del modelo;
    - capturas finales a 1920×1080 de las **trece paradas**: planck, inflation, quarks, hadrons, nucleosynthesis, recombination, darkAges, firstStars, reionization, milkyWay, solarSystem, earth y today;
    - actualizar `plan.md` §7.3 y el README;
    - push a `feat/scene` y llevar el CI a verde.

**Capturas.** Con el servidor de Vite levantado (`npx vite --port 5174 --strictPort`), ejecutar `node scripts/capture-prototype.mjs <dir> quarks,today`. Usa el Playwright global del entorno. El prototipo acepta además `?n=`, `?exposure=` y parámetros de ajuste fino (`i, gs, ps, halo, bs, br, bt, cmb, lo, hi, sig, em, fs`) que no deben llegar a la app.

## 6. Forma de trabajo

- **Ramas.** Una rama por tarea. La v1 va en PRs secuenciales a `main`, y esta es la PR 4 (`feat/scene`).
- **PRs.** No se fusiona ninguna. Las fusiona Rolando.
- **Verificación.** `npm run verify` (typecheck + tests + build) debe pasar antes de cada commit; es el gate de Netlify.
- **Tests.** Los cambios en `physics/` o `timeline/` llevan test. Nunca se amplía una tolerancia ni se cambia un valor esperado sin explicar en el commit por qué y con qué fuente.
- **Decisiones visuales.** Se proponen con capturas y se espera la aprobación de Rolando antes de implementarlas. Ante una ambigüedad se le pregunta en vez de suponer.
- **Comunicación.** Rolando escribe en español; código y comentarios en inglés; documentación de usuario en español e inglés.
- **Público.** No es especialista, y Rolando tampoco lo es en cosmología: las explicaciones al usuario van en lenguaje claro.
