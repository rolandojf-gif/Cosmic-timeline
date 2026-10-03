# Cosmic Timeline: plan de la versión 1

Estado: **aprobado el 2026-10-03** con las recomendaciones D1–D5. El texto de las secciones 0 a 6 es el plan tal como se aprobó; lo que cambió al implementarlo está en la sección 7, y el alcance y la siguiente fase en la sección 8.

Convención de este documento: **[V]** valor verificado en fuente citada; **[C]** calculado por mí con el modelo descrito (Python, contrastado con `astropy.cosmology.Planck18`); **[I]** inferencia o estimación mía.

---

## 0. Decisiones (aprobadas)

| # | Decisión | Recomendación aprobada |
|---|----------|------------------|
| D1 | Escala del control: logarítmica pura o logarítmica por tramos anclados a las épocas | **Por tramos** (§3.2). Con log puro, Sistema Solar, Tierra y hoy caen en el último 0,3 % del recorrido |
| D2 | Qué significa "inicio del dominio de la energía oscura" en el test | **Testear dos hitos con definición explícita**: ρ_Λ = ρ_m a t ≈ 10,2 Gyr y comienzo de la aceleración (q = 0) a t ≈ 7,6 Gyr. Ninguno cae en "9–10 Gyr" (§2.4) |
| D3 | Corregir la radiación con los grados de libertad g*(T) del Modelo Estándar | **Sí**. Sin ello, los tiempos de quarks, hadrones y nucleosíntesis salen desviados entre un 40 % y un factor ~2 (§2.2) |
| D4 | Qué muestra el panel antes de ~10⁻¹¹ s (por encima de la física conocida) | **Solo el tiempo y texto marcado como especulativo**, sin a, T, z ni tamaño (§2.3) |
| D5 | Definición de "tamaño del universo observable" en un instante t | **Radio que tenía la región hoy observable** (a(t) × 46,2 Gal) como valor principal; radio de Hubble c/H como secundario (§2.5) |

Matiz de D5 aprobado: en la interfaz nunca se habla de "tamaño del universo" (puede ser infinito). La etiqueta es **"Radio de la región que hoy observamos"** / **"Radius of the region we observe today"**.

Código y comentarios en inglés; documentación en español.

---

## 1. Estructura de carpetas y ficheros

```
Cosmic-timeline/
├─ index.html
├─ package.json            scripts: dev, build, preview, typecheck, test, verify
├─ tsconfig.json           strict, noUncheckedIndexedAccess
├─ vite.config.ts          incluye la configuración de Vitest
├─ netlify.toml            command = "npm run verify", publish = "dist"
├─ .nvmrc                  versión de Node fijada para Netlify y local
├─ README.md
├─ CLAUDE.md
├─ docs/
│  ├─ fuentes.md           bibliografía con DOI/arXiv; cada fuente tiene un id
│  └─ licencias-visuales.md  qué es interpretación y por qué
├─ public/                 favicon, imagen OG
├─ scripts/
│  └─ gen-reference.py     solo desarrollo: genera la fixture de astropy (no entra en el build)
├─ src/
│  ├─ main.ts              arranque: precálculo → i18n → UI → escena
│  ├─ physics/             TS puro, sin DOM ni three.js
│  │  ├─ constants.ts      constantes CODATA/IAU y unidades (año juliano, pc, ly)
│  │  ├─ params.ts         Planck 2018 con referencia a la columna exacta
│  │  ├─ dof.ts            g*(T) y g*s(T) tabulados (Saikawa y Shirai 2018)
│  │  ├─ friedmann.ts      E(a), H(a), T(a)
│  │  ├─ integrate.ts      cuadratura acumulada en ln a
│  │  ├─ interp.ts         interpolación cúbica monótona (Fritsch–Carlson)
│  │  ├─ cosmology.ts      tabla precalculada y API stateAt(t) → {a, z, T, H, R_obs, R_H, tier}
│  │  └─ validity.ts       dominio de validez y nivel epistémico por instante
│  ├─ timeline/            TS puro
│  │  ├─ epochs.ts         épocas: criterio físico, intervalo, ancla, nivel, fuentes
│  │  ├─ resolve.ts        convierte criterios (T, z, "hace X años") en t con el modelo
│  │  └─ scale.ts          biyección control u ∈ [0,1] ↔ t
│  ├─ ui/
│  │  ├─ timeControl.ts    control, paradas, teclado, accesibilidad
│  │  ├─ infoPanel.ts      valores del instante y texto de la época
│  │  ├─ licenseLine.ts    línea de licencias generada desde visualMap
│  │  └─ format.ts         notación científica, unidades, cifras significativas, Intl
│  ├─ scene/
│  │  ├─ renderer.ts       WebGLRenderer, DPR limitado, render bajo demanda, pérdida de contexto
│  │  ├─ particles.ts      un único THREE.Points con ShaderMaterial
│  │  ├─ shaders/          particles.vert.glsl, particles.frag.glsl (import ?raw)
│  │  ├─ visualMap.ts      estado físico → parámetros visuales; registro de licencias
│  │  └─ quality.ts        niveles de calidad según dispositivo y fps medidos
│  ├─ i18n/
│  │  ├─ index.ts          detección (?lang, navigator.language), cambio, <html lang>
│  │  ├─ es.ts             fuente de verdad de las claves
│  │  └─ en.ts             `satisfies Messages`: el typecheck falla si falta una clave
│  └─ styles/main.css
└─ tests/
   ├─ physics/numerics.test.ts    corrección numérica frente a soluciones analíticas
   ├─ physics/fidelity.test.ts    valores de referencia publicados
   ├─ physics/reference.test.ts   frente a la fixture de astropy
   ├─ fixtures/astropy-planck18.json   (+ nota de procedencia y versión)
   ├─ timeline/epochs.test.ts
   ├─ timeline/scale.test.ts
   ├─ ui/format.test.ts
   └─ i18n/keys.test.ts
```

