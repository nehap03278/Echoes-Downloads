/**
 * Plans a "hand-written" reveal of rendered text.
 *
 * Each piece of text is rasterised, thinned to a one-pixel centre-line, and that
 * centre-line is walked stroke by stroke the way a pen would draw it. Every ink
 * pixel is tied to the nearest point on the walk, so ink only appears where the
 * nib has actually been. The same walk (smoothed, timed with slower curves and
 * eased stroke ends, with small lifts between strokes) drives the pen.
 */

export type PenPoint = {
  /** Nib position in px, relative to the paper's centre. */
  x: number;
  y: number;
  /** Milliseconds from the start of the writing timeline. */
  t: number;
  /** false = pen is lifted and travelling to the next stroke. */
  draw: boolean;
  /** Range in InkPlan.pix/val that becomes visible when the nib reaches this point. */
  ps: number;
  pe: number;
};

export type InkPlan = {
  cssW: number;
  cssH: number;
  pxW: number;
  pxH: number;
  pix: Int32Array;
  val: Uint32Array;
  points: PenPoint[];
};

export type InkPiece = {
  text: string;
  style: CSSStyleDeclaration;
  /** Viewport rect of the first..last glyph, measured with no ancestor transforms. */
  left: number;
  top: number;
  right: number;
  bottom: number;
  targetMs: number;
};

const N8: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

/** Zhang-Suen thinning over a foreground-pixel list (the outer ring must be empty). */
function thin(mask: Uint8Array, w: number): Uint8Array {
  const m = mask.slice();
  let list: number[] = [];
  for (let i = 0; i < m.length; i++) if (m[i]) list.push(i);
  const o = N8.map(([dx, dy]) => dy * w + dx);
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const del: number[] = [];
      for (const i of list) {
        const p2 = m[i + o[0]];
        const p3 = m[i + o[1]];
        const p4 = m[i + o[2]];
        const p5 = m[i + o[3]];
        const p6 = m[i + o[4]];
        const p7 = m[i + o[5]];
        const p8 = m[i + o[6]];
        const p9 = m[i + o[7]];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const a =
          (p2 === 0 && p3 === 1 ? 1 : 0) +
          (p3 === 0 && p4 === 1 ? 1 : 0) +
          (p4 === 0 && p5 === 1 ? 1 : 0) +
          (p5 === 0 && p6 === 1 ? 1 : 0) +
          (p6 === 0 && p7 === 1 ? 1 : 0) +
          (p7 === 0 && p8 === 1 ? 1 : 0) +
          (p8 === 0 && p9 === 1 ? 1 : 0) +
          (p9 === 0 && p2 === 1 ? 1 : 0);
        if (a !== 1) continue;
        if (pass === 0) {
          if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue;
        } else if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
        del.push(i);
      }
      if (del.length) {
        changed = true;
        for (const i of del) m[i] = 0;
        list = list.filter((i) => m[i]);
      }
    }
  }
  return m;
}

/** Removes short spurs (stubs hanging off a longer stroke) left behind by thinning. */
function prune(K: Uint8Array, offs: number[], maxLen: number): void {
  for (let pass = 0; pass < 2; pass++) {
    const ends: number[] = [];
    for (let i = 0; i < K.length; i++) {
      if (!K[i]) continue;
      let deg = 0;
      for (const o of offs) if (K[i + o]) deg++;
      if (deg === 1) ends.push(i);
    }
    for (const e of ends) {
      if (!K[e]) continue;
      const path = [e];
      let cur = e;
      for (;;) {
        let next = -1;
        let count = 0;
        for (const o of offs) {
          const n = cur + o;
          if (K[n] && !path.includes(n)) {
            next = n;
            count++;
          }
        }
        if (count !== 1) break;
        let deg = 0;
        for (const o of offs) if (K[next + o]) deg++;
        if (deg >= 3) {
          if (path.length <= maxLen) for (const q of path) K[q] = 0;
          break;
        }
        path.push(next);
        cur = next;
        if (path.length > maxLen) break;
      }
    }
  }
}

