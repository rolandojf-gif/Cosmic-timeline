// GLSL for the particle field. Every uniform is normalised or a small number
// (mediump-safe): the physics never reaches the GPU, only visualState().

export const VERTEX_SHADER = /* glsl */ `
precision mediump float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Side of the periodic box in world units; grows with the separation licence.
uniform float uBox;
// Radius beyond which particles fade out, so that the box never shows an edge.
uniform float uFadeRadius;
uniform float uStructure;
uniform float uStars;
uniform float uPointSize;

attribute vec3 position;
attribute vec3 aWeb;
attribute float aSeed;
attribute float aStar;

varying float vStar;
varying float vFade;
varying float vSeed;

void main() {
  // Blend from the uniform field to the web along the shortest periodic path (a
  // plain mix would pile particles up mid-cube), then wrap periodically around
  // the camera at the origin: every particle has copies in every direction.
  vec3 p = position + uStructure * (fract(aWeb - position + 0.5) - 0.5);
  vec3 world = (fract(p + 0.5) - 0.5) * uBox;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  float distance = length(world);
  vFade = 1.0 - smoothstep(0.55 * uFadeRadius, uFadeRadius, distance);
  vStar = aStar * uStars;
  vSeed = aSeed;

  float size = uPointSize * (0.6 + 0.8 * aSeed) * (1.0 + 1.5 * vStar);
  gl_PointSize = clamp(size / max(-mv.z, 0.05), 1.0, 3.0 * uPointSize);
  gl_Position = projectionMatrix * mv;
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

uniform vec3 uColour;
uniform float uGlow;
uniform float uHaze;
uniform float uGas;
uniform vec3 uStarColour;

varying float vStar;
varying float vFade;
varying float vSeed;

void main() {
  float r = length(gl_PointCoord - 0.5);
  float disc = 1.0 - smoothstep(0.15, 0.5, r);
  if (disc <= 0.0) discard;

  // Radiation light, dimmed inside the fog; faint grey gas; stars.
  vec3 light = uColour * uGlow * (1.0 - 0.5 * uHaze);
  vec3 gas = vec3(0.78, 0.8, 0.86) * uGas * (0.6 + 0.8 * vSeed);
  vec3 star = uStarColour * vStar * (1.0 + 0.8 * vSeed);
  vec3 colour = light * (0.5 + vSeed) + gas + star;

  gl_FragColor = vec4(colour * disc * vFade, 1.0);
}
`;
