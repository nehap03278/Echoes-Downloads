import { useEffect, useRef, useState } from "react";
import { planInk, type InkPiece } from "./inkPlan";

type WriteStage = 0 | 1 | 2 | 3;

type TextLine = { text: string; left: number; right: number; top: number; bottom: number };

/** Splits a text element into its visually wrapped lines, using per-character client rects. */
function measureLines(el: HTMLElement): TextLine[] {
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return [];
  const str = node.textContent ?? "";
  const range = document.createRange();
  const lines: (TextLine & { chars: string })[] = [];
  let cur: (TextLine & { chars: string }) | null = null;
  for (let i = 0; i < str.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const r = range.getClientRects()[0];
    if (!r || r.width === 0) {
      if (cur) cur.chars += str[i];
      continue;
    }
    if (!cur || r.top > cur.top + (cur.bottom - cur.top) * 0.6) {
      cur = { text: "", chars: "", left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      lines.push(cur);
    }
    cur.chars += str[i];
    if (str[i] !== " ") {
      cur.left = Math.min(cur.left, r.left);
      cur.right = Math.max(cur.right, r.right);
    }
    cur.top = Math.min(cur.top, r.top);
    cur.bottom = Math.max(cur.bottom, r.bottom);
  }
  return lines.map((l) => ({
    text: l.chars.trim(),
    left: l.left,
    right: l.right,
    top: l.top,
    bottom: l.bottom,
  }));
}

const INK_MARGIN = 28;

export default function Hero() {
  const paperRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLDivElement>(null);
  const echoesRef = useRef<HTMLSpanElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const [writeStage, setWriteStage] = useState<WriteStage>(0);
  const writeStageRef = useRef<WriteStage>(0);
  const penPosRef = useRef({ x: 0, y: 0 });
  const inkCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    writeStageRef.current = writeStage;
  }, [writeStage]);

  useEffect(() => () => inkCleanupRef.current?.(), []);

  useEffect(() => {
    const paper = paperRef.current;
    const pen = penRef.current;
    if (!paper || !pen) return;

    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let raf = 0;

    const loop = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      penPosRef.current = { x: current.x, y: current.y };
      if (writeStageRef.current === 0) {
        pen.style.transform = `translate(-50%, -96%) translate(${current.x}px, ${current.y}px) rotate(-45deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const handleMove = (event: PointerEvent) => {
      const rect = paper.getBoundingClientRect();
      target = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      };
    };

    paper.addEventListener("pointermove", handleMove);
    return () => {
      paper.removeEventListener("pointermove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const startWriting = () => {
    if (writeStageRef.current !== 0) return;
    setWriteStage(1);

    const textEl = echoesRef.current;
    const tagEl = taglineRef.current;
    const penEl = penRef.current;
    const paperEl = paperRef.current;
    const wrapEl = textEl?.offsetParent as HTMLElement | null;
    const showPlainText = () => {
      if (textEl) textEl.style.clipPath = "none";
      if (tagEl) tagEl.style.clipPath = "none";
      setWriteStage(3);
    };
    if (!textEl || !tagEl || !penEl || !paperEl || !wrapEl) return showPlainText();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return showPlainText();

    // Measure with the paper's tilt switched off, then restore it without
    // letting its CSS transition play.
    const prevTransform = paperEl.style.transform;
    const prevTransition = paperEl.style.transition;
    paperEl.style.transition = "none";
    paperEl.style.transform = "none";
    const paperRect = paperEl.getBoundingClientRect();
    const wrapRect = wrapEl.getBoundingClientRect();
    const textStyle = getComputedStyle(textEl);
    const tagStyle = getComputedStyle(tagEl);
    const pieces: InkPiece[] = [];
    for (const l of measureLines(textEl)) {
      pieces.push({ ...l, style: textStyle, targetMs: 3000 });
    }
    for (const l of measureLines(tagEl)) {
      pieces.push({ ...l, style: tagStyle, targetMs: Math.max(700, (l.right - l.left) * 5.5) });
    }
    const S = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    const plan = planInk(
      pieces,
      { left: wrapRect.left, top: wrapRect.top, width: wrapRect.width, height: wrapRect.height },
      { x: paperRect.left + paperRect.width / 2, y: paperRect.top + paperRect.height / 2 },
      INK_MARGIN,
      S,
    );
    paperEl.style.transform = prevTransform;
    paperEl.getBoundingClientRect();
    paperEl.style.transition = prevTransition;
    if (!plan) return showPlainText();

    // Ink is painted on a canvas laid over the (still hidden) real text.
    const canvas = document.createElement("canvas");
    canvas.width = plan.pxW;
    canvas.height = plan.pxH;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${-INK_MARGIN}px`,
      top: `${-INK_MARGIN}px`,
      width: `${plan.cssW}px`,
      height: `${plan.cssH}px`,
      pointerEvents: "none",
    });
    wrapEl.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return showPlainText();
    }
    const img = ctx.createImageData(plan.pxW, plan.pxH);
    const px32 = new Uint32Array(img.data.buffer);
    const { points, pix, val } = plan;

    const place = (x: number, y: number, deg: number) => {
      penEl.style.transform = `translate(-50%, -96%) translate(${x}px, ${y}px) rotate(${deg}deg)`;
    };

    // Rest pose: stand the pen up inside the sheet's bottom-right corner, with a margin
    // from the paper's edge. Its visible half-width is ~0.3 of the (responsive) pen box.
    // The pen leans toward the text only as far as the free room allows (max 20°); the
    // margin shrinks on very narrow sheets, and the pen lies flat only as a last resort.
    const placeAtRest = () => {
      const pw = penEl.offsetWidth;
      const ph = penEl.offsetHeight;
      const halfW = paperEl.offsetWidth / 2;
      const halfH = paperEl.offsetHeight / 2;
      // Right edge of the real text lines (not the wrapper box, which spans the sheet).
      const paperBox = paperEl.getBoundingClientRect();
      const centreX = paperBox.left + paperBox.width / 2;
      let textRight = -Infinity;
      for (const l of [...measureLines(textEl), ...measureLines(tagEl)]) {
        textRight = Math.max(textRight, l.right - centreX);
      }
      for (const margin of [18, 14, 10, 6, 3]) {
        const nibX = halfW - margin - pw * 0.3;
        const room = nibX - pw * 0.3 - (textRight + 6);
        if (room >= 0) {
          const lean = Math.min(20, (Math.asin(Math.min(1, room / ph)) * 180) / Math.PI);
          place(nibX, halfH - pw * 0.5, -lean);
          return;
        }
      }
      place(halfW - pw * 0.6, halfH - pw * 0.5 - 4, -90);
    };

    let aborted = false;
    let done = false;
    const startW = paperEl.offsetWidth;
    const startH = paperEl.offsetHeight;
    // If the sheet changes size (window resize, device emulation) the canvas ink and
    // the pen's timeline are stale: drop the canvas for the real text, re-seat the pen.
    const observer = new ResizeObserver(() => {
      if (
        !done &&
        Math.abs(paperEl.offsetWidth - startW) < 1 &&
        Math.abs(paperEl.offsetHeight - startH) < 1
      ) {
        return;
      }
      aborted = true;
      textEl.style.clipPath = "none";
      tagEl.style.clipPath = "none";
      canvas.style.display = "none";
      penEl.style.transition = "none";
      placeAtRest();
      if (!done) {
        done = true;
        setWriteStage(3);
      }
    });
    observer.observe(paperEl);
    inkCleanupRef.current = () => {
      observer.disconnect();
      canvas.remove();
    };

    let revealed = 0;
    const revealUpTo = (k: number) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -1;
      let maxY = -1;
      while (revealed <= k && revealed < points.length) {
        const p = points[revealed++];
        for (let q = p.ps; q < p.pe; q++) {
          const idx = pix[q];
          px32[idx] = val[q];
          const x = idx % plan.pxW;
          const y = (idx / plan.pxW) | 0;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX >= 0) ctx.putImageData(img, 0, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
    };

    const finish = () => {
      revealUpTo(points.length - 1);
      done = true;
      penEl.style.transition = "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)";
      placeAtRest();
      setWriteStage(2);
      window.setTimeout(() => setWriteStage(3), 900);
    };

    // Pen lifts between strokes by an amount proportional to the (responsive) pen size.
    const LIFT_PX = 9 * (penEl.offsetWidth / 52);
    const approachMs = 550;
    const from = { ...penPosRef.current };
    const first = points[0];
    const approachStart = performance.now();
    let timelineStart = 0;
    let k = 0;
    let lastY = first.y;
    let tilt = 0;

    const step = (now: number) => {
      if (aborted) return;
      if (timelineStart === 0) {
        const a = Math.min(1, (now - approachStart) / approachMs);
        const e = 1 - Math.pow(1 - a, 3);
        const arc = Math.sin(Math.PI * a) * LIFT_PX * 1.6;
        place(
          from.x + (first.x - from.x) * e,
          from.y + (first.y - from.y) * e - arc,
          -45 + 13 * e,
        );
        if (a >= 1) timelineStart = now;
        requestAnimationFrame(step);
        return;
      }

      const t = now - timelineStart;
      const lastIdx = points.length - 1;
      while (k < lastIdx && points[k + 1].t <= t) k++;
      revealUpTo(k);

      if (k >= lastIdx) {
        finish();
        return;
      }
      const p0 = points[k];
      const p1 = points[k + 1];
      const span = p1.t - p0.t;
      const u = span > 0 ? Math.min(1, (t - p0.t) / span) : 1;
      const lift = p1.draw ? 0 : Math.sin(Math.PI * u) * LIFT_PX;
      const x = p0.x + (p1.x - p0.x) * u;
      const y = p0.y + (p1.y - p0.y) * u - lift;
      tilt += (Math.max(-7, Math.min(7, (y - lastY) * 1.2)) - tilt) * 0.2;
      lastY = y;
      place(x, y, -32 + tilt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <header className="hero" id="top">
      <div className="container">
        <div
          ref={paperRef}
          className="paper"
          role="button"
          tabIndex={0}
          aria-label="Touch the paper, then activate it to watch Echoes get written"
          onClick={startWriting}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              startWriting();
            }
          }}
        >
          <div ref={penRef} className="pen" aria-hidden="true">
            <svg viewBox="0 0 40 150" width="100%" height="100%" fill="none">
              <path
                d="M20 2 C27 2 31 7 31 13 L31 19 L9 19 L9 13 C9 7 13 2 20 2 Z"
                fill="#1B1A2E"
              />
              <ellipse cx="20" cy="9" rx="4" ry="2.5" fill="#3D3B5C" opacity=".6" />
              <rect x="10" y="18" width="20" height="66" rx="7" fill="#262643" />
              <rect x="13" y="18" width="4" height="66" rx="2" fill="#3D3B5C" opacity=".5" />
              <rect x="9" y="82" width="22" height="4" rx="1.5" fill="#D9B54B" />
              <path d="M11 87 L29 87 L25 104 L15 104 Z" fill="#3D3B5C" />
              <rect x="13.5" y="100" width="13" height="7" rx="1" fill="#D9B54B" />
              <path
                d="M20 105 L28 118 L20 147 L12 118 Z"
                fill="#E6C874"
                stroke="#9C7A28"
                strokeWidth="0.7"
              />
              <path d="M20 105 L28 118 L20 132 L12 118 Z" fill="#D9B54B" opacity=".5" />
              <line x1="20" y1="120" x2="20" y2="143" stroke="#4A3A10" strokeWidth="1.1" />
              <circle cx="20" cy="120" r="2.2" fill="none" stroke="#4A3A10" strokeWidth="1" />
            </svg>
          </div>

          <div className="write-wrap">
            <span ref={echoesRef} className="echoes-word">
              Echoes
            </span>
            <p ref={taglineRef} className="tagline">
              where stories connect us.
            </p>
          </div>

          <p className={`paper-hint ${writeStage >= 1 ? "hide" : ""}`}>
            touch the paper, then click
          </p>
        </div>

        <p className={`postline ${writeStage >= 3 ? "in" : ""}`}>
          You feel lighter by sharing.<br></br>
Someone else feels braver by reading.
        </p>
      </div>
    </header>
  );
}