Reglas de dependencia: `physics/` y `timeline/` no importan nada de `ui/`, `scene/` ni `three`; se testean en Node sin navegador. `scene/visualMap.ts` es el **único** sitio donde se toman decisiones visuales a partir de datos, y la línea de licencias se genera desde su registro, de modo que no puede existir una licencia visual no declarada.

Sin framework de aplicación: DOM con TypeScript y módulos pequeños. Textos en `i18n/`, nunca en el código.

---

## 2. Física

### 2.1 Modelo y parámetros

ΛCDM plano con radiación, materia y Λ:

H(a) = H₀ · √( Ω_r(a)·a⁻⁴ + Ω_m·a⁻³ + Ω_Λ ),  Ω_Λ = 1 − Ω_m − Ω_r,0

Parámetros: **Planck 2018, TT,TE,EE+lowE+lensing+BAO** (Tabla 2, última columna), la misma combinación que usa `astropy.cosmology.Planck18` [V]:

| Parámetro | Valor | Fuente |
|---|---|---|
| H₀ | 67,66 ± 0,42 km s⁻¹ Mpc⁻¹ | Planck 2018 VI, Tabla 2 |
| Ω_m | 0,3111 ± 0,0056 | ídem |
| Ω_Λ | 0,6889 ± 0,0056 | ídem |
| Edad | 13,787 ± 0,020 Gyr | ídem |
| z* (último scattering) | 1089,80 ± 0,21 | ídem |
| z_eq | 3387 ± 21 | ídem |
| z_re (punto medio) | 7,82 ± 0,71 | ídem |
| T_CMB,0 | 2,7255 K | Fixsen 2009 |
| N_eff | 3,046 | estándar |

Ω_r,0 = Ω_γ (1 + 0,2271·N_eff) con Ω_γ h² = 2,47·10⁻⁵ → Ω_r,0 ≈ 9,14·10⁻⁵ [C].

Simplificación declarada: neutrinos tratados como sin masa en la radiación; la masa de Σm_ν = 0,06 eV ya está dentro de Ω_m. Efecto en la edad ≈ 1 Myr [C], muy por debajo de la incertidumbre de Planck.

Comprobación previa con este modelo [C]: edad 13,786 Gyr (astropy: 13,787); t(z*) = 372 kyr (astropy: 372,3); t_eq = 50,9 kyr (astropy: 51,0).

### 2.2 Universo temprano: g*(T)

Con Ω_r constante y T = T₀(1+z), el modelo es correcto después de la aniquilación e⁺e⁻ (t ≳ 10 s), pero no antes: el número de especies relativistas cambia (g* pasa de 106,75 sobre la escala electrodébil a 3,36 hoy) y la entropía liberada calienta los fotones. Por eso:

- T(a) por conservación de la entropía: g*s(T)·T³·a³ = constante.
- ρ_r(a) ∝ g*(T)·T⁴.
- g*(T) y g*s(T) desde la tabla de Saikawa y Shirai (2018), que incluye la transición QCD con datos de retículo; se empaqueta como JSON pequeño con la cita.

Magnitud del error si no se hace [C]: a T = 10¹⁰ K el modelo ingenuo da t = 1,77 s frente a ≈ 0,74–1 s con g*; en la transición QCD el factor es ≈ 2. Esto afecta directamente a las paradas de quarks, hadrones y nucleosíntesis (D3).

### 2.3 Dominio de validez y niveles epistémicos

Cada instante tiene un nivel, visible en el panel:

| Nivel | Intervalo | Qué significa |
|---|---|---|
| **Observado** | t ≳ 1 s (nucleosíntesis en adelante) | Contrastado con abundancias ligeras, CMB, galaxias |
| **Física conocida, extrapolada** | ~10⁻¹¹ s – 1 s | Modelo Estándar probado en aceleradores; aplicarlo aquí supone que el recalentamiento tras la inflación superó esas energías |
| **Especulativo** | t ≲ 10⁻¹¹ s | Inflación y época de Planck: no hay teoría confirmada ni medida directa |

Recomendación D4: en el nivel especulativo el panel muestra el tiempo y el texto de la época, y en lugar de a, T, z y tamaño dice que el modelo no describe ese instante. La alternativa sería mostrar la extrapolación del Big Bang caliente sin inflación (T ~ 10³² K en t_P), etiquetada; la descarto por defecto porque contradice la propia parada de inflación que está al lado.

### 2.4 Cálculo numérico

1. Rejilla uniforme en ln a (≈ 4000 puntos, más densa en las transiciones de g*), desde ln a ≈ −60 hasta 0.
2. t(a) = ∫ d ln a / H(a), acumulada con Gauss–Legendre por intervalo. El primer tramo se inicializa con la solución analítica de radiación pura, t = a²/(2H₀√Ω_r), en vez de integrar desde a = 0.
3. Todo se guarda en logaritmos: ln t, ln a, ln T, ln H. E² se evalúa con log-sum-exp para no desbordar si la rejilla se extiende.
4. Consulta e inversión: interpolación cúbica monótona en (ln t → ln a); como todo es estrictamente monótono, la inversa es la misma tabla leída al revés.
5. Derivados: z = 1/a − 1, T(a), H(a), radio de Hubble c/H, radio de la región hoy observable a(t)·D_p(t₀), con D_p(t₀) = c∫dt/a.
6. Precálculo al cargar, objetivo < 30 ms en móvil medio [I].

Hitos de energía oscura [C] (base de D2):

| Hito | z | t |
|---|---|---|
| ρ_Λ = ρ_m | 0,303 | 10,23 Gyr |
| Comienzo de la aceleración (q = 0, ρ_m = 2ρ_Λ) | 0,642 | 7,64 Gyr |

Tu rango de "9–10 Gyr" queda entre los dos. Propongo testear ambos con su definición y tolerancia de ±0,3 Gyr, y que el texto de la web distinga "empieza a acelerar" de "pasa a dominar".

### 2.5 Tamaño del universo observable

"Tamaño del universo observable en t" tiene tres lecturas razonables:

1. **Radio que tenía la región que hoy observamos**: a(t) × 46,2 Gal [C] (valor habitual citado: ~46,5 Gal). Bien definido siempre que a(t) lo esté. En la recombinación: 42 Mal [C].
2. **Horizonte de partículas en t** (lo que un observador de entonces podía ver): a(t)·∫₀ᵗ c dt'/a. En la recombinación: 0,84 Mal [C]. Depende de suponer que no hubo inflación, que es justo el problema del horizonte.
3. **Radio de Hubble** c/H(t): 14,45 Gal hoy, 0,63 Mal en la recombinación [C].

Recomendación D5: (1) como valor principal, porque es lo que la escena muestra (la misma región, expandiéndose desde dentro), y (3) como secundario. (2) solo si lo quieres con su advertencia.

### 2.6 Tests

**Numéricos** (que el código calcula bien lo que dice calcular):

- Universo solo de materia y Λ: frente a t(a) = 2/(3H₀√Ω_Λ)·asinh(√(Ω_Λ/Ω_m)·a^{3/2}), error relativo < 10⁻⁸.
- Radiación pura y radiación + materia: frente a sus soluciones cerradas.
- Monotonía estricta de todas las tablas; ida y vuelta t → a → t con error < 10⁻⁹ en 10⁵ instantes log-uniformes entre t_P y t₀; ningún NaN ni Infinity.
- Continuidad en las transiciones de g*.
- Frente a la fixture de astropy (t(z), H(z) para z ∈ [0, 10⁴]): error < 0,1 %.

**Fidelidad** (que el modelo reproduce el universo publicado):