function packColor(cssColor: string): number {
  const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(cssColor);
  const r = m ? Number(m[1]) : 38;
  const g = m ? Number(m[2]) : 38;
  const b = m ? Number(m[3]) : 67;
  return (b << 16) | (g << 8) | r;
}

export function planInk(
  pieces: InkPiece[],
  wrap: { left: number; top: number; width: number; height: number },
  center: { x: number; y: number },
  margin: number,
  S: number,
): InkPlan | null {
  const cssW = wrap.width + 2 * margin;
  const cssH = wrap.height + 2 * margin;
  const pxW = Math.ceil(cssW * S);
  const pxH = Math.ceil(cssH * S);
  const pixOut: number[] = [];
  const valOut: number[] = [];
  const points: PenPoint[] = [];
  let t = 0;
  let last: { x: number; y: number } | null = null;

  for (const piece of pieces) {
    const fs = parseFloat(piece.style.fontSize);
    const pad = Math.min(margin, Math.ceil(fs * 0.3) + 2);
    const bw = Math.ceil((piece.right - piece.left + 2 * pad) * S) + 2;
    const bh = Math.ceil((piece.bottom - piece.top + 2 * pad) * S) + 2;

    const cv = document.createElement("canvas");
    cv.width = bw;
    cv.height = bh;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.font = `${piece.style.fontStyle} ${piece.style.fontWeight} ${fs * S}px ${piece.style.fontFamily}`;
    if (piece.style.letterSpacing !== "normal") {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${parseFloat(piece.style.letterSpacing) * S}px`;
    }
    ctx.textBaseline = "alphabetic";
    const ascent = ctx.measureText(piece.text).fontBoundingBoxAscent;
    ctx.fillStyle = "#000";
    ctx.fillText(piece.text, pad * S, pad * S + ascent);
    const rgba = ctx.getImageData(0, 0, bw, bh).data;

    const A = new Uint8Array(bw * bh);
    const B0 = new Uint8Array(bw * bh);
    for (let y = 1; y < bh - 1; y++) {
      for (let x = 1; x < bw - 1; x++) {
        const i = y * bw + x;
        A[i] = rgba[i * 4 + 3];
        B0[i] = A[i] >= 18 ? 1 : 0;
      }
    }
    // Hairline strokes are thinner than a pixel and break into dashes; a one-pixel
    // dilation keeps them joined so the centre-line stays one continuous stroke.
    const B = new Uint8Array(bw * bh);
    for (let y = 2; y < bh - 2; y++) {
      for (let x = 2; x < bw - 2; x++) {
        const i = y * bw + x;
        if (
          B0[i] ||
          B0[i - 1] ||
          B0[i + 1] ||
          B0[i - bw] ||
          B0[i + bw] ||
          B0[i - bw - 1] ||
          B0[i - bw + 1] ||
          B0[i + bw - 1] ||
          B0[i + bw + 1]
        ) {
          B[i] = 1;
        }
      }
    }
    const K = thin(B, bw);
    const offs = N8.map(([dx, dy]) => dy * bw + dx);
    prune(K, offs, Math.round(S * 2.5));
    const hop = 5 * S;

    // Connected pieces of centre-line, left to right.
    const seen = new Uint8Array(bw * bh);
    const comps: { px: number[]; minX: number }[] = [];
    for (let i = 0; i < K.length; i++) {
      if (!K[i] || seen[i]) continue;
      const stack = [i];
      seen[i] = 1;
      const px: number[] = [];
      while (stack.length) {
        const p = stack.pop() as number;
        px.push(p);
        for (const o of offs) {
          const nb = p + o;
          if (K[nb] && !seen[nb]) {
            seen[nb] = 1;
            stack.push(nb);
          }
        }
      }
      let minX = Infinity;
      for (const p of px) minX = Math.min(minX, p % bw);
      comps.push({ px, minX });
    }
    comps.sort((a, b) => a.minX - b.minX);

    // Walk a component like a pen: keep going straight, come back for side branches
    // later. A plain walk can start anywhere, so several starts are tried and the one
    // that reads most like left-to-right handwriting (least backtracking) wins.
    const visited = new Uint8Array(bw * bh);
    const xOf = (p: number) => p % bw;
    const yOf = (p: number) => (p / bw) | 0;
    const walk = (start: number) => {
      const order: number[] = [];
      const jump: boolean[] = [];
      const stack = [start];
      let cur = -1;
      let hist: number[] = [];
      while (stack.length) {
        let qi = stack.length - 1;
        if (cur >= 0) {
          let bd = Infinity;
          for (let z = stack.length - 1; z >= 0; z--) {
            if (visited[stack[z]]) continue;
            const d = Math.hypot(xOf(stack[z]) - xOf(cur), yOf(stack[z]) - yOf(cur));
            if (d < bd) {
              bd = d;
              qi = z;
            }
          }
        }
        const q = stack.splice(qi, 1)[0];
        if (visited[q]) continue;
        if (cur >= 0) {
          // A leftover of only a few pixels is thinning debris, not a stroke: drop it
          // (its ink is still revealed through the nearest visited pixel).
          const cluster = [q];
          const inCluster = new Set([q]);
          for (let h = 0; h < cluster.length && cluster.length < 10; h++) {
            for (const o of offs) {
              const nb = cluster[h] + o;
              if (K[nb] && !visited[nb] && !inCluster.has(nb)) {
                inCluster.add(nb);
                cluster.push(nb);
              }
            }
          }
          if (cluster.length < 10) {
            for (const c of cluster) visited[c] = 1;
            continue;
          }
        }
        const isJump = cur < 0 || Math.hypot(xOf(q) - xOf(cur), yOf(q) - yOf(cur)) > hop;
        if (isJump) hist = [];
        order.push(q);
        jump.push(isJump);
        visited[q] = 1;
        cur = q;
        hist.push(q);
        for (;;) {
          const cand: number[] = [];
          for (const o of offs) {
            const nb = cur + o;
            if (K[nb] && !visited[nb]) cand.push(nb);
          }
          if (!cand.length) break;
          let best = cand[0];
          if (cand.length > 1) {
            // Candidates touching each other are one branch; a real fork has several.
            const groups: number[][] = [];
            for (const nb of cand) {
              const g = groups.find((gr) =>
                gr.some((m) => Math.abs(xOf(m) - xOf(nb)) <= 1 && Math.abs(yOf(m) - yOf(nb)) <= 1),
              );
              if (g) g.push(nb);
              else groups.push([nb]);
            }
            // At a real fork, finish a short side stroke first (like the upstroke of an
            // "h") and carry on with the long way afterwards.
            let pool = cand;
            if (groups.length > 1) {
              const CAP = 50 * S;
              let bestSize = CAP;
              groups.forEach((gr, gi) => {
                const block = new Set<number>();
                groups.forEach((other, oi) => {
                  if (oi !== gi) for (const m of other) block.add(m);
                });
                const seenB = new Set<number>(gr);
                const q = [...gr];
                for (let h = 0; h < q.length && q.length < CAP; h++) {
                  for (const o of offs) {
                    const nb = q[h] + o;
                    if (K[nb] && !visited[nb] && !seenB.has(nb) && !block.has(nb)) {
                      seenB.add(nb);
                      q.push(nb);
                    }
                  }
                }
                if (q.length < bestSize) {
                  bestSize = q.length;
                  pool = gr;
                }
              });
            }
            const ref = hist.length >= 5 ? hist[hist.length - 5] : hist[0];
            const dx = xOf(cur) - xOf(ref);
            const dy = yOf(cur) - yOf(ref);
            const dl = Math.hypot(dx, dy) || 1;
            let bs = -Infinity;
            for (const nb of pool) {
              const ex = xOf(nb) - xOf(cur);
              const ey = yOf(nb) - yOf(cur);
              const el = Math.hypot(ex, ey) || 1;
              let sc = (ex * dx + ey * dy) / (el * dl);
              // No heading yet (start of a stroke): lean rightward, as handwriting does.
              if (hist.length < 5) sc += 0.4 * (ex / el);
              if (sc > bs) {
                bs = sc;
                best = nb;
              }
            }
            for (const nb of cand) if (nb !== best) stack.push(nb);
          }
          order.push(best);
          jump.push(false);
          visited[best] = 1;
          cur = best;
          hist.push(best);
        }
      }
      return { order, jump, cost: walkCost(order, jump) };
    };

    // Backtracking cost: leftward travel (jumps included) plus a charge per pen lift.
    const walkCost = (order: number[], jump: boolean[]) => {
      let cost = 0;
      for (let j = 1; j < order.length; j++) {
        cost += Math.max(0, xOf(order[j - 1]) - xOf(order[j]));
        if (jump[j]) cost += 12 * S;
      }
      return cost;
    };

    // The same pen path drawn end-to-start (each stroke run reversed in place).
    const reversed = (w: { order: number[]; jump: boolean[] }) => {
      const n2 = w.order.length;
      const order2: number[] = [];
      const jump2: boolean[] = [];
      for (let j = n2 - 1; j >= 0; j--) {
        order2.push(w.order[j]);
        jump2.push(j === n2 - 1 || w.jump[j + 1]);
      }
      return { order: order2, jump: jump2, cost: walkCost(order2, jump2) };
    };

    const order: number[] = [];
    const jump: boolean[] = [];
    for (const comp of comps) {
      // Start candidates: the leftmost pixels, plus tip-like pixels (stroke ends).
      const byX = [...comp.px].sort((p, q) => xOf(p) - xOf(q) || yOf(p) - yOf(q));
      const starts: number[] = [byX[0]];
      if (comp.px.length >= 60) {
        const tips: number[] = [];
        const win = 5 * S;
        for (const p of byX) {
          let trans = 0;
          let count = 0;
          for (let r = 0; r < 8; r++) {
            const a1 = K[p + offs[r]];
            const a2 = K[p + offs[(r + 1) % 8]];
            if (a1) count++;
            if (!a1 && a2) trans++;
          }
          if (count < 1 || trans !== 1) continue;
          // A real stroke end has a single branch nearby; a corner mid-stroke has two.
          const px0 = xOf(p);
          const py0 = yOf(p);
          let near = 0;
          for (let dy = -win; dy <= win; dy++) {
            for (let dx = -win; dx <= win; dx++) {
              if (K[(py0 + dy) * bw + px0 + dx]) near++;
            }
          }
          if (near <= win * 1.7) tips.push(p);
          if (tips.length >= 12) break;
        }
        for (const t of tips) {
          if (starts.every((sp) => Math.hypot(xOf(sp) - xOf(t), yOf(sp) - yOf(t)) > 4 * S)) {
            starts.push(t);
          }
          if (starts.length >= 6) break;
        }
      }
      let bestWalk: ReturnType<typeof walk> | null = null;
      for (const st of starts) {
        const w = walk(st);
        for (const p of comp.px) visited[p] = 0;
        // Earlier (more leftward) starts win unless a later one is clearly better;
        // a walk that ran right-to-left is flipped if that reads better.
        for (const cand of [w, reversed(w)]) {
          if (!bestWalk || cand.cost < bestWalk.cost - 6 * S) bestWalk = cand;
        }
      }
      if (bestWalk) {
        for (let j = 0; j < bestWalk.order.length; j++) {
          order.push(bestWalk.order[j]);
          jump.push(bestWalk.jump[j]);
        }
      }
    }
    const n = order.length;
    if (!n) continue;

    // Every ink pixel takes the time of its nearest centre-line pixel.
    const T = new Int32Array(bw * bh).fill(-1);
    const queue = new Int32Array(bw * bh);
    let qh = 0;
    let qt = 0;
    for (let j = 0; j < n; j++) {
      T[order[j]] = j;
      queue[qt++] = order[j];
    }
    while (qh < qt) {
      const p = queue[qh++];
      for (const o of offs) {
        const nb = p + o;
        if (A[nb] > 0 && T[nb] < 0) {
          T[nb] = T[p];
          queue[qt++] = nb;
        }
      }
    }
    const start = new Int32Array(n + 1);
    for (let i = 0; i < A.length; i++) if (A[i] > 0) start[(T[i] < 0 ? n - 1 : T[i]) + 1]++;
    for (let j = 0; j < n; j++) start[j + 1] += start[j];
    const fill = start.slice(0, n);
    const total = start[n];
    const localPix = new Int32Array(total);
    const localVal = new Uint32Array(total);
    const offX = Math.round((piece.left - pad - wrap.left + margin) * S);
    const offY = Math.round((piece.top - pad - wrap.top + margin) * S);
    const rgb = packColor(piece.style.color);
    for (let i = 0; i < A.length; i++) {
      if (A[i] === 0) continue;
      const j = T[i] < 0 ? n - 1 : T[i];
      const cx = offX + (i % bw);
      const cy = offY + ((i / bw) | 0);
      const slot = fill[j]++;
      localPix[slot] = cx >= 0 && cx < pxW && cy >= 0 && cy < pxH ? cy * pxW + cx : 0;
      localVal[slot] = cx >= 0 && cx < pxW && cy >= 0 && cy < pxH ? ((A[i] << 24) | rgb) >>> 0 : 0;
    }
    const base = pixOut.length;
    for (let q = 0; q < total; q++) {
      pixOut.push(localPix[q]);
      valOut.push(localVal[q]);
    }

    // Smooth the staircase of pixels into a hand-like path, per stroke.
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const r = Math.max(2, Math.round(S * 1.2));
    let runStart = 0;
    const runs: [number, number][] = [];
    for (let j = 1; j <= n; j++) {
      if (j === n || jump[j]) {
        runs.push([runStart, j]);
        runStart = j;
      }
    }
    for (const [a, b] of runs) {
      for (let j = a; j < b; j++) {
        let sx = 0;
        let sy = 0;
        let c = 0;
        for (let k = Math.max(a, j - r); k <= Math.min(b - 1, j + r); k++) {
          sx += order[k] % bw;
          sy += (order[k] / bw) | 0;
          c++;
        }
        xs[j] = (sx / c + 0.5 + offX) / S - margin + wrap.left - center.x;
        ys[j] = (sy / c + 0.5 + offY) / S - margin + wrap.top - center.y;
      }
    }

    // Timing: slower through curves, eased at each stroke's ends.
    const raw = new Float32Array(n);
    let rawSum = 0;
    const kc = Math.max(3, Math.round(S * 2.5));
    for (const [a, b] of runs) {
      let len = 0;
      for (let j = a + 1; j < b; j++) len += Math.hypot(xs[j] - xs[j - 1], ys[j] - ys[j - 1]);
      let acc = 0;
      for (let j = a + 1; j < b; j++) {
        const dist = Math.hypot(xs[j] - xs[j - 1], ys[j] - ys[j - 1]);
        acc += dist;
        const p0 = Math.max(a, j - kc);
        const p1 = Math.min(b - 1, j + kc);
        const v1x = xs[j] - xs[p0];
        const v1y = ys[j] - ys[p0];
        const v2x = xs[p1] - xs[j];
        const v2y = ys[p1] - ys[j];
        const l1 = Math.hypot(v1x, v1y);
        const l2 = Math.hypot(v2x, v2y);
        const ang = l1 > 0 && l2 > 0 ? Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2)))) : 0;
        const u = len > 0 ? acc / len : 0.5;
        const ease = 0.55 + 0.45 * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
        raw[j] = (dist * (1 + (1.4 * ang) / Math.PI)) / ease;
        rawSum += raw[j];
      }
    }
    const scale = rawSum > 0 ? piece.targetMs / rawSum : 0;

    for (let j = 0; j < n; j++) {
      const x = xs[j];
      const y = ys[j];
      const ps = base + start[j];
      const pe = base + start[j + 1];
      if (jump[j]) {
        if (last) {
          const dist = Math.hypot(x - last.x, y - last.y);
          t += j === 0 ? Math.min(480, 190 + dist * 1.0) : Math.min(170, 35 + dist * 1.1);
          points.push({ x, y, t, draw: false, ps, pe: ps });
          t += 25;
        }
        points.push({ x, y, t, draw: true, ps, pe });
      } else {
        t += raw[j] * scale;
        points.push({ x, y, t, draw: true, ps, pe });
      }
      last = { x, y };
    }
  }

  if (!points.length) return null;
  return {
    cssW,
    cssH,
    pxW,
    pxH,
    pix: Int32Array.from(pixOut),
    val: Uint32Array.from(valOut),
    points,
  };
}
