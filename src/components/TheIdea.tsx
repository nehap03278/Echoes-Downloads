import { useReveal } from "../hooks/useReveal";

const FRAGMENTS = [
  "I don't know why I still think about it.",
  "I never told anyone this.",
  "Maybe someone else feels this too.",
];

function Fragment({ text }: { text: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
      <p className="fragment">"{text}"</p>
    </div>
  );
}

export default function TheIdea() {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="section idea" aria-labelledby="idea-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <p className="eyebrow">· 02 the idea</p>
          <h2 id="idea-heading" className="heading">
            Leave a thought.
            <br />
            <em>Someone might find themselves in it.</em>
          </h2>
        </div>

        {FRAGMENTS.map((text) => (
          <Fragment key={text} text={text} />
        ))}
      </div>
    </section>
  );
}
