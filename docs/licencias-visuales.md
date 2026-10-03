# Licencias visuales

La web separa lo que es dato de lo que es interpretación. Los valores físicos (tiempo, temperatura, factor de escala, corrimiento al rojo, ritmo de expansión, radios y orden de los eventos) salen del modelo o de mediciones citadas en [`fuentes.md`](fuentes.md) y nunca se ajustan para que algo "se vea mejor".

Todo lo demás es una licencia: una decisión de representación que no está en los datos. Cada licencia:

- se registra en `src/scene/visualMap.ts` (`VISUAL_LICENCES`), que es el único punto donde un dato se convierte en un parámetro visual;
- aparece en la línea de licencias de la página, que se genera desde ese registro, con su texto en español e inglés (`src/i18n/`, claves `licences.<id>`);
- tiene una entrada en este documento, con el mismo identificador como encabezado.

Los tests comprueban las tres cosas, así que una licencia no puede llegar a la pantalla sin declararse.

## `controlScale`

**Escala del control de tiempo.** El tiempo va de 5,4·10⁻⁴⁴ s a 13 800 millones de años: más de sesenta órdenes de magnitud. Con un control logarítmico puro, el Sistema Solar, la Tierra y hoy caerían en el último 0,3 % del recorrido, en el mismo píxel en un móvil.

Qué se hace:

- Cada parada tiene una posición fija en el control. Entre dos paradas, log t varía linealmente con la posición, de modo que el control es continuo, monótono y exactamente invertible.
- El ancho de cada tramo combina un reparto a partes iguales con su longitud logarítmica real: wᵢ = (1 − s)·Δᵢ/ΣΔ + s/n, con Δᵢ = log₁₀(tᵢ₊₁/tᵢ), n tramos y s = 0,6 (`DEFAULT_EQUAL_SHARE` en `src/timeline/scale.ts`). Ningún tramo baja del 5 %.
- Debajo del control, una regla con una marca por cada potencia de diez de tiempo (en segundos) muestra la escala real: donde las marcas se aprietan, el control comprime el tiempo; donde se separan, lo dilata.

Qué no se hace: el control no cambia ningún valor. La posición solo elige un instante; el panel muestra los valores del modelo en ese instante.

Posiciones de las paradas y comparación con la escala logarítmica pura: [`plan.md`](plan.md), §3.2 y §7.1.

## `colour`

**Color de la luz.** El color es el de un cuerpo negro a la temperatura del modelo: la ley de Planck ponderada con las funciones de color CIE 1931 (ajuste de Wyman, Sloan y Shirley 2013), convertida a sRGB (`src/scene/blackbody.ts`, fuentes en [`fuentes.md`](fuentes.md), sección «Color de la escena»). El color se calcula; la licencia está en cómo se usa:

- Por encima de 10⁶ K (`COLOUR_SATURATION_K`) el tono ya no cambia: es el límite de Rayleigh-Jeans, un blanco azulado. Esa luz es sobre todo ultravioleta, X o gamma; la pantalla solo muestra su parte visible.
- Por debajo del punto de Draper el color no se usa (la luz no se ve; ver `brightness`). El ajuste de las funciones de color no es fiable en ese extremo del espectro.
- En el nivel especulativo (Planck, inflación) no hay temperatura del modelo: la escena usa el violeta con el que el panel marca ese nivel, enfriándose hacia índigo durante la inflación e iluminándose en blanco incandescente en el recalentamiento térmico del Big Bang caliente.

## `brightness`

**Brillo.** El brillo real de la radiación cambia en decenas de órdenes de magnitud (∝ T⁴). En pantalla:

- se apaga del todo por debajo del punto de Draper (798 K, `DRAPER_POINT_K`), donde un cuerpo negro deja de verse a simple vista; entre 798 K y 2970 K se enciende de forma gradual;
- por encima de 2970 K sigue el logaritmo de T, de 0,55 a 1 en 10¹² K;
- desde que el universo es transparente, la materia se dibuja como un gas gris muy tenue (`GAS_LEVEL`) para que la edad oscura no parezca una pantalla vacía. Aprobado por Rolando el 2026-10-03.

Resultado: la radiación deja de verse hacia los 3,15 millones de años (z ≈ 292), y la edad oscura es oscura por el dato.

## `haze`

**Bruma.** Antes de la última dispersión (z\* = 1089,8, Planck 2018) la luz no viaja libre: la escena es una bruma luminosa en la que las partículas apenas se distinguen y el fondo brilla. Después, la bruma se despeja mientras 1 + z cae en un factor 1,5 (`HAZE_CLEARING_FACTOR`). El momento es dato; la duración del fundido es elección.

## `plasma`

**Plasma y turbulencia.** El medio temprano se muestra mediante un raymarching volumétrico continuo sobre una textura periódica de ruido tridimensional (`src/scene/noise3d.ts`), estructurado en regímenes físicos ilustrativos:

