# Rendimiento GPU sin degradación visual

Esta intervención conserva la **misma geometría, el mismo número de partículas,
los mismos shaders, el bloom y la resolución** que la versión cinematográfica
anterior (reversión de la PR #15). Solo regula cuándo se invoca
`composer.render()`.

## Comportamiento

- **Presentación reproduciéndose:** máximo 30 fotogramas WebGL/s. El control
  de la cronología sigue avanzando a su cadencia normal: cada fotograma dibuja
  la posición más reciente, sin alterar la edad física de los hitos.
- **Pausa, sin gestos ni transiciones pendientes:** cero fotogramas de WebGL
  hasta interacción, cambio de hito, carga del campo o redimensionado. La cámara
  y el fondo volumétrico quedan congelados para no ocupar la GPU en reposo.
- **Transición a un hito o interacción de cámara:** vuelve a dibujar a la cadencia
  limitada y se duerme cuando termina.
- **Pestaña en segundo plano:** detiene fotogramas; al volver, no acumula de golpe
  la deriva de cámara.

## Cómo comparar

Abrir **dos pestañas por separado, no simultáneamente** en el mismo equipo,
para que no compitan por la misma GPU:

1. `?fps&fpscap=30` (nuevo comportamiento predeterminado).
2. `?fps&fpscap=60` (misma calidad visual, más renderizados/segundo).
3. `?fps&fpscap=24` (opción de menor uso de GPU si 30 sigue siendo demasiado).

Comprobar en reheating, recombination y cosmic web. En una pausa estable el
contador debe indicar `paused · 0 fps`, excepto durante la llegada al hito
o interacciones. Medir además el **uso real de GPU** con el monitor del sistema.
El contador de FPS indica cadencia, **no** tiempo de ejecución del shader ni
porcentaje de uso de GPU. Un límite de FPS puede reducir trabajo, pero no
garantiza por sí solo un porcentaje concreto de utilización.

No fusionar con `main` sin aceptar tanto la fluidez como la fidelidad visual.
