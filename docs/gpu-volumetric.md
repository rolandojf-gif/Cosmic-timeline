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

## Post-recombination investigation (isolated A/B, NOT enabled by default)

The combined halo-indexing + DPR cap experiment was rejected because the
cosmic web lost its cinematic appearance. That configuration was removed.

The current diagnostic patch keeps the approved **full DPR, same matter
geometry, identical halo shader, original bloom and grading** on the
default preview. Every experimental change requires an explicit URL option:

| Query parameter | Change | Intended use |
| --- | --- | --- |
| `?fps` | Show FPS | Same approved image |
| `?fps&haloMode=indexed` | Submit only halo vertices originally visible (`gl_VertexID % 8 === 0`) | Test 1/8 vertex submissions while retaining original halo inputs and bloom |
| `?fps&gpuProbe=halos` | Hide halo pass | *Diagnostic only*: expect a visibly dimmer scene |
| `?fps&gpuProbe=bloom` | Skip bloom pass | *Diagnostic only*: expect much less glow |
| `?fps&gpuProbe=matter` | Hide the main full-density matter pass | *Diagnostic only*: expect much fewer points |
| `?fps&gpuProbe=galaxies` | Hide galaxy pass | *Diagnostic only* |

**Test sequence at the same fixed epoch (First Stars and Milky Way):**
close the previous tab before opening the next. First record normal GPU
%, FPS and appearance. Repeat with `haloMode=indexed`; if it still looks
identical and uses less GPU, that isolated optimisation can be considered.
If the GPU remains saturated, use `gpuProbe=halos` and
`gpuProbe=bloom` in turn (these **intentionally degrade the image**) to
identify which pass is expensive. Report separate GPU numbers. Avoid
drawing conclusions from GPU utilisation alone; it's the machine-wide
figure and is influenced by resolution, thermal limits, other apps and
browser composition.

**Do not deploy a degraded diagnostic configuration or alter the default
DPR/particles/bloom. Do not merge without the user's visual approval.**
