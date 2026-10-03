// The particles of the scene, generated once with a fixed seed. Pure.
//
// Each particle has two positions in the unit cube, which the scene treats as
// periodic (no edge, no centre): a uniform one, for the smooth early universe,
// and one on an illustrative cosmic web of filaments and knots, for the
// universe after the first stars (licence `structure`). The web position is
// near the uniform one (matter gathers locally), and the shader blends between
// them.

export interface Field {
  readonly count: number;
  /** Uniform positions in [0, 1)³, xyz interleaved. */
  readonly uniform: Float32Array;
  /** Positions on the illustrative web, in [0, 1)³, xyz interleaved. */
  readonly web: Float32Array;
  /** A random number in [0, 1) per particle, for size and brightness variety. */
  readonly seed: Float32Array;
  /** 1 for the particles that become stars, 0 for gas. */
  readonly star: Float32Array;
}

/** Share of particles that become stars once they switch on. */
export const STAR_FRACTION = 0.07;
/** Knots of the web, and filaments from each knot to its nearest neighbours. */
const KNOTS = 160;
const NEIGHBOURS = 3;
/** Share of particles along filaments and around knots; the rest stay in voids. */
const ON_FILAMENTS = 0.55;
const AROUND_KNOTS = 0.3;
const FILAMENT_WIDTH = 0.006;
const KNOT_WIDTH = 0.012;
/** Cells per axis of the grid that narrows the nearest-filament search. */
const GRID = 10;

/** Mulberry32: a small, fast, seeded PRNG. Deterministic across runs and machines. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** x mod 1, kept below 1 also after rounding to single precision. */
const wrap = (x: number): number => {
  const w = x - Math.floor(x);
  return Math.fround(w) >= 1 ? 0 : w;
};

/** Shortest periodic offset from a to b along one axis, in [−½, ½). */
const offset = (a: number, b: number): number => wrap(b - a + 0.5) - 0.5;

