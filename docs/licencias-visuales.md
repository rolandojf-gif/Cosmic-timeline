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
- En el nivel especulativo (Planck, inflación) no hay temperatura del modelo: la escena usa el violeta con el que el panel marca ese nivel.

## `brightness`

**Brillo.** El brillo real de la radiación cambia en decenas de órdenes de magnitud (∝ T⁴). En pantalla:

- se apaga del todo por debajo del punto de Draper (798 K, `DRAPER_POINT_K`), donde un cuerpo negro deja de verse a simple vista; entre 798 K y 2970 K se enciende de forma gradual;
- por encima de 2970 K sigue el logaritmo de T, de 0,55 a 1 en 10¹² K;
- desde que el universo es transparente, la materia se dibuja como un gas gris muy tenue (`GAS_LEVEL`) para que la edad oscura no parezca una pantalla vacía. Aprobado por Rolando el 2026-10-03.

Resultado: la radiación deja de verse hacia los 3,15 millones de años (z ≈ 292), y la edad oscura es oscura por el dato.

## `haze`

**Bruma.** Antes de la última dispersión (z\* = 1089,8, Planck 2018) la luz no viaja libre: la escena es una bruma luminosa en la que las partículas apenas se distinguen y el fondo brilla. Después, la bruma se despeja mientras 1 + z cae en un factor 1,5 (`HAZE_CLEARING_FACTOR`). El momento es dato; la duración del fundido es elección.

## `separation`

**Separación.** Entre el primer instante con valores del modelo (el cruce electrodébil) y hoy, el factor de escala crece unas 2·10¹⁵ veces. En pantalla, el lado de la caja periódica crece de forma lineal con ln a, hasta el doble (`SEPARATION_GAIN`), y la región visible crece con la raíz cuadrada de ese lado: hoy se ven unas tres veces menos partículas que al principio.

## `motion`

**Movimiento.** La escena está quieta salvo al cambiar de instante (decisión de Rolando, 2026-10-03, para no gastar batería). Tras cada paso, las partículas siguen separándose durante 3 s (`DRIFT_SECONDS`), con un desplazamiento proporcional a H·t: cuánto crecen las distancias por unidad de edad del universo, ½ en la era de radiación, ⅔ en la de materia y 0,95 hoy. Con `prefers-reduced-motion` no hay deriva.

## `structure`

**Estructura.** Desde el ancla de las primeras estrellas (`epochs.ts`), cada partícula se desplaza hacia el filamento o el nudo más cercano de una red cósmica ilustrativa (`src/scene/field.ts`: 160 nudos unidos con sus tres vecinos más próximos). El grado de avance sigue ln(t/t₁) / ln(t₀/t₁), con t₁ el ancla de las primeras estrellas y t₀ la edad del universo. Un 7 % de las partículas se encienden como estrellas a lo largo de un factor 3 en el tiempo. El dibujo no es un mapa de objetos reales, y la estructura empieza a crecer antes de las primeras estrellas; mostrarla desde ese ancla es la elección aprobada.

## `density`

**Número de partículas.** 30 000 partículas en escritorio y 12 000 en móvil (`PARTICLES_DESKTOP`, `PARTICLES_MOBILE`), un nivel fijo y prudente para la v1. No son átomos, estrellas ni galaxias concretos. La calidad adaptativa por fps queda para la siguiente fase ([`plan.md`](plan.md), §8).

## `camera`

**Cámara.** La cámara está quieta dentro de un campo periódico: las posiciones se repiten en todas direcciones y las partículas se desvanecen antes de llegar al borde de la caja, así que no se ve ni un borde ni un centro. Todo se aleja de todo. La cámara mira hacia la dirección con más estructura hoy, para no empezar dentro de un vacío, y en pantallas anchas el centro de la vista se desplaza a la derecha, fuera de la columna de texto.

## `transitions`

**Pasos entre instantes.** Al cambiar de instante, la escena recorre el camino en 1,75 s (`TRANSITION_SECONDS`, dentro de los 1,5–2 s que pidió Rolando) con una curva suave de aceleración y frenado. Si el control se mueve durante el paso, el recorrido se redirige sin saltos de posición ni de velocidad. En el camino se calculan los estados intermedios del modelo, así que un salto largo pasa por las épocas que hay entre medias. Con `prefers-reduced-motion` el cambio es instantáneo. El panel no espera: siempre muestra el instante elegido.
