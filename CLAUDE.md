# CLAUDE.md

Guía para agentes que trabajan en este repositorio.

## Qué es

Web interactiva sobre la historia del universo desde la época de Planck hasta hoy, con un control de tiempo logarítmico por tramos anclados a las épocas, un panel de valores físicos y una escena de partículas en three.js. TypeScript + Vite + Vitest + three.js, sin framework ni backend, desplegada en Netlify.

## Principios (no negociables)

1. Los datos son siempre reales; la imagen es una interpretación; la web dice cuándo interpreta.
2. **Sin licencia**: tiempos, temperaturas, factor de escala, z, H, radio de la región que hoy observamos, orden de los eventos. Nunca se ajustan para que algo "se vea mejor".
3. **Con licencia declarada**: colores, densidad de partículas, cámara, ritmo de transiciones, escala del control. Toda licencia nueva se registra en `src/scene/visualMap.ts` y aparece en la línea de licencias y en `docs/licencias-visuales.md` (ambos llegan con la UI y la escena).
4. Nunca representar el Big Bang como una explosión vista desde fuera ni con un centro. La cámara está dentro de un campo sin borde que se expande uniformemente.
5. Cinematográfico pero sobrio: nada de gamificación, puntuaciones, logros ni cuentas.
6. Nunca decir "tamaño del universo" (puede ser infinito). La etiqueta es "Radio de la región que hoy observamos" / "Radius of the region we observe today".

## Arquitectura

- `src/physics/` y `src/timeline/` son TypeScript puro: no importan DOM, `three` ni nada de `ui/` o `scene/`. Se testean en Node.
- `src/scene/visualMap.ts` es el único punto donde un dato físico se convierte en un parámetro visual.
- Los uniforms que llegan a la GPU están normalizados en [0,1] o son logaritmos pequeños. Nunca se pasan a, t, T o z crudos (los móviles usan `mediump`).
- Textos en `src/i18n/es.ts` (fuente de claves) y `src/i18n/en.ts` (`satisfies Messages`). Los textos no contienen cifras: se interpolan desde el modelo o desde `epochs.ts`.

## Física

- ΛCDM plano, Planck 2018 TT,TE,EE+lowE+lensing+BAO. Los parámetros viven solo en `src/physics/params.ts`, con su referencia.
- Radiación con g*ρ(T) y g*s(T) tabulados (Saikawa y Shirai 2020, `src/physics/dofTable.ts`, no editar a mano). T(a) por conservación de la entropía.
- Cálculo en logaritmos (ln t, ln a) sobre rejilla uniforme en ln a; Hermite cúbico con la derivada exacta d ln t/d ln a = 1/(tH); la inversa t → a resuelve sobre el mismo segmento, así que la ida y vuelta es exacta.
- Niveles epistémicos: observado, física conocida extrapolada, especulativo. En el nivel especulativo no se muestran a, T, z ni radios.
- Las épocas definidas por temperatura o z obtienen su tiempo del modelo; no se copian tiempos de tablas divulgativas.

## Datos y fuentes

- Todo valor empírico o época nueva necesita una entrada en `docs/fuentes.md` (con DOI o arXiv) y su id en `epochs.ts`.
- Distinguir en comentarios y en `docs/` entre valor medido, valor calculado por el modelo y elección ilustrativa.
- Si un valor no se puede verificar en una fuente fiable, no se añade: se pregunta.

## Tests

- `npm run verify` (typecheck + tests + build) debe pasar antes de cualquier commit; es el gate de Netlify.
- Tests numéricos frente a soluciones analíticas y frente a la fixture de astropy (`tests/fixtures/`, se regenera con `scripts/gen-reference.py`).
- Tests de fidelidad frente a valores publicados. **Nunca** se amplía una tolerancia ni se cambia un valor esperado para que pase un test sin explicar en el commit por qué el valor anterior estaba mal y con qué fuente.
- Cambios en `physics/` o `timeline/` llevan test.

## Rendimiento

- Objetivo: 60 fps en escritorio, ≥ 30 fps en un móvil medio.
- Un único `THREE.Points` con `ShaderMaterial`. Sin postproceso en móvil. DPR limitado. Render bajo demanda. En la v1, un nivel de calidad fijo y prudente; la calidad adaptativa por fps es de la siguiente fase.
- Respetar `prefers-reduced-motion`. Sin WebGL, el panel y el control siguen funcionando.

## Flujo de trabajo

- La v1 se entrega en PRs secuenciales: `feat/physics`, `feat/timeline`, `feat/ui`, `feat/scene`. Cada una revisable por separado; ninguna se fusiona sin aprobación.
- Fuera de la v1 (siguiente fase, ver `docs/plan.md` §8): calidad adaptativa por fps, estado en la URL, imán en las paradas.

## Estilo

- TypeScript estricto. Módulos pequeños con una responsabilidad.
- Accesibilidad: el control es `role="slider"` con `aria-valuetext` legible y teclado completo.
- Idioma del código y comentarios: inglés. Documentación de usuario: español e inglés.