export function createField(count: number, seed = 1): Field {
  const rand = random(seed);
  const gauss = (): number => {
    // Box–Muller; 1 − rand() avoids log(0).
    const u = 1 - rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  const knots = Array.from({ length: KNOTS }, () => [rand(), rand(), rand()] as const);
  // Each knot joins its nearest neighbours; a pair found from both ends counts once.
  const edgeKeys = new Set<string>();
  const edges: (readonly [number, number])[] = [];
  knots.forEach((k, i) => {
    const nearest = knots
      .map((o, j) => ({ j, d: Math.hypot(offset(k[0], o[0]), offset(k[1], o[1]), offset(k[2], o[2])) }))
      .filter((n) => n.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, NEIGHBOURS);
    for (const { j } of nearest) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push([i, j]);
    }
  });

  // Edge vectors along the shortest periodic path, flattened for the search
  // below, which runs count × segments times and must not allocate.
  const SEGMENTS = edges.length;
  const start = new Float64Array(3 * SEGMENTS);
  const edge = new Float64Array(3 * SEGMENTS);
  const inverseLength2 = new Float64Array(SEGMENTS);
  edges.forEach(([a, b], s) => {
    const ka = knots[a]!;
    const kb = knots[b]!;
    for (let axis = 0; axis < 3; axis++) {
      start[3 * s + axis] = ka[axis]!;
      edge[3 * s + axis] = offset(ka[axis]!, kb[axis]!);
    }
    inverseLength2[s] = 1 / (edge[3 * s]! ** 2 + edge[3 * s + 1]! ** 2 + edge[3 * s + 2]! ** 2);
  });

  // Squared periodic distance from point (x, y, z) to segment s, and the
  // position t ∈ [0, 1] of the nearest point along it.
  let along = 0;
  const distance2 = (x: number, y: number, z: number, s: number): number => {
    // offset() inlined: this is the hot loop of the scene's start-up.
    let dx = x - start[3 * s]! + 0.5;
    let dy = y - start[3 * s + 1]! + 0.5;
    let dz = z - start[3 * s + 2]! + 0.5;
    dx -= Math.floor(dx) + 0.5;
    dy -= Math.floor(dy) + 0.5;
    dz -= Math.floor(dz) + 0.5;
    const ex = edge[3 * s]!;
    const ey = edge[3 * s + 1]!;
    const ez = edge[3 * s + 2]!;
    along = Math.min(1, Math.max(0, (dx * ex + dy * ey + dz * ez) * inverseLength2[s]!));
    const rx = dx - along * ex;
    const ry = dy - along * ey;
    const rz = dz - along * ez;
    return rx * rx + ry * ry + rz * rz;
  };

  // For each grid cell, the segments that can be nearest to some point in it.
  // A point within r (half the cell diagonal) of the centre is at distance
  // d_s ± r from segment s, d_s being the centre's distance, so only segments
  // with d_s ≤ min d + 2r qualify: the search stays exact, just shorter.
  const r2 = 2 * (Math.sqrt(3) / 2 / GRID);
  const candidates: Uint16Array[] = [];
  const centre = new Float64Array(SEGMENTS);
  for (let cell = 0; cell < GRID ** 3; cell++) {
    const cx = ((cell % GRID) + 0.5) / GRID;
    const cy = ((Math.floor(cell / GRID) % GRID) + 0.5) / GRID;
    const cz = (Math.floor(cell / GRID ** 2) + 0.5) / GRID;
    let nearest = Infinity;
    for (let s = 0; s < SEGMENTS; s++) {
      centre[s] = Math.sqrt(distance2(cx, cy, cz, s));
      nearest = Math.min(nearest, centre[s]!);
    }
    const list: number[] = [];
    for (let s = 0; s < SEGMENTS; s++) if (centre[s]! <= nearest + r2) list.push(s);
    candidates.push(Uint16Array.from(list));
  }
  const cellOf = (x: number): number => Math.min(GRID - 1, Math.floor(x * GRID));

  const uniform = new Float32Array(3 * count);
  const web = new Float32Array(3 * count);
  const seeds = new Float32Array(count);
  const star = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = [rand(), rand(), rand()] as const;
    for (let axis = 0; axis < 3; axis++) uniform[3 * i + axis] = p[axis]!;

    // Matter gathers locally: each particle moves to the nearest filament, or
    // to the knot at its nearer end, or stays in its void.
    let best = Infinity;
    let bestSegment = 0;
    let bestT = 0;
    for (const s of candidates[cellOf(p[0]) + GRID * cellOf(p[1]) + GRID * GRID * cellOf(p[2])]!) {
      const dist2 = distance2(p[0], p[1], p[2], s);
      // Ties go to the lower index, as in a search over every segment.
      if (dist2 < best || (dist2 === best && s < bestSegment)) {
        best = dist2;
        bestSegment = s;
        bestT = along;
      }
    }
    let point: [number, number, number] = [0, 1, 2].map(
      (axis) => start[3 * bestSegment + axis]! + bestT * edge[3 * bestSegment + axis]!,
    ) as [number, number, number];
    const nearKnot = [0, 1, 2].map(
      (axis) => start[3 * bestSegment + axis]! + (bestT < 0.5 ? 0 : edge[3 * bestSegment + axis]!),
    );
    const kind = rand();
    if (kind < ON_FILAMENTS) {
      point = [point[0] + FILAMENT_WIDTH * gauss(), point[1] + FILAMENT_WIDTH * gauss(), point[2] + FILAMENT_WIDTH * gauss()];
    } else if (kind < ON_FILAMENTS + AROUND_KNOTS) {
      // Wrapped next to the particle, so that it moves the short way to its knot.
      point = [0, 1, 2].map((axis) => p[axis]! + offset(p[axis]!, nearKnot[axis]!) + KNOT_WIDTH * gauss()) as [
        number,
        number,
        number,
      ];
    } else {
      point = [p[0], p[1], p[2]];
    }
    for (let axis = 0; axis < 3; axis++) web[3 * i + axis] = wrap(point[axis]!);

    seeds[i] = rand();
    star[i] = rand() < STAR_FRACTION ? 1 : 0;
  }

  return { count, uniform, web, seed: seeds, star };
}

/**
 * A viewing direction (unit vector) towards a well-populated part of the web,
 * for the camera (licence `camera`): of `candidates` directions spread evenly
 * over the sphere, the one whose cone holds the most web particles within
 * `radius` (in units of the cube side). The field is homogeneous on average, so
 * this only avoids starting the view inside a void.
 */
export function busiestDirection(field: Field, radius: number, halfAngle: number, candidates = 64): [number, number, number] {
  const cosHalf = Math.cos(halfAngle);
  const golden = Math.PI * (3 - Math.sqrt(5));
  // Unit vectors to the web particles within the radius, computed once.
  const near: number[] = [];
  for (let i = 0; i < field.count; i++) {
    const x = offset(0, field.web[3 * i]!);
    const y = offset(0, field.web[3 * i + 1]!);
    const z = offset(0, field.web[3 * i + 2]!);
    const d = Math.sqrt(x * x + y * y + z * z);
    if (d > 0 && d < radius) near.push(x / d, y / d, z / d);
  }
  let best: [number, number, number] = [0, 0, -1];
  let bestCount = -1;
  for (let c = 0; c < candidates; c++) {
    const y = 1 - (2 * (c + 0.5)) / candidates;
    const r = Math.sqrt(1 - y * y);
    const dir: [number, number, number] = [r * Math.cos(golden * c), y, r * Math.sin(golden * c)];
    let count = 0;
    for (let k = 0; k < near.length; k += 3) {
      if (near[k]! * dir[0] + near[k + 1]! * dir[1] + near[k + 2]! * dir[2] > cosHalf) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = dir;
    }
  }
  return best;
}

