// GLSL3 shaders for the 5-regime scene architecture.
// All shaders run in mediump/highp with normalized or logarithmic uniforms.

export const BACKGROUND_VERTEX_SHADER = /* glsl */ `
  uniform mat4 uCamera;
  uniform mat4 uProjInv;
  out vec3 vDir;
  void main() {
    vec4 view = uProjInv * vec4(position.xy, 1.0, 1.0);
    vDir = mat3(uCamera) * (view.xyz / view.w);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const BACKGROUND_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform vec3 uOrigin;
  uniform float uTime, uHaze, uIntensity, uTurbulence, uCmbLevel, uLow, uHigh, uSigma, uEmit, uStretch, uClump;
  uniform vec3 uColour, uCmbHot, uCmbCold;
  in vec3 vDir;
  out vec4 fragColour;

  float n3(vec3 p) { return texture(uNoise, p).r; }

  // Turbulent density: domain-warped, ridged noise (filaments of hot
  // plasma); finer, more contorted and faster when hotter.
  float density(vec3 p, float t) {
    float f = mix(0.45, 1.5, uTurbulence);
    vec3 q = p * f;
    // Anisotropic hyperluminal metric stretching during cosmic inflation
    if (uStretch > 0.001) {
      float sFactor = 1.0 + uStretch * 6.5;
      q = vec3(q.x * sFactor, q.y * sFactor, q.z / sFactor);
    }
    // Calm, majestic fluid animation speed (no frantic boiling / static noise)
    float speed = mix(0.003, 0.014, uTurbulence);
    vec3 warp = vec3(
      n3(q * 0.4 + vec3(0.0, 0.0, t * speed)),
      n3(q * 0.4 + vec3(0.31, t * speed, 0.17)),
      n3(q * 0.4 + vec3(t * speed, 0.53, 0.71))
    );
    q += (warp - 0.5) * mix(0.5, 1.6, uTurbulence);
    float a = n3(q);
    float b = n3(q * 2.3 + 0.37);
    float c = n3(q * 5.3 + 0.11);
    float ridge = 1.0 - abs(2.0 * b - 1.0);
    float r3 = ridge * ridge * ridge * uTurbulence;
    float d = a * (0.9 - 0.4 * uTurbulence) + r3 * 0.4 + c * 0.1;
    // Nucleon confinement across hadron epoch: fluid breaks into discrete, dense globules
    if (uClump > 0.001) {
      float globules = smoothstep(0.44, 0.72, b) * 1.35;
      d = mix(d, globules, uClump * 0.75);
    }
    return smoothstep(uLow, uHigh, d);
  }

  // Microwave-background pattern on the sky: blobs of about a degree
  // (first acoustic peak) with finer structure; contrast exaggerated.
  float cmb(vec3 dir) {
    vec3 p = dir * 2.0;
    float v = (n3(p) - 0.5) * 0.5 + (n3(p * 2.7 + 0.2) - 0.5) * 0.6 + (n3(p * 6.3 + 0.7) - 0.5) * 0.3 + (n3(p * 14.0 + 0.4) - 0.5) * 0.12;
    return clamp(v * 2.6, -1.0, 1.0);
  }

  void main() {
    vec3 dir = normalize(vDir);
    vec3 colour = vec3(0.0);
    float transmittance = 1.0;
    if (uHaze > 0.001) {
      // March into the opaque plasma; it never ends, so what remains of the
      // ray sees more of the same glow.
      float s = 0.02;
      for (int i = 0; i < 28; i++) {
        vec3 p = uOrigin + dir * s;
        float d = density(p, uTime);
        float sigma = mix(0.05, 2.0, d) * uHaze * uSigma;
        float ds = 0.015 + s * 0.15;
        vec3 deep = uColour * 0.3;
        vec3 hot = mix(uColour, vec3(1.0), 0.6);
        vec3 emission = mix(mix(deep, uColour, smoothstep(0.0, 0.6, d)), hot, smoothstep(0.6, 1.0, d)) * (0.12 + uEmit * d * d * d);
        // Reheating: incandescent volumetric flash ignites the entire volume at once
        if (uIntensity > 1.0) {
          float flare = (uIntensity - 1.0) * 4.0;
          emission += vec3(1.0, 0.98, 0.91) * flare * (0.5 + 0.5 * d);
        }
        // Near recombination the plasma is calm: what remains are the hotter
        // and colder regions of the microwave-background pattern.
        float calm = 1.0 - smoothstep(0.0, 0.12, uTurbulence);
        // While fully opaque the glow is almost uniform; the pattern emerges as
        // the fog clears.
        float emerge = 1.0 - uHaze * uHaze;
        vec3 cmbPatch = mix(mix(uCmbCold, uCmbHot, 0.5) * 0.9, mix(uCmbCold * 0.4, uCmbHot * 1.5, d) * (0.15 + 1.6 * d * d), emerge);
        emission = mix(emission, cmbPatch, calm);
        float absorbed = 1.0 - exp(-sigma * ds * 6.0);
        colour += transmittance * absorbed * emission;
        transmittance *= 1.0 - absorbed;
        s += ds;
      }
      colour += transmittance * uColour * 0.15;
      colour *= uIntensity * uHaze;
      transmittance = 1.0 - uHaze;
    }
    if (uCmbLevel > 0.0) {
      float c = cmb(dir);
      float hotness = smoothstep(-0.7, 0.9, c);
      vec3 sky = mix(uCmbCold * 0.5, uCmbHot * 1.4, hotness) * (0.12 + 1.6 * hotness * hotness);
      colour += sky * uCmbLevel * 1.4;
    }
    fragColour = vec4(colour, 1.0);
  }
`;

