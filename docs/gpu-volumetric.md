# GPU optimisation: volumetric fill-rate (PR candidate)

## What changed
The previous 30-FPS cap keeps the GPU asleep during a settled pause, but cannot
control the cost of one extremely expensive frame.

In the primordial and hot-plasma phases, the main background fragment shader
performs **28 ray-marching samples per output pixel**, each including several
filtered 3D texture lookups. On high-DPI screens that is very costly.

This version keeps the *same* 28 samples, 3D-noise field, colours, physics,
post-processing bloom, particle counts and galaxy geometry. Two GPU-only
optimisations are introduced:

1. Render the volumetric background into a **separate HalfFloat HDR texture**
   at **70% linear resolution** and upscale with linear sampling. This samples
   49% as many background pixels, without downscaling the foreground particles,
   the final bloom or the colour-grading passes. Only the naturally soft plasma
   may appear marginally softer; HDR radiance is not clipped.
2. Skip drawing **invisible** objects: matter and halo clouds while gasLevel is
   zero, galaxies before they become visible, and the volumetric background
   when both its haze and CMB contributions are zero. No point geometry is
   reduced. All layers resume at their original density and brightness.

For A/B, load `?fps&plasmaScale=1` to render the plasma at full resolution
through the same HDR path, or use `?fps&plasmaScale=0.5` for the stronger
low-load variant. The default is `?fps&plasmaScale=0.7`. Query values other
than 0.5 / 0.7 / 0.85 / 1 revert to the default.

## User-visible validation required
- Compare the **primordial plasma**, reheating, quarks, recombination and
  early cosmic web with production in the same viewport, one browser tab at a
  time. Plasma structure, colours, brightness and haze must remain acceptable.
- Inspect Windows Task Manager's **GPU 0** while playing, holding a milestone
  and after a settled pause. Check that a paused scene reports 0 FPS; if not,
  investigate the playback state and the rest of the browser processes.
- Compare `?plasmaScale=0.5`, `0.7` and `1` to establish the appropriate
  laptop budget. Performance gains are expected but are **not measured** here.
- Check small mobile viewport and desktop, including redrawing after a resize.
- The benchmark 96% GPU reported in a screenshot is an observed machine-level
  value, **not proof the whole usage belongs to this one browser tab**.
- Do not merge into `main` until a real-device visual and GPU-use check.