| Test | Esperado | Tolerancia | Modelo [C] |
|---|---|---|---|
| Edad t₀ | 13,787 Gyr | ± 0,05 Gyr | 13,786 |
| T(t₀) | 2,7255 K | exacto por construcción | — |
| H(t₀) | 67,66 | exacto por construcción | — |
| t(z* = 1089,80) | ≈ 380 kyr | 360–390 kyr | 372 |
| T(z*) | ≈ 3000 K | 2900–3100 K | 2973 |
| z en t = 380 kyr | ≈ 1100 | 1050–1120 | 1076 |
| z_eq = Ω_m/Ω_r − 1 | 3387 | ± 2 % | 3403 |
| t_eq | ≈ 50.000 años | 45–57 kyr | 50,9 |
| ρ_Λ = ρ_m | 10,2 Gyr | ± 0,3 Gyr | 10,23 |
| Inicio de aceleración | 7,6 Gyr | ± 0,3 Gyr | 7,64 |
| Radio región observable hoy | ≈ 46,5 Gal | 45,5–47,0 Gal | 46,2 |
| t(z_re = 7,82) | ≈ 650 Myr | 600–720 Myr | 657 |
| t(T = 10¹⁰ K) con g* | ≈ 1 s | 0,6–1,4 s | por implementar |
| t(T = 0,1 MeV) con g* | ≈ 2 min | 100–200 s | ≈ 132 [C, g* = 3,36] |

Nota: el "380.000 años" divulgativo corresponde al modelo con z* y da 372 kyr; la tolerancia 360–390 lo admite sin forzar el dato.

**Épocas y control**: épocas ordenadas por ancla; cada una con al menos una fuente existente en `docs/fuentes.md`, un nivel y texto ES y EN; el tiempo derivado del criterio cae dentro del intervalo documentado; escala biyectiva y monótona con las paradas en su posición exacta.

**i18n y formato**: mismas claves en ES y EN; formato numérico por locale (13,8 frente a 13.8); cifras significativas acordes a la incertidumbre del dato.

---

## 3. Control de tiempo y épocas

### 3.1 Épocas verificadas

Las épocas definidas por un criterio físico (temperatura o z) no llevan un tiempo copiado de una tabla: lo calcula el modelo. Las astrofísicas tardías se definen por edad medida ("hace X") y se convierten con t₀ del modelo.

| Época | Criterio del ancla | t aproximado | Nivel | Fuentes |
|---|---|---|---|---|
| Planck | t_P = 5,391·10⁻⁴⁴ s (inicio del control) | < 10⁻⁴³ s | Especulativo | CODATA 2018 |
| Inflación | ilustrativo; escala de energía ≲ 10¹⁶ GeV por r < 0,036 | ~10⁻³⁶ – 10⁻³² s, dependiente del modelo | Especulativo | BICEP/Keck 2021; Planck 2018 X |
| Quarks | T = 159,5 ± 1,5 GeV (cruce electrodébil) hasta T = 156,5 MeV | ≈ 10⁻¹¹ s → ≈ 10⁻⁵ s [C] | Física conocida | D'Onofrio y Rummukainen 2016; HotQCD 2019 |
| Hadrones | T = 156,5 ± 1,5 MeV (cruce QCD) hasta T ≈ 1 MeV | ≈ 10⁻⁵ s → ≈ 1 s [C] | Física conocida | HotQCD 2019; PDG |
| Nucleosíntesis | T ≈ 0,1 MeV (se rompe el cuello de botella del deuterio) | ≈ 2 min; abundancias fijadas hacia t ~ 180 s | Observado | PDG 2025, revisión BBN |
| Recombinación | z* = 1089,80 | 372 kyr, T = 2973 K [C] | Observado | Planck 2018 VI |
| Edad oscura | de z* a las primeras estrellas; ancla ilustrativa z = 100 | 0,37 → ~100–180 Myr; ancla 16 Myr [C] | Física conocida (sin observación directa) | Bromm 2013 |
| Primeras estrellas | z ≈ 20–30 (teoría); ancla z = 25 | 99–178 Myr; ancla 129 Myr [C] | Dependiente de modelo | Bromm 2013 |
| Galaxia más lejana confirmada (dato dentro de la anterior) | z = 14,44 (MoM-z14) | 283 Myr [C] | Observado | Naidu et al. 2026 |
| Reionización | punto medio z = 7,82; final z ≈ 5,3 | 657 Myr → 1,09 Gyr [C] | Observado | Planck 2018 VI; Bosman et al. 2022 |
| Vía Láctea | disco grueso empieza hace ~13 Gyr | ≈ 0,8 Gyr | Observado (con incertidumbre de ~1 Gyr) | Xiang y Rix 2022 |
| Sistema Solar | CAI: hace 4567,30 ± 0,16 Myr | 9,219 Gyr | Observado | Connelly et al. 2012 |
| Tierra | hace 4,54 ± 0,05 Gyr | 9,25 Gyr | Observado | Dalrymple 2001 |
| Hoy | t₀ del modelo | 13,786 Gyr | Observado | Planck 2018 VI |

Observaciones que conviene que la web diga:

- La transición quark-hadrón real ocurre hacia 10⁻⁵ s según el modelo con g* [C]; muchas fuentes divulgativas dan 10⁻⁶ s. Usaré lo que salga del modelo con su criterio de temperatura.
- Las épocas se solapan: la formación de la Vía Láctea (0,8 Gyr) empieza antes de que termine la reionización (1,09 Gyr). Son intervalos con un ancla, no casillas consecutivas.
- Sistema Solar y Tierra están separados por ~30 Myr, menos que la incertidumbre de la edad de la Tierra.
- Edad oscura y primeras estrellas no tienen observación directa (la señal de 21 cm de EDGES sigue disputada).

### 3.2 Escala del control (D1)

Rango: t_P = 5,39·10⁻⁴⁴ s hasta t₀ = 4,35·10¹⁷ s, es decir **60,6 décadas** [C].

Con log₁₀ t puro, la posición de cada hito en el recorrido sería [C]:

| Hito | Posición |
|---|---|
| t = 1 s | 70,9 % |
| Recombinación | 92,5 % |
| 100 Myr | 96,5 % |
| Vía Láctea | 98,0 % |
| Sistema Solar | 99,71 % |
| Tierra | 99,71 % |
| Hoy | 100 % |

En un móvil de 360 px, todo desde las primeras galaxias ocupa unos 7 px, y Sistema Solar y Tierra caen en el mismo píxel. El control sería fiel al eje pero inútil para la mitad de las paradas.

**Propuesta**: escala logarítmica por tramos.

- Cada ancla de época tiene una posición fija en el control.
- El ancho de cada tramo combina su longitud real en décadas con un mínimo garantizado: wᵢ = α·Δlog₁₀tᵢ + β, con β ajustado para que ningún tramo baje de ~5 % del recorrido.
- Dentro de cada tramo, la interpolación es lineal en log t; la función es continua, monótona y exactamente invertible.
- Debajo del control, una regla fina muestra la escala logarítmica real para que la distorsión sea visible. La escala del control figura en la línea de licencias.

**Interacción**: arrastre continuo (el imán en las paradas pasa a la siguiente fase, §8); lista de paradas pulsable; teclado (flechas para avance fino, Re Pág y Av Pág para saltar de parada, Inicio y Fin); `role="slider"` con `aria-valuetext` legible ("372.000 años, recombinación"). El estado en la URL pasa a la siguiente fase (§8).

---

## 4. Riesgos técnicos

### 4.1 three.js en móvil

| Riesgo | Mitigación |
|---|---|
| Fill-rate: partículas grandes con mezcla aditiva y mucho solapamiento son el cuello de botella real en GPU móvil, más que el número de vértices | Tamaño de punto acotado; niveles de calidad (≈ 100k / 40k / 15k partículas [I]) ajustados por fps medidos (siguiente fase, §8; la v1 usa un nivel fijo y prudente) |
| devicePixelRatio 3 multiplica el coste por 9 | DPR limitado a 1,5–2 |
| Calentamiento y batería | Render bajo demanda: solo se dibuja cuando cambia el tiempo o hay transición; pausa con `visibilitychange` |
| Postproceso (bloom) caro | Sin postproceso en móvil; brillo resuelto en el fragment shader |
| Precisión de la GPU: muchos móviles usan `mediump` (fp16, ~3 cifras, máximo ~6,5·10⁴) | Nunca pasar a, t ni T crudos a la GPU: solo uniforms normalizados en [0,1] calculados en JS con doble precisión |
| Pérdida de contexto WebGL | Manejar `webglcontextlost/restored` y reconstruir |
| Sin WebGL o `prefers-reduced-motion` | El panel y el control funcionan sin escena; transiciones instantáneas si se pide menos movimiento |
| Tamaño del bundle | Importaciones selectivas de three; objetivo ≤ 200 kB gzip [I] |

### 4.2 Precisión numérica en 60 órdenes de magnitud

| Riesgo | Mitigación |
|---|---|
| El rango en sí: double cubre 10^±308, así que el problema no es la magnitud sino perder precisión relativa al restar o al interpolar | Trabajar en logaritmos; tablas en ln t, ln a, ln T |
| Desbordamiento de a⁻⁴ si se amplía la rejilla | log-sum-exp en E²(a) |
| Integrar desde a = 0 (singular) | Arranque analítico en radiación pura |
| Escalones de g* que rompen la interpolación | Tabla suave de Saikawa y Shirai; rejilla más densa en las transiciones; interpolación monótona |
| Control con `<input type=range>` de resolución insuficiente | Valor interno continuo u ∈ [0,1] en doble; el elemento visual es solo representación |
| Mostrar más cifras de las que el dato justifica | El formateador recibe la incertidumbre o el nivel de la época y limita cifras significativas |
| Cambio de unidades (s, min, años, kyr, Myr, Gyr) | Umbrales fijos y testeados; año juliano 365,25 d (IAU) declarado |
| Eventos "hace X años" desplazados porque t₀ del modelo tiene ±20 Myr | Se guarda el dato medido (hace X) y se convierte con t₀ del modelo; el panel muestra la incertidumbre |

