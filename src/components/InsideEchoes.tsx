import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useReveal } from "../hooks/useReveal";

type Tab = "feed" | "discover" | "create" | "profile";

const TABS: { id: Tab; label: string; src: string; alt: string; tint: string }[] = [
  { id: "feed", label: "Feed", src: "/screenshots/feed.jpg", alt: "Echoes — Feed", tint: "#c9ccf2" },
  { id: "discover", label: "Discover", src: "/screenshots/discover.jpg", alt: "Echoes — Discover", tint: "#bfe3f5" },
  { id: "create", label: "Create", src: "/screenshots/create.jpg", alt: "Echoes — Create", tint: "#f8d9c2" },
  { id: "profile", label: "Profile", src: "/screenshots/profile.jpg", alt: "Echoes — Profile", tint: "#cdeed3" },
];

const EXIT_MS = 1300;

export default function InsideEchoes() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [active, setActive] = useState<Tab>("feed");
  const [prev, setPrev] = useState<Tab | null>(null);
  const [dir, setDir] = useState(1);
  const [changed, setChanged] = useState(false);
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pillReady, setPillReady] = useState(false);

  const phoneRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const exitTimer = useRef<number | undefined>(undefined);

  const current = TABS.find((t) => t.id === active) ?? TABS[0];
  const previous = prev ? TABS.find((t) => t.id === prev) : undefined;

  useEffect(() => {
    for (const t of TABS) {
      const img = new Image();
      img.src = t.src;
    }
    return () => window.clearTimeout(exitTimer.current);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[active];
      if (el) setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const raf = requestAnimationFrame(() => setPillReady(true));
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  const select = (id: Tab) => {
    if (id === active) return;
    const from = TABS.findIndex((t) => t.id === active);
    const to = TABS.findIndex((t) => t.id === id);
    const d = to > from ? 1 : -1;
    setDir(d);
    setPrev(active);
    setActive(id);
    setChanged(true);
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => setPrev(null), EXIT_MS);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // A slow breath as the new screen ripples in, instead of a flip.
      phoneRef.current?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.025)", offset: 0.45 }, { transform: "scale(1)" }],
        { duration: 1300, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
      );
    }
  };

  return (
    <section className="section inside" aria-labelledby="inside-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <p className="eyebrow">· 05 inside echoes</p>
          <h2 id="inside-heading" className="heading">
            One of these fragments
            <br />
            <em>is a real place.</em>
          </h2>

          <div className="phone-stage">
            <div
              className="phone-glow"
              style={{ "--tint": current.tint } as CSSProperties}
              aria-hidden="true"
            />
            <div ref={phoneRef} className="phone" style={{ "--dir": dir } as CSSProperties}>
              {previous && (
                <img
                  key={`out-${previous.id}`}
                  className="screen exit"
                  src={previous.src}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <img
                key={current.id}
                className={`screen ${changed ? "enter" : ""}`}
                src={current.src}
                alt={current.alt}
              />
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Echoes app screens">
            {pill && (
              <span
                className={`tab-pill ${pillReady ? "ready" : ""}`}
                aria-hidden="true"
                style={{
                  width: pill.w,
                  height: pill.h,
                  transform: `translate(${pill.x}px, ${pill.y}px)`,
                }}
              />
            )}
            {TABS.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                className={`tab ${active === tab.id ? "active" : ""}`}
                onClick={() => select(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
