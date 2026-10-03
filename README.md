# Cosmic Timeline

Un recorrido interactivo por la historia del universo, desde la época de Planck hasta hoy. Un control de tiempo permite situarse en cualquier instante de los 13.800 millones de años y ver los valores físicos de ese momento: tiempo, temperatura, factor de escala, corrimiento al rojo, ritmo de expansión y radio de la región que hoy observamos.

*An interactive journey through the history of the universe. English version available in the app.*

## Principios

1. **Los datos son siempre reales; la imagen es una interpretación; la web dice cuándo interpreta.**
2. **Sin licencia**: tiempos, temperaturas, factor de escala, corrimiento al rojo, radio de la región que hoy observamos y orden de los eventos. Salen de un modelo cosmológico publicado o de mediciones citadas.
3. **Con licencia declarada**: colores, densidad de partículas, cámara, ritmo de transiciones y escala del control. Una línea visible en la página enumera cada una.
4. **Nunca** se representa el Big Bang como una explosión vista desde fuera o con un centro. Se muestra una región del espacio expandiéndose desde dentro.
5. **Cinematográfico pero sobrio**: sin gamificación, sin cuentas, sin backend.

## Qué es dato y qué no

Cada instante lleva un nivel epistémico:

- **Observado**: contrastado con observaciones (nucleosíntesis, fondo de microondas, galaxias, dataciones).
- **Física conocida, extrapolada**: física de partículas probada en laboratorio, aplicada a energías que el universo temprano alcanzó según el modelo.
- **Especulativo**: inflación y época de Planck. La web lo dice y no muestra valores que el modelo no puede dar.

## Física

- Modelo ΛCDM plano con radiación, materia y energía oscura.
- Parámetros de Planck 2018 (TT,TE,EE+lowE+lensing+BAO).
- Radiación corregida con los grados de libertad efectivos del Modelo Estándar en el universo temprano.
- Todo se precalcula al cargar la página, en el navegador.
- Tests de fidelidad frente a valores publicados (edad, recombinación, igualdad materia-radiación, energía oscura) y tests numéricos frente a soluciones analíticas.

El universo puede ser infinito, así que la web nunca habla de su "tamaño": muestra el **radio de la región que hoy observamos** (≈ 46 000 millones de años luz hoy) tal como era en cada instante.

Fuentes completas en [`docs/fuentes.md`](docs/fuentes.md). Plan aprobado y siguiente fase en [`docs/plan.md`](docs/plan.md).

## Estado

En construcción. La versión 1 llega en cuatro pasos: física, épocas y control, interfaz (control, panel y textos en español e inglés) y escena de partículas. Los cuatro están hechos; la escena espera revisión. Ver [`docs/plan.md`](docs/plan.md).

Lo que la web interpreta, y por qué, está en [`docs/licencias-visuales.md`](docs/licencias-visuales.md).

## Desarrollo

Requisitos: Node (versión en `.nvmrc`).

```sh
npm install
npm run dev        # servidor local
npm test           # tests (Vitest)
npm run typecheck  # TypeScript estricto
npm run verify     # typecheck + tests + build: lo mismo que ejecuta Netlify
```

La fixture de referencia se regenera con `python3 scripts/gen-reference.py` (requiere astropy y scipy; solo desarrollo).

Stack: TypeScript, Vite, Vitest y three.js. Sin framework de aplicación ni backend.

## Despliegue

Netlify ejecuta `npm run verify` y publica `dist/`. Si un test de fidelidad falla, no se despliega.

## Idiomas

Español e inglés. Los textos viven en `src/i18n/`; las cifras nunca están en los textos, se insertan desde el modelo.

## Créditos

Inspiración de calidad visual: [helios-solar](https://helios-solar-8fn.pages.dev/). No se ha reutilizado su código ni su diseño.
