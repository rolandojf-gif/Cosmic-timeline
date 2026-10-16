# GPU bottleneck diagnosis — opt-in only

This branch is **measurement-only**. It starts from the exact approved
cinematic production tree before PR #18 and does not modify particles, the
plasma shader, post-processing resolution, halo geometry, bloom or FPS caps.

The scene's exact visual output is unchanged with no query arguments.
The diagnostic view is activated only with `?gpuDiag=1`. It displays:

- **GPU frame time**, when `EXT_disjoint_timer_query_webgl2` is available,
  using **asynchronous queries** that do not block the GPU.
- **CPU submit time**, which is the time JavaScript spends calling
  `composer.render()` (it is **not** the GPU time).
- The existing 30 FPS cap and internal DPR.

A GPU timer is not guaranteed on all systems; if unavailable, the overlay
clearly says so. Windows Task Manager GPU percentage is global system GPU
usage, not an isolated WebGL frame measurement.

## Controlled A/B on the affected Windows laptop

Use a single tab at a time, same viewport, same timeline epoch, speed, and
background programs. Do not leave other comparison tabs open. Wait for
the cosmic web Worker to complete before recording timings. With
`?gpuDiag=1` only, the image is the original approved cinematic scene.

| URL query | Result |
| --- | --- |
| `?fps&gpuDiag=1` | All original visual passes (baseline) |
| `?fps&gpuDiag=1&gpuSkip=plasma` | **Hide background volume** (deliberate visible difference) |
| `?fps&gpuDiag=1&gpuSkip=matter` | **Hide matter particle field** (deliberate visible difference) |
| `?fps&gpuDiag=1&gpuSkip=halos` | **Hide glow halos** (deliberate visible difference) |
| `?fps&gpuDiag=1&gpuSkip=bloom` | **Disable bloom** (deliberate visible difference) |
| `?fps&gpuDiag=1&gpuSkip=galaxies` | **Hide bright galaxies** (deliberate visible difference) |

**Important:** the skip views are **not design proposals**. The only reason
they exist is to estimate how costly each layer is. Do NOT merge any pass
suppression into the normal experience.

Recommended sampling: in **First Stars** or **Milky Way**, play ~10 seconds,
record GPU frame milliseconds (if available), FPS and the Windows GPU %.
Repeat baseline, no halos, no matter, no bloom, no plasma. A large change
in frame milliseconds when one pass is hidden suggests a bottleneck in
that pass. CPU submit time cannot substitute for GPU time. The difference
need not equal the isolated pass cost because GPU scheduling and bloom
interact with scene brightness.

In a settled pause the normal renderer sleeps and both its GPU load
and the debug timer should stop updating; this is expected. To measure
continuous rendering, use Play.

Do not make any user-visible quality modifications until we have data.