### 4.3 Representación

- **Sin centro ni borde**: la cámara está dentro del campo de partículas, que es periódico (posiciones envueltas en una caja en el shader), así que nunca se ve un borde ni un punto privilegiado. La expansión es un escalado uniforme alrededor de cada punto; desde dentro se ve que todo se aleja de todo, que es correcto. Riesgo: que se lea como la cámara retrocediendo. Mitigación: el campo nunca se "vacía" hacia un punto y el ritmo es lento.
- **30 órdenes de magnitud de a en una pantalla**: la separación visual no puede ser proporcional a a. Se mapea a una función de ln a renormalizada; es una licencia y se declara. El panel da siempre el valor real.
- **Color**: propongo partir de la cromaticidad de cuerpo negro a la temperatura del instante, saturada arriba (por encima de ~10⁵ K los fotones son UV, X o gamma) y apagándose por debajo de ~1000 K, de forma que la edad oscura sea oscura. Es una interpretación anclada en el dato; se declara como licencia igualmente.

### 4.4 Deriva entre datos y textos

Los textos de época pueden contradecir los números si se editan por separado. Mitigación: los textos no contienen cifras; las cifras se insertan desde el modelo o desde `epochs.ts`, y cada dato tiene su fuente en `docs/fuentes.md`.

---

## 5. Borradores

Los borradores aprobados son hoy [`README.md`](../README.md) y [`CLAUDE.md`](../CLAUDE.md).

---

## 6. Fuentes

- Planck Collaboration (2020). Planck 2018 results. VI. Cosmological parameters. *A&A* 641, A6. arXiv:1807.06209. Tabla 2: https://www.aanda.org/articles/aa/full_html/2020/09/aa33910-18/T2.html
- Planck Collaboration (2020). Planck 2018 results. X. Constraints on inflation. *A&A* 641, A10. arXiv:1807.06211.
- BICEP/Keck Collaboration (2021). *Phys. Rev. Lett.* 127, 151301. arXiv:2110.00483 (r₀.₀₅ < 0,036 al 95 %).
- D'Onofrio, M. y Rummukainen, K. (2016). The Standard Model cross-over on the lattice. *Phys. Rev. D* 93, 025003. arXiv:1508.07161 (T_c = 159,5 ± 1,5 GeV).
- HotQCD Collaboration, Bazavov, A. et al. (2019). Chiral crossover in QCD at zero and non-zero chemical potentials. *Phys. Lett. B* 795, 15. arXiv:1812.08235 (T_c = 156,5 ± 1,5 MeV).
- Saikawa, K. y Shirai, S. (2018). Primordial gravitational waves, precisely. *JCAP* 05, 035. arXiv:1803.01038 (tablas de g* y g*s).
- Fields, B. D., Molaro, P. y Sarkar, S. Big-Bang Nucleosynthesis, en Particle Data Group, Review of Particle Physics 2025: https://pdg.lbl.gov/2025/reviews/rpp2025-rev-bbang-nucleosynthesis.pdf
- Fixsen, D. J. (2009). The temperature of the cosmic microwave background. *ApJ* 707, 916.
- Bromm, V. (2013). Formation of the first stars. *Rep. Prog. Phys.* 76, 112901. arXiv:1305.5178 (z ≈ 20–30).
- Naidu, R. P. et al. (2026). A Cosmic Miracle: A Remarkably Luminous Galaxy at z_spec = 14.44 Confirmed with JWST. *Open J. Astrophys.* 9. arXiv:2505.11263.
- Carniani, S. et al. (2024). Spectroscopic confirmation of two luminous galaxies at a redshift of 14. *Nature* 633, 318.
- Bosman, S. E. I. et al. (2022). Hydrogen reionization ends by z = 5.3. *MNRAS* 514, 55. arXiv:2108.03699.
- Xiang, M. y Rix, H.-W. (2022). A time-resolved picture of our Milky Way's early formation history. *Nature* 603, 599. doi:10.1038/s41586-022-04496-5.
- Connelly, J. N. et al. (2012). The absolute chronology and thermal processing of solids in the solar protoplanetary disk. *Science* 338, 651.
- Dalrymple, G. B. (2001). The age of the Earth in the twentieth century: a problem (mostly) solved. *Geol. Soc. London Spec. Publ.* 190, 205.
- CODATA 2018 (Tiesinga et al. 2021, *Rev. Mod. Phys.* 93, 025010): tiempo de Planck 5,391247·10⁻⁴⁴ s.
- Contraste numérico: `astropy.cosmology.Planck18` (astropy 8.0.1).

