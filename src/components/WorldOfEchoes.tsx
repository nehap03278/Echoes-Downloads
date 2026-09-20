import { useReveal } from "../hooks/useReveal";

const FRAGMENTS = [
  "I miss who I was before I started comparing myself.",
  "I didn't tell my friends because I didn't want them to worry.",
  "Today was actually a good day.",
  "I wonder if anyone else does this.",
  "I don't have an answer yet.",
];

export default function WorldOfEchoes() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const items = [...FRAGMENTS, ...FRAGMENTS];

  return (
    <section className="section world" aria-labelledby="world-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <h2 id="world-heading" className="eyebrow">
            · 07 the world of echoes
          </h2>
          <div className="marquee">
            <div className="marquee-track">
              {items.map((text, i) => (
                <p key={i} className="marquee-item">
                  "{text}"
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
