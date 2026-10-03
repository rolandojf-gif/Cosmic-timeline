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
