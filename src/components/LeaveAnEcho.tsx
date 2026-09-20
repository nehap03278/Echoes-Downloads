import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReveal } from "../hooks/useReveal";

/*
 * Section 03 is a demo of the idea, not a real submission: every fragment
 * below is written and curated by us, nothing the visitor does is stored or
 * sent anywhere, and there is deliberately no free-text input.
 */

type Phase = "choose" | "found" | "letting" | "drift";

type Choice = {
  id: string;
  label: string;
  tilt: number;
  fragments: string[];
};

const CHOICES: Choice[] = [
  {
    id: "unsaid",
    label: "Something I never said",
    tilt: -2,
    fragments: [
      "I wish I could explain how much this meant to me.",
      "I never told you how proud I was of you.",
      "I kept meaning to say thank you.",
    ],
  },
  {
    id: "understood",
    label: "Something I wish someone understood",
    tilt: 1.5,
    fragments: [
      "Being quiet isn't the same as being okay.",
      "I'm trying harder than it looks.",
      "Some days, getting up is the whole accomplishment.",
    ],
  },
  {
    id: "carrying",
    label: "Something I'm carrying today",
    tilt: -1,
    fragments: [
      "I'm tired in a way sleep doesn't fix.",
      "I'm holding a small hope, and I'm afraid to say it out loud.",
      "I smiled all day so no one would ask.",
    ],
  },
  {
    id: "smile",
    label: "Something that made me smile",
    tilt: 2,
    fragments: [
      "A stranger held the door and said, “take your time.”",
      "It started to rain, and someone shared their umbrella without a word.",
      "My old song came on, and for three minutes I forgot to be sad.",
    ],
  },
  {
    id: "letgo",
    label: "Something I finally let go of",
    tilt: -1.5,
    fragments: [
      "I stopped waiting for an apology.",
      "I forgave the version of me who didn't know better.",
      "It doesn't have to make sense anymore.",
    ],
  },
];

// Other people's sample echoes, drifting around the one the visitor "left".
const OTHERS = [
  "I still keep the voicemail.",
  "It gets quieter, and then it gets easier.",
  "I said I was fine. I wasn't.",
  "Nobody noticed how hard today was, and I'm proud I made it.",
];

const DRIFT_SHIFTS = [-14, 12, 0, -10, 14];
const DRIFT_OPACITY = [0.55, 0.72, 1, 0.68, 0.5];

const LETTING_MS = 1500;
const CLOSING_MS = 4600;

type Picked = { choice: Choice; fragment: string };

export default function LeaveAnEcho() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [phase, setPhase] = useState<Phase>("choose");
  const [closing, setClosing] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  const timers = useRef<number[]>([]);
  const interacted = useRef(false);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const leaveBtnRef = useRef<HTMLButtonElement>(null);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  // Choices and buttons swap in and out, so hand focus to whatever comes next.
  useEffect(() => {
    if (!interacted.current) return;
    if (phase === "found") leaveBtnRef.current?.focus({ preventScroll: true });
    if (phase === "choose") firstChoiceRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const pick = (choice: Choice) => {
    interacted.current = true;
    const fragment = choice.fragments[Math.floor(Math.random() * choice.fragments.length)];
    setPicked({ choice, fragment });
    setPhase("found");
  };

  const release = () => {
    setPhase("letting");
    timers.current.push(window.setTimeout(() => setPhase("drift"), LETTING_MS));
    timers.current.push(window.setTimeout(() => setClosing(true), CLOSING_MS));
  };

  const reset = () => {
    clearTimers();
    setClosing(false);
    setPicked(null);
    setPhase("choose");
  };

  const driftLines = picked
    ? [OTHERS[0], OTHERS[1], picked.fragment, OTHERS[2], OTHERS[3]]
    : [];

  return (
    <section className="section leave" aria-labelledby="leave-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <p className="eyebrow">· 03 leave an echo</p>
          <h2 id="leave-heading" className="heading">
            What would you
            <br />
            <em>leave behind?</em>
          </h2>
          <p className="leave-note">a preview — nothing here is saved or sent</p>

          <div className="leave-stage">
            {phase === "choose" && (
              <div className="slips" role="group" aria-label="What would you leave behind?">
                {CHOICES.map((choice, i) => (
                  <button
                    key={choice.id}
                    ref={i === 0 ? firstChoiceRef : undefined}
                    type="button"
                    className="slip"
                    style={{ "--tilt": `${choice.tilt}deg`, "--i": i } as CSSProperties}
                    onClick={() => pick(choice)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}

            {(phase === "found" || phase === "letting") && picked && (
              <div className={`found ${phase === "letting" ? "letting" : ""}`}>
                <p className="found-kind">{picked.choice.label}</p>
                <div className="found-slip">
                  <p className="found-text" aria-live="polite">
                    <span aria-hidden="true">“</span>
                    {picked.fragment.split(" ").map((word, i) => (
                      <span
                        key={i}
                        className="found-word"
                        style={{ animationDelay: `${0.25 + i * 0.09}s` }}
                      >
                        {word}{" "}
                      </span>
                    ))}
                    <span aria-hidden="true">”</span>
                  </p>
                </div>
                <div className="found-actions">
                  <button
                    ref={leaveBtnRef}
                    type="button"
                    className="leave-btn"
                    disabled={phase === "letting"}
                    onClick={release}
                  >
                    leave it behind
                  </button>
                  <button
                    type="button"
                    className="quiet-btn"
                    disabled={phase === "letting"}
                    onClick={reset}
                  >
                    choose another
                  </button>
                </div>
              </div>
            )}

            {phase === "drift" && picked && (
              <div className="drift">
                <ul className="drift-list" aria-label="Echoes drifting by, yours among them">
                  {driftLines.map((text, i) => (
                    <li
                      key={text}
                      className={`drift-line ${i === 2 ? "mine" : ""}`}
                      style={
                        {
                          "--i": i,
                          "--shift": `${DRIFT_SHIFTS[i]}px`,
                          "--o": DRIFT_OPACITY[i],
                        } as CSSProperties
                      }
                    >
                      “{text}”
                    </li>
                  ))}
                </ul>

                <div className={`leave-close ${closing ? "in" : ""}`}>
                  <p className="close-lead">That was only a glimpse.</p>
                  <p className="close-sub">In Echoes, you can share your own story.</p>
                  <a href="#install" className="close-link">
                    Become Part of Echoes
                  </a>
                  <button type="button" className="quiet-btn" onClick={reset}>
                    try another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
