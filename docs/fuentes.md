# Fuentes

Lista de referencia del proyecto. Cada fuente tiene un identificador estable que el código y las épocas citan. Todas se comprobaron (DOI, revista, volumen y página) el 2026-10-03.

Una fuente nueva entra aquí antes de usarse en el código, con su DOI o identificador de arXiv y lo que se toma de ella.

## Modelo cosmológico

### `planck2018-vi`
Planck Collaboration (2020). Planck 2018 results. VI. Cosmological parameters. *Astronomy & Astrophysics* 641, A6. [doi:10.1051/0004-6361/201833910](https://doi.org/10.1051/0004-6361/201833910) · [arXiv:1807.06209](https://arxiv.org/abs/1807.06209)

Se usa la Tabla 2, última columna (TT,TE,EE+lowE+lensing+BAO): H₀ = 67,66 ± 0,42 km s⁻¹ Mpc⁻¹; Ω_m = 0,3111 ± 0,0056; Ω_b h² = 0,02242 ± 0,00014; n_s = 0,9665 ± 0,0038; σ₈ = 0,8102 ± 0,0060 (entradas del modelo y de la red cósmica). Valores con los que se contrasta el modelo: Ω_Λ = 0,6889 ± 0,0056; edad 13,787 ± 0,020 Gyr; z\* = 1089,80 ± 0,21; z_eq = 3387 ± 21; z_re = 7,82 ± 0,71.

### `fixsen2009`
Fixsen, D. J. (2009). The temperature of the cosmic microwave background. *The Astrophysical Journal* 707, 916–920. [doi:10.1088/0004-637X/707/2/916](https://doi.org/10.1088/0004-637X/707/2/916)

T_CMB,0 = 2,7255 K.

### `saikawa-shirai-2020`
Saikawa, K. y Shirai, S. (2020). Precise WIMP dark matter abundance and Standard Model thermodynamics. *Journal of Cosmology and Astroparticle Physics* 08 (2020) 011. [doi:10.1088/1475-7516/2020/08/011](https://doi.org/10.1088/1475-7516/2020/08/011) · [arXiv:2005.03544](https://arxiv.org/abs/2005.03544)

Tabla de g\*ρ(T) y g\*s(T) del Modelo Estándar (`src/physics/data/dofTable.ts`). Los datos son obra de Saikawa y Shirai (2020) y se atribuyen a ellos en el código, en este fichero y en `src/physics/data/NOTICE.md`. Actualiza la de Saikawa y Shirai (2018), *JCAP* 05 (2018) 035, [doi:10.1088/1475-7516/2018/05/035](https://doi.org/10.1088/1475-7516/2018/05/035).

Procedencia de los datos: transcritos sin cambios de `ptarcade/data/g_star.dat` en el paquete PTArcade 1.1.5 ([PyPI](https://pypi.org/project/ptarcade/)), que los atribuye a Saikawa y Shirai (2020). PTArcade es Copyright (c) 2023 Andrea Mitridate, licencia MIT; el aviso y el texto de la licencia están en `src/physics/data/LICENSE-PTArcade`. La tabla original está en la [página de S. Shirai](https://member.ipmu.jp/satoshi.shirai/EOS2018.php).

### `astropy`
Astropy Collaboration. `astropy.cosmology.FlatLambdaCDM`, versión 8.0.1. Implementación independiente usada como referencia numérica en `tests/fixtures/astropy-reference.json` (ver `scripts/gen-reference.py`).

## Física de partículas y universo temprano

### `donofrio-rummukainen-2016`
D'Onofrio, M. y Rummukainen, K. (2016). Standard Model cross-over on the lattice. *Physical Review D* 93, 025003. [doi:10.1103/PhysRevD.93.025003](https://doi.org/10.1103/PhysRevD.93.025003) · [arXiv:1508.07161](https://arxiv.org/abs/1508.07161)

Temperatura del cruce electrodébil: T_c = 159,5 ± 1,5 GeV. Frontera entre los niveles "especulativo" y "física conocida".

### `hotqcd-2019`
HotQCD Collaboration, Bazavov, A. et al. (2019). Chiral crossover in QCD at zero and non-zero chemical potentials. *Physics Letters B* 795, 15–21. [doi:10.1016/j.physletb.2019.05.013](https://doi.org/10.1016/j.physletb.2019.05.013) · [arXiv:1812.08235](https://arxiv.org/abs/1812.08235)

Temperatura del cruce QCD: T_c = 156,5 ± 1,5 MeV.

### `pdg-bbn-2025`
Fields, B. D., Molaro, P. y Sarkar, S. Big-Bang Nucleosynthesis. En Particle Data Group, *Review of Particle Physics* (2025). [PDF](https://pdg.lbl.gov/2025/reviews/rpp2025-rev-bbang-nucleosynthesis.pdf)

Desacoplamiento neutrón-protón a T ~ 1 MeV (frontera del nivel "observado"); los núcleos empiezan a formarse a T ≈ 0,1 MeV; abundancias fijadas hacia t ~ 180 s.

### `planck2018-x`
Planck Collaboration (2020). Planck 2018 results. X. Constraints on inflation. *Astronomy & Astrophysics* 641, A10. [doi:10.1051/0004-6361/201833887](https://doi.org/10.1051/0004-6361/201833887) · [arXiv:1807.06211](https://arxiv.org/abs/1807.06211)

### `bicep-keck-2021`
BICEP/Keck Collaboration, Ade, P. A. R. et al. (2021). Improved constraints on primordial gravitational waves using Planck, WMAP, and BICEP/Keck observations through the 2018 observing season. *Physical Review Letters* 127, 151301. [doi:10.1103/PhysRevLett.127.151301](https://doi.org/10.1103/PhysRevLett.127.151301) · [arXiv:2110.00483](https://arxiv.org/abs/2110.00483)

r₀.₀₅ < 0,036 (95 %): cota superior de la escala de energía de la inflación.

## Astrofísica

### `bromm2013`
Bromm, V. (2013). Formation of the first stars. *Reports on Progress in Physics* 76, 112901. [doi:10.1088/0034-4885/76/11/112901](https://doi.org/10.1088/0034-4885/76/11/112901) · [arXiv:1305.5178](https://arxiv.org/abs/1305.5178)

Primeras estrellas en minihalos que colapsan a z ≈ 20–30.

### `carniani2024`
Carniani, S. et al. (2024). Spectroscopic confirmation of two luminous galaxies at a redshift of 14. *Nature* 633, 318–322. [doi:10.1038/s41586-024-07860-9](https://doi.org/10.1038/s41586-024-07860-9)

### `naidu2026`
Naidu, R. P. et al. (2026). A Cosmic Miracle: A Remarkably Luminous Galaxy at z_spec = 14.44 Confirmed with JWST. *The Open Journal of Astrophysics* 9. [arXiv:2505.11263](https://arxiv.org/abs/2505.11263)

MoM-z14, galaxia más lejana confirmada espectroscópicamente a fecha de 2026-10-03.

### `bosman2022`
Bosman, S. E. I. et al. (2022). Hydrogen reionization ends by z = 5.3: Lyman-α optical depth measured by the XQR-30 sample. *Monthly Notices of the Royal Astronomical Society* 514, 55–76. [doi:10.1093/mnras/stac1046](https://doi.org/10.1093/mnras/stac1046) · [arXiv:2108.03699](https://arxiv.org/abs/2108.03699)

### `xiang-rix-2022`
Xiang, M. y Rix, H.-W. (2022). A time-resolved picture of our Milky Way's early formation history. *Nature* 603, 599–603. [doi:10.1038/s41586-022-04496-5](https://doi.org/10.1038/s41586-022-04496-5)

El disco grueso empieza a formarse hace ≈ 13 Gyr, 0,8 Gyr después del Big Bang.

### `connelly2012`
Connelly, J. N. et al. (2012). The absolute chronology and thermal processing of solids in the solar protoplanetary disk. *Science* 338 (6107), 651–655. [doi:10.1126/science.1226919](https://doi.org/10.1126/science.1226919)

Edad de los CAI: 4567,30 ± 0,16 Myr. Hay determinaciones posteriores algo más antiguas (≈ 4568 Myr); la diferencia es irrelevante a la escala del proyecto.

### `dalrymple2001`
Dalrymple, G. B. (2001). The age of the Earth in the twentieth century: a problem (mostly) solved. *Geological Society, London, Special Publications* 190, 205–221. [doi:10.1144/GSL.SP.2001.190.01.14](https://doi.org/10.1144/GSL.SP.2001.190.01.14)

Edad de la Tierra: 4,54 ± 0,05 Gyr.

## Estructura a gran escala y red cósmica

### `heath1977`
Heath, D. J. (1977). The growth of density perturbations in zero pressure cosmologies. *Monthly Notices of the Royal Astronomical Society* 179, 351–358. [doi:10.1093/mnras/179.3.351](https://doi.org/10.1093/mnras/179.3.351)

Integral del factor de crecimiento lineal D(a) en cosmologías con materia y constante cosmológica (`src/physics/growth.ts`).

### `eisenstein-hu-1998`
Eisenstein, D. J. y Hu, W. (1998). Baryonic features in the matter transfer function. *The Astrophysical Journal* 496, 605–614. [doi:10.1086/305342](https://doi.org/10.1086/305342) · [arXiv:astro-ph/9709112](https://arxiv.org/abs/astro-ph/9709112)

Función de transferencia de materia sin oscilaciones («no-wiggle», ecuaciones 26, 28–31) para el espectro de potencia lineal P(k) (`src/scene/cosmicWeb.ts`).

### `zeldovich1970`
Zel'dovich, Ya. B. (1970). Gravitational instability: an approximate theory for large density perturbations. *Astronomy and Astrophysics* 5, 84–89. [ADS](https://ui.adsabs.harvard.edu/abs/1970A%26A.....5...84Z)

Aproximación cinemática de Zel'dovich para el desplazamiento de partículas y clasificación de estructuras (vacíos, hojas, filamentos, nudos) a partir de los autovalores del tensor de deformación.

### `coles-1993`
Coles, P., Melott, A. L. y Shandarin, S. F. (1993). Testing approximations for non-linear gravitational clustering. *Monthly Notices of the Royal Astronomical Society* 260, 765–776. [doi:10.1093/mnras/260.4.765](https://doi.org/10.1093/mnras/260.4.765)

Aproximación truncada de Zel'dovich (TZA): filtrado gaussiano del campo de densidad en la escala no lineal para evitar el cruce excesivo de trayectorias en filamentos y nudos.

## Referencias de comparación

Valores que la interfaz usa solo para traducir cifras del modelo a términos cotidianos (cocientes como "116.000 veces la temperatura del centro del Sol"). Viven en `src/physics/references.ts`.

### `si-brochure-2019`
Bureau International des Poids et Mesures (2019). *The International System of Units (SI)*, 9.ª ed. [bipm.org](https://www.bipm.org/en/publications/si-brochure)

Definición del grado Celsius: t/°C = T/K − 273,15. Valor definido, no medido.

### `iau-2015-b3`
Prša, A. et al. (2016). Nominal values for selected solar and planetary quantities: IAU 2015 Resolution B3. *The Astronomical Journal* 152, 41. [doi:10.3847/0004-6256/152/2/41](https://doi.org/10.3847/0004-6256/152/2/41) · [arXiv:1605.09788](https://arxiv.org/abs/1605.09788)

Temperatura efectiva nominal del Sol: 5772 K (Tabla 1); mejor estimación medida, 5772,0 ± 0,8 K.

### `bahcall-2001`
Bahcall, J. N., Pinsonneault, M. H. y Basu, S. (2001). Solar models: current epoch and time dependences, neutrinos, and helioseismological properties. *The Astrophysical Journal* 555, 990–1012. [doi:10.1086/321493](https://doi.org/10.1086/321493) · [arXiv:astro-ph/0010346](https://arxiv.org/abs/astro-ph/0010346)

Temperatura central del Sol actual en el modelo solar estándar: 15,696 × 10⁶ K (Tabla 5). Es un valor calculado por un modelo, no medido. Coincide con la ficha del Sol de la NASA (1,571 × 10⁷ K, [NSSDC](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html)). La versión de texto del PDF de arXiv muestra mal la unidad de la tabla; el valor se comprobó con ambas fuentes.

## Color de la escena

El color de la escena es el de un cuerpo negro a la temperatura del modelo (`src/scene/blackbody.ts`). Estas fuentes fijan cómo se calcula ese color; qué se hace con él es una licencia visual ([`licencias-visuales.md`](licencias-visuales.md)).

### `cie-015-2018`
CIE (2018). *CIE 015:2018 Colorimetry*, 4.ª ed. Commission Internationale de l'Éclairage. [doi:10.25039/TR.015.2018](https://doi.org/10.25039/TR.015.2018)

Funciones de igualación de color del observador patrón CIE 1931 (2°). Valores de tabla usados en los tests: ȳ(555 nm) = 1,0000; x̄(600 nm) = 1,0622; z̄(450 nm) = 1,7471. Iluminante A: radiador de Planck a unos 2856 K, cromaticidad x = 0,44757, y = 0,40745.

### `wyman2013`
Wyman, C., Sloan, P.-P. y Shirley, P. (2013). Simple analytic approximations to the CIE XYZ color matching functions. *Journal of Computer Graphics Techniques* 2(2), 1–11. [jcgt.org](https://jcgt.org/published/0002/02/01/)

Ajuste por lóbulos gaussianos de las funciones CIE 1931 (ecuación 4, tabla 1). Es una aproximación: se separa de la tabla hasta un ~2 % en los picos; la cromaticidad de cuerpo negro resultante se separa menos de 0,002 del iluminante A.

### `css-color-4`
W3C. *CSS Color Module Level 4* (Candidate Recommendation), código de ejemplo de conversiones. [w3.org/TR/css-color-4](https://www.w3.org/TR/css-color-4/)

Matriz XYZ (D65) → sRGB lineal en forma racional exacta y función de transferencia sRGB, ambas de IEC 61966-2-1:1999.

### `draper1847`
Draper, J. W. (1847). On the production of light by heat. *The London, Edinburgh, and Dublin Philosophical Magazine and Journal of Science* 30(202), 345–360. [doi:10.1080/14786444708647190](https://doi.org/10.1080/14786444708647190)

Punto de Draper: unos 977 °F (525 °C, 798 K), temperatura a partir de la cual un cuerpo caliente empieza a brillar de forma visible. Por debajo, su radiación es casi toda infrarroja. La referencia se comprobó en Crossref; la cifra se tomó de fuentes secundarias, sin cotejarla con el facsímil original.

## Constantes y unidades

### `codata2018`
Tiesinga, E. et al. (2021). CODATA recommended values of the fundamental physical constants: 2018. *Reviews of Modern Physics* 93, 025010. [doi:10.1103/RevModPhys.93.025010](https://doi.org/10.1103/RevModPhys.93.025010)

c, G, σ, k_B, h y tiempo de Planck (5,391247·10⁻⁴⁴ s). h y k_B son exactos en el SI de 2019; de ellos sale la segunda constante de radiación c₂ = hc/k = 1,438776877·10⁻² m·K.

### `iau-units`
Unión Astronómica Internacional: unidad astronómica exacta de 149 597 870 700 m (Resolución B2, 2012); pársec de 648000/π au (Resolución B2, 2015); año juliano de 365,25 días para el año luz.
