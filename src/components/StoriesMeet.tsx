import { useState } from "react";
import { useReveal } from "../hooks/useReveal";

export default function StoriesMeet() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [joined, setJoined] = useState(false);

  return (
    <section className="section meet" aria-labelledby="meet-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <h2 id="meet-heading" className="eyebrow">
            · 04 when stories meet
          </h2>

          <div className="meet-stage">
            <p className={`meet-frag meet-a ${joined ? "joined" : ""}`}>
              "I thought I was the only one."
            </p>
            <button
              type="button"
              className={`connect-btn ${joined ? "hide" : ""}`}
              onClick={() => setJoined(true)}
              aria-label="Connect these two stories"
            >
              →←
            </button>
            <p className={`meet-frag meet-b ${joined ? "joined" : ""}`}>
              "I thought nobody would understand."
            </p>
          </div>

          <p className={`meet-line ${joined ? "in" : ""}`}>
            Sometimes connection doesn't need an introduction.
          </p>
        </div>
      </div>
    </section>
  );
}
