import { useState } from "react";
import { useReveal } from "../hooks/useReveal";

type Mode = "private" | "shared" | null;

export default function Privacy() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>(null);

  return (
    <section className="section privacy" aria-labelledby="privacy-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <p className="eyebrow">· 06 privacy</p>
          <h2 id="privacy-heading" className="heading">
            You don't have
            <br />
            to be known <em>to be heard.</em>
          </h2>
          <p className="sub">
            Your Echo is shared only according to the visibility you choose.
          </p>

          <div className="toggle-row">
            <button
              type="button"
              className={`toggle-btn private ${mode === "private" ? "active" : ""}`}
              aria-pressed={mode === "private"}
              onClick={() => setMode("private")}
            >
              Private
            </button>
            <button
              type="button"
              className={`toggle-btn shared ${mode === "shared" ? "active" : ""}`}
              aria-pressed={mode === "shared"}
              onClick={() => setMode("shared")}
            >
              Shared
            </button>
          </div>

          <p className="privacy-caption" aria-live="polite">
            {mode === "private"
              ? "only you can see this echo."
              : mode === "shared"
                ? "anyone exploring echoes might find this."
                : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