Todas las referencias se verificaron (DOI, volumen y página) antes de pasar a [`fuentes.md`](fuentes.md), que es desde ahora la lista de referencia.

---

## 7. Cambios respecto al plan al implementar la física

- **Tabla de g\*(T)**: se usa la versión actualizada de Saikawa y Shirai, *JCAP* 08 (2020) 011, arXiv:2005.03544, en lugar de la de 2018. Se transcribe sin cambios desde la tabla que distribuye el paquete PTArcade (licencia MIT), que cita ese artículo. Sus valores a baja temperatura (g\*s = 3,931, g\*ρ = 3,383) corresponden a N_eff ≈ 3,045.
- **Ficheros**: `friedmann.ts` no existe; E(a) y H(a) viven en `cosmology.ts`. Se añaden `data/dofTable.ts` (datos, con `LICENSE-PTArcade` y `NOTICE.md`), `milestones.ts` (igualdades y aceleración) e `index.ts`.
- **Rejilla**: 128 nodos por unidad de ln a, desde ln a = −45 (T ≈ 1,5·10⁶ GeV, el techo de la tabla) hasta 0: 5761 nodos. La parte desde a = 0 se integra 60 e-folds más abajo. Con la rejilla acotada, a⁻⁴ ≤ 10⁷⁸ y no hace falta log-sum-exp.
- **Inversión t → a**: Newton sobre el mismo segmento de Hermite que da t(a), en lugar de una segunda tabla. La ida y vuelta es exacta hasta el redondeo (< 10⁻¹² en 10⁵ instantes).
- **Fixture de referencia**: `astropy.age(z)` pierde precisión por encima de z ≈ 1000 (1,4 % en z = 10⁴, un factor ~36 en z = 10⁵, con astropy 8.0.1). La fixture integra en ln a, con scipy, la E(z) del propio astropy, y la tolerancia es 10⁻⁹.
- **Tiempo de precálculo**: 49 ms en Node en el contenedor de desarrollo, por encima del objetivo de 30 ms en móvil. Se medirá en navegador al llegar la UI; si hace falta, 64 nodos por unidad de ln a mantienen la precisión muy por debajo de lo que se muestra.

Valores del modelo implementado (con g\*):

| Magnitud | Valor |
|---|---|
| Edad | 13,786 Gyr |
| Ω_Λ | 0,68881 |
| Radio de la región que hoy observamos | 46,19 Gal |
| t(z\* = 1089,80) | 371,8 kyr, T = 2973 K |
| z en t = 380 kyr | 1075,8 |
| z_eq, t_eq | 3403, 50,9 kyr |
| ρ_Λ = ρ_m | t = 10,23 Gyr, z = 0,303 |
| Inicio de la aceleración | t = 7,64 Gyr, z = 0,642 |
| t(z_re = 7,82) | 656,7 Myr |
| t(T = 10¹⁰ K) | 1,01 s (1,77 s con g\* constante) |
| t(T = 1 MeV) | 0,75 s |
| t(T = 0,1 MeV) | 119 s (132 s con g\* constante) |
| t(T = 156,5 MeV), cruce QCD | 1,9·10⁻⁵ s (5,4·10⁻⁵ s con g\* constante) |
| t(T = 159,5 GeV), cruce electrodébil | 9,4·10⁻¹² s (5,2·10⁻¹¹ s con g\* constante) |

### 7.1 Épocas y escala del control (feat/timeline)

- **Épocas** (`src/timeline/epochs.ts`): cada parada tiene un ancla, un intervalo opcional, un grado de evidencia (`observed`, `established-physics`, `model-dependent` o `speculative`) y sus fuentes. Los instantes se dan por su criterio (tiempo, temperatura, z o "hace X años") y `resolve.ts` los convierte con el modelo. Las anclas de inflación, edad oscura y primeras estrellas llevan la marca `illustrativeAnchor`, porque son una elección dentro de un intervalo y no un suceso; la interfaz tendrá que decirlo.
- **Hitos dentro de una época**: MoM-z14 (z = 14,44) y JADES-GS-z14-0 (z = 14,32) van como `landmarks` de primeras estrellas, no como paradas.
- **Escala** (`src/timeline/scale.ts`): el ancho de cada tramo es wᵢ = 0,4·Δᵢ/ΣΔ + 0,6/12, con Δᵢ en décadas. Así ningún tramo baja del 5 % y el 40 % del recorrido conserva la proporción logarítmica real. Posiciones de las paradas: Planck 0 %, inflación 9,8 %, quarks 31,2 %, hadrones 40,3 %, nucleosíntesis 49,8 %, recombinación 62,0 %, edad oscura 68,1 %, primeras estrellas 73,7 %, reionización 79,1 %, Vía Láctea 84,2 %, Sistema Solar 89,9 %, Tierra 94,9 %, hoy 100 %. Con log puro, el Sistema Solar estaría en el 99,71 %.
- **Niveles epistémicos**: las fronteras se fijan ahora como tiempos (t del cruce electrodébil y t de T = 1 MeV), de modo que un instante definido por la temperatura frontera cae siempre del lado conocido.
- **Textos de las épocas**: llegan con la i18n en `feat/ui`, con el test de que existen en ES y EN.

