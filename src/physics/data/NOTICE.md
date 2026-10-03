# Datos de terceros

## `dofTable.ts`: grados de libertad efectivos del Modelo Estándar

- **Datos**: K. Saikawa y S. Shirai, *Precise WIMP dark matter abundance and Standard Model thermodynamics*, JCAP 08 (2020) 011, [doi:10.1088/1475-7516/2020/08/011](https://doi.org/10.1088/1475-7516/2020/08/011), [arXiv:2005.03544](https://arxiv.org/abs/2005.03544).
- **Copia de la que se transcribe**: `ptarcade/data/g_star.dat` del paquete [PTArcade](https://github.com/andrea-mitridate/PTArcade) 1.1.5, idéntico en la wheel y en el sdist de PyPI.
- **Licencia de PTArcade**: MIT, Copyright (c) 2023 Andrea Mitridate. Texto completo en [`LICENSE-PTArcade`](LICENSE-PTArcade), copiado sin cambios del repositorio de PTArcade.
- **Transformación**: se conservan las columnas T [GeV], g\*s y g\*ρ sin modificar ningún valor; se descarta la columna de frecuencia de ondas gravitacionales.

El aviso de licencia también va como comentario `@license` en `dofTable.ts`, de modo que se conserva en el bundle publicado.