- **Época de Planck**: la geometría del espacio-tiempo experimenta fluctuaciones de espuma cuántica, ilustradas mediante microondulaciones sutiles y un tenue fulgor violeta en la textura tridimensional.
- **Inflación cósmica**: la expansión métrica hiperlumínica estira las fluctuaciones cuánticas del vacío en estrías longitudinales paralelas, superenfriando el espacio hacia una calma oscura en índigo profundo.
- **Recalentamiento / Big Bang caliente**: el decaimiento del campo inflatón descarga su energía potencial en radiación y partículas, produciendo una llamarada volumétrica incandescente omnidireccional y máxima turbulencia, sin explosión exterior ni centro.
- **Plasma de quarks y gluones**: fluido relativista no confinado, continuo y ultra-viscoso con alta emisión en blanco azulado.
- **Época hadrónica y nucleosíntesis**: tras el cruce de la cromodinámica cuántica a 155 MeV, el confinamiento de quarks en hadrones y la aniquilación de pares confinan el fluido en grumos y glóbulos densos más discretos, transformándolo en un medio sosegado y pesado antes de la recombinación.

## `cmbContrast`

**Contraste del fondo de microondas.** Las fluctuaciones de temperatura en el fondo cósmico de microondas tienen una amplitud real de apenas una parte en 100 000 ($\Delta T / T \sim 10^{-5}$). En la escena, las manchas en el cielo siguen la escala angular del primer pico acústico ($\ell \approx 220$) y armónicos superiores, pero su contraste térmico está muy exagerado para que las regiones frías y calientes se distingan visualmente.

## `separation`

**Separación.** Entre el primer instante con valores del modelo y hoy, el factor de escala crece unas 2·10¹⁵ veces. El campo se evalúa en una caja periódica comóvil de 200 Mpc/h, donde los desplazamientos de materia $\psi(q)$ se escalan linealmente con el factor de crecimiento $D(a)$.

## `motion`

**Movimiento.** La cámara recorre el campo periódico con una deriva lenta y continua mientras la página está visible, mostrando la profundidad y el paralaje de las estructuras cósmicas sin bordes ni centro. Si la pestaña se oculta o si el sistema tiene activada la preferencia de movimiento reducido (`prefers-reduced-motion`), la cámara permanece fija.

## `structure`

**Estructura.** La distribución de materia se calcula a partir de un campo gaussiano aleatorio con el espectro de potencia lineal $P(k) \propto k^{n_s} T(k)^2$ de Eisenstein y Hu (1998), normalizado a $\sigma_8 = 0,8102$ hoy (Planck 2018). Las posiciones y densidades siguen la aproximación truncada de Zel'dovich (Coles et al. 1993) y los autovalores del tensor de deformación, modulados por el factor de crecimiento lineal $D(a)$ (Heath 1977).

## `density`

**Número de partículas.** 2 097 152 partículas ($128^3$) en escritorio y 262 144 ($64^3$) en móvil (`PARTICLES_DESKTOP`, `PARTICLES_MOBILE`). Representan elementos de fluido de materia en la red de Zel'dovich.

## `peaks`

**Encendido de galaxias.** Las galaxias y cúmulos se encienden en los picos de densidad lineal cuando la sobredensidad colapsada supera el umbral esférico $\delta_c = 1,686$. La escala de masa se calibra para que el pico más prominente empiece a brillar en el ancla de las primeras estrellas.

## `galaxySize`

**Tamaño de las galaxias.** Las galaxias en los picos se dibujan como sprites procedimentales orientados al azar (espirales o elípticas) cuyo tamaño aparente, concentración central y tono evolucionan con la edad, facilitando su identificación visual en la red de filamentos.

## `camera`

**Cámara y navegación interactiva.** La cámara está situada dentro de la caja periódica, mirando hacia el pico de densidad más masivo. El espacio se repite periódicamente en todas direcciones y los puntos se atenúan suavemente con la distancia, garantizando que no se aprecie ningún borde ni centro. La escena permite interacción gestual libre: arrastre para orientar la vista o desplazarse lateralmente, rueda del ratón o pellizco táctil para ajustar el campo de visión (zoom) con amortiguación suave, y doble clic para restablecer la vista de deriva frontal original.

## `transitions`

**Pasos entre instantes.** Al cambiar de instante, la escena recorre el camino en 1,75 s (`TRANSITION_SECONDS`) con una curva suave de aceleración y frenado (`tween.ts`). Si el control se mueve durante el paso, el recorrido se redirige sin saltos de posición ni de velocidad. Con `prefers-reduced-motion` el cambio es instantáneo. El panel no espera: siempre muestra el instante elegido.

## `grading`

**Etalonaje y postproceso.** La composición en pantalla utiliza mapeo de tonos ACES Filmic para preservar los matices de luminosidad sin saturar bruscamente en blanco, viñeteado óptico suave hacia las esquinas y un grano muy fino (0,02) para evitar bandas de color en los degradados del plasma.

## `milkyWayPin`

**Posición de la Vía Láctea.** En la caja periódica de la red cósmica se señala ilustrativamente una galaxia espiral representativa para contextualizar espacialmente el nacimiento de nuestra galaxia, la posterior formación del Sistema Solar y el surgimiento de la Tierra.