export const MATTER_VERTEX_SHADER = /* glsl */ `
  uniform int uN;
  uniform float uD, uBox, uPsiScale, uLambdaScale, uGas, uGain, uProj, uPointScale, uHalo;
  uniform vec3 uCam;
  in vec3 aLambda;
  out float vBright;
  out float vDense;
  void main() {
    int i = gl_VertexID;
    uint h = uint(i) * 747796405u + 2891336453u;
    h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
    vec3 jitter = vec3(float(h & 1023u), float((h >> 10u) & 1023u), float((h >> 20u) & 1023u)) / 1023.0;
    vec3 q = (vec3(float(i % uN), float((i / uN) % uN), float(i / (uN * uN))) + jitter) / float(uN);
    vec3 x = q + uD * position * uPsiScale;
    vec3 rel = (fract(x - uCam + 0.5) - 0.5) * uBox;
    vec3 l = aLambda * uLambdaScale;
    float f = (1.0 - uD * l.x) * (1.0 - uD * l.y) * (1.0 - uD * l.z);
    float rho = min(1.0 / max(abs(f), 0.03), 30.0);
    float shown = max(0.0, 1.0 + uGain * (rho - 1.0));
    float r = length(rel);
    float fade = 1.0 - smoothstep(0.32 * uBox, 0.48 * uBox, r);
    vec4 mv = modelViewMatrix * vec4(rel, 1.0);
    vBright = uGas * fade * pow(shown, 1.35) * smoothstep(0.5, 4.0, r);
    vDense = clamp(log(rho) / log(30.0), 0.0, 1.0);
    // Points carry a fixed flux whatever their size: early on they are large
    // and soft, so the gas reads as a medium rather than grains (licence).
    float soft = 1.0 - smoothstep(0.05, 0.4, uD);
    float size = clamp((0.6 + 2.5 * soft) * uProj / max(-mv.z, 0.1), 2.0 + 3.0 * soft, 4.0 + 10.0 * soft) * uPointScale;
    // Halo layer: one particle in eight, drawn large and faint, so that
    // filaments read as continuous glowing gas.
    if (uHalo > 0.0) {
      size *= 5.0;
      if (i % 8 != 0) size = 0.0;
      vBright *= 8.0 * uHalo;
    }
    gl_PointSize = size;
    vBright *= 9.0 / max(size * size, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const MATTER_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  in float vBright;
  in float vDense;
  out vec4 fragColour;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float disc = exp(-dot(c, c) * 16.0) * (1.0 - smoothstep(0.4, 0.5, length(c)));
    vec3 gas = vec3(0.28, 0.30, 0.75);
    vec3 mid = vec3(0.75, 0.45, 0.95);
    vec3 dense = vec3(1.0, 0.78, 0.55);
    vec3 colour = mix(mix(gas, mid, smoothstep(0.0, 0.45, vDense)), dense, smoothstep(0.45, 1.0, vDense)) * mix(0.05, 0.02, vDense);
    fragColour = vec4(colour * vBright * disc, 1.0);
  }
`;