### 7.2 Interfaz (feat/ui)

- **Panel**: tiempo cósmico, "hace", época y valores del modelo. Distingue dos clasificaciones que no son la misma: el grado de evidencia de lo que ocurre en la época (`evidence` de `epochs.ts`) y el nivel epistémico de los valores en ese instante (`tierAt` del modelo). En la edad oscura, por ejemplo, los valores del fondo están contrastados, pero lo que ocurre no se ha observado. En el nivel especulativo el panel solo muestra el tiempo (D4).
- **Época de un instante**: la del último ancla anterior o igual al instante (`src/timeline/lookup.ts`), es decir, el tramo del control, no el intervalo, porque los intervalos se solapan.
- **Cifras**: tres cifras significativas en todos los valores (`src/ui/format.ts`); el modelo reproduce los valores publicados con un error menor del 1 %, así que una cuarta cifra prometería una precisión que no hay. Notación científica fuera de [10⁻³, 10⁶). Unidades por magnitud: s, min, h, días, años, millones y miles de millones de años; mm, m, km, ua y años luz. En español se usa "mil millones" (10⁹).
- **Textos**: `src/i18n/es.ts` es la fuente de claves y `en.ts` las satisface. Los tests comprueban las mismas claves y marcadores en ambos idiomas, que ningún texto contiene cifras (salvo nombres propios: Planck 2018, MoM-z14, JADES-GS-z14-0), que nunca aparece "tamaño del universo" y que la etiqueta de D5 es la aprobada. Idioma: `?lang=` si existe; si no, el primero de los del navegador que esté entre español e inglés; si ninguno, inglés.
- **Hoy**: el texto distingue "empezó a acelerarse" (q = 0) de "la energía oscura domina sobre la materia" (ρ_Λ = ρ_m), con los tiempos de `milestones.ts` (§2.4, D2).
- **Fuentes en pantalla**: cada época enlaza sus fuentes y el panel enlaza las del modelo, desde `src/timeline/sources.ts`. Un test comprueba que cada identificador y su enlace están en `fuentes.md`.
- **Control**: `role="slider"` con `aria-valuetext` ("372.000 años, Recombinación"), flechas para avance fino (Mayús para uno mayor), Re Pág y Av Pág para saltar de parada, Inicio y Fin. Arrastre con puntero y lista de paradas pulsable. La regla de escala real tiene una marca por potencia de diez en segundos. El recorrido empieza en la época de Planck. Los saltos entre paradas son instantáneos; las transiciones animadas, que son una licencia (ritmo), llegan con la escena.
- **Licencias**: `src/scene/visualMap.ts` registra `controlScale`, la única licencia de esta PR; la línea de licencias se genera desde ese registro y [`licencias-visuales.md`](licencias-visuales.md) la documenta.
- **Precálculo en navegador** (Chromium del contenedor de desarrollo, mediana de cinco cargas, medida `cosmic-timeline:model`): 38 ms sin limitar la CPU, 149 ms con la CPU limitada ×4 y 228 ms con ×6. Supera el objetivo de 30 ms en móvil medio (§2.4). Casi todo el coste (24 de 28 ms en Node) es evaluar g\*(T) en los puntos de cuadratura; con g\* constante el precálculo baja a 4 ms.

---

## 8. Alcance de la v1 y siguiente fase

La v1 se entrega en PRs secuenciales, revisables por separado:

1. **feat/physics**: scaffold mínimo, README, CLAUDE.md, `docs/` y `src/physics/` con sus tests. Sin UI ni three.js.
2. **feat/timeline**: épocas y escala del control, con sus tests.
3. **feat/ui**: control, panel, i18n ES/EN y línea de licencias. Sin escena.
4. **feat/scene**: escena de partículas.

**Siguiente fase** (fuera de la v1):

- Calidad adaptativa según los fps medidos. En la v1 la escena usa un nivel fijo y prudente.
- Estado en la URL (`?t=…`) para enlazar un instante.
- Imán en las paradas del control.