export const GALAXIES_VERTEX_SHADER = /* glsl */ `
  uniform float uD, uBoost, uBox, uProj, uVisible, uDFirst;
  uniform vec3 uCam;
  in vec3 aPsi;
  in vec4 aData;
  out float vAge;
  out float vSeed;
  out float vKind;
  out float vMember;
  out float vFade;
  void main() {
    float growthRatio = uD * aData.x * uBoost / 1.686;
    vAge = log(max(growthRatio, 1e-6));
    vSeed = aData.z;
    vKind = aData.w;
    vMember = aData.y;
    vec3 x = position + uD * aPsi;
    vec3 rel = (fract(x - uCam + 0.5) - 0.5) * uBox;
    vec4 mv = modelViewMatrix * vec4(rel, 1.0);
    float r = length(rel);
    vFade = (1.0 - smoothstep(0.32 * uBox, 0.48 * uBox, r)) * uVisible;
    // Members of groups and clusters gather only once their peak is old.
    float memberOn = vMember > 0.5 ? smoothstep(1.4, 2.4, vAge) : 1.0;
    float lit = step(0.0, vAge) * memberOn;
    // Size: a young starburst is a point; galaxies grow with age (licence).
    float size = mix(0.9, 0.55 + 1.1 * vSeed, smoothstep(0.3, 1.6, vAge));
    if (vMember > 0.5) size *= 0.6;
    gl_PointSize = lit > 0.0 ? clamp(size * uProj / max(-mv.z, 0.1), 2.0, 96.0) : 0.0;
    gl_Position = projectionMatrix * mv;
  }
`;

export const GALAXIES_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  in float vAge;
  in float vSeed;
  in float vKind;
  in float vMember;
  in float vFade;
  out vec4 fragColour;
  void main() {
    vec2 c = (gl_PointCoord - 0.5) * 2.0;
    float young = 1.0 - smoothstep(0.3, 1.2, vAge);
    // Orientation and inclination per galaxy.
    float a = vSeed * 6.2831;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 p = rot * c;
    float incl = mix(0.25, 1.0, fract(vSeed * 7.13));
    p.y /= incl;
    float r = length(p);
    if (r > 1.0) discard;
    float theta = atan(p.y, p.x);
    vec3 colour;
    if (young > 0.5) {
      // First stars: a hot blue flash.
      float core = exp(-r * r * 30.0);
      colour = vec3(0.55, 0.7, 1.0) * (core * 9.0 + exp(-r * 6.0) * 0.6);
    } else {
      bool spiral = vKind < 0.62 && vMember < 0.5;
      float bulge = exp(-r * r * 60.0);
      float disk = exp(-r * 4.5);
      float body;
      vec3 tint;
      if (spiral) {
        float arms = 0.5 + 0.5 * cos(2.0 * (theta - log(r + 0.02) * 3.2) + vSeed * 9.0);
        body = disk * (0.35 + 0.9 * arms * smoothstep(0.05, 0.25, r));
        tint = mix(vec3(0.55, 0.68, 1.0), vec3(1.0, 0.9, 0.75), bulge);
      } else {
        body = exp(-pow(r, 0.6) * 5.5);
        tint = vec3(1.0, 0.86, 0.68);
      }
      // Older galaxies are redder (licence).
      tint = mix(tint, tint * vec3(1.0, 0.92, 0.8), smoothstep(1.5, 3.0, vAge));
      colour = tint * (body * 2.2 + bulge * 6.0);
    }
    fragColour = vec4(colour * vFade, 1.0);
  }
`;

export const GRADING_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const GRADING_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
  void main() {
    vec4 c = texture2D(tDiffuse, vUv);
    float vignette = mix(1.0, smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.4), 0.55);
    float grain = (hash(vUv * 1000.0) - 0.5) * 0.02;
    float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 graded = mix(vec3(luma), c.rgb, 1.2);
    gl_FragColor = vec4(graded * vignette + grain, 1.0);
  }
`;
