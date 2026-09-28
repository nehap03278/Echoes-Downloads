import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReveal } from "../hooks/useReveal";
import { APK_DOWNLOAD_URL } from "../config";

type PuzzleState = "apart" | "joining" | "snap" | "button";

// A real jigsaw edge: the tab's neck flares out of the edge in a smooth fillet and
// ends in a round head (r=15); the socket in the other piece follows the same curve.
const TAB_PIECE =
  "M14 20 L108 20 L108 57 Q108 64 114 64.5 L121.25 64 A15 15 0 1 1 121.25 76 L114 75.5 Q108 76 108 83 L108 120 L14 120 Q8 120 8 114 L8 26 Q8 20 14 20 Z";
const SOCKET_PIECE =
  "M0 20 L94 20 Q100 20 100 26 L100 114 Q100 120 94 120 L0 120 L0 83 Q0 76 6 75.5 L13.25 76 A15 15 0 1 0 13.25 64 L6 64.5 Q0 64 0 57 Z";

// In-app browsers (Instagram, Facebook, WhatsApp, TikTok, …) and bare Android WebViews
// ("; wv)") usually can't hand an APK download to Android, so there we ask people to
// open the page in their normal browser instead of starting a download that stalls.
const IN_APP_BROWSER =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|Snapchat|musical_ly|TikTok|BytedanceWebview|Twitter|LinkedInApp|Pinterest|; wv\)/;

function isInAppBrowser() {
  return typeof navigator !== "undefined" && IN_APP_BROWSER.test(navigator.userAgent);
}

type JigsawProps = {
  d: string;
  viewBox: string;
  fill: string;
  side: string;
};

/** One flat jigsaw piece: solid colour with a darker edge underneath for thickness. */
function Jigsaw({ d, viewBox, fill, side }: JigsawProps) {
  return (
    <svg viewBox={viewBox} aria-hidden="true">
      <path d={d} fill={side} transform="translate(0 6)" />
      <path d={d} fill={fill} />
      <path d={d} fill="none" stroke="#1d1466" strokeOpacity="0.3" strokeWidth="0.9" />
    </svg>
  );
}

export default function EnterEchoes() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [state, setState] = useState<PuzzleState>("apart");
  const timers = useRef<number[]>([]);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [inApp] = useState(isInAppBrowser);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (state === "button") buttonRef.current?.focus({ preventScroll: true });
  }, [state]);

  const assemble = () => {
    // Tapping a piece only fits the puzzle together; the revealed button is the one and
    // only download trigger, so a single tap never starts more than one download.
    if (state !== "apart") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("button");
      return;
    }
    setState("joining");
    timers.current.push(
      window.setTimeout(() => setState("snap"), 620),
      window.setTimeout(() => setState("button"), 1050),
    );
  };

  const done = state === "button";

  return (
    <section className="section enter" id="install" aria-labelledby="enter-heading">
      <div className="container">
        <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""}`}>
          <p className="eyebrow">· 08 enter echoes</p>
          <h2 id="enter-heading" className="heading">
            There's always another
            <br />
            story <em>waiting to be found.</em>
          </h2>

          <div className="puzzle" data-state={state} style={{ "--u": "clamp(58px, 22vw, 100px)" } as CSSProperties}>
            <button
              type="button"
              className="piece piece-a"
              onClick={assemble}
              disabled={state !== "apart"}
              aria-hidden={done}
              aria-label="Join — tap to fit the pieces together and reveal the download button"
            >
              <span className="piece-inner">
                <Jigsaw d={TAB_PIECE} viewBox="0 0 160 140" fill="#6f74d6" side="#4b4fa8" />
                <span className="piece-label piece-label-a">join</span>
              </span>
            </button>

            <button
              type="button"
              className="piece piece-b"
              onClick={assemble}
              disabled={state !== "apart"}
              aria-hidden={done}
              aria-label="Echoes — tap to fit the pieces together and reveal the download button"
            >
              <span className="piece-inner">
                <Jigsaw d={SOCKET_PIECE} viewBox="-6 0 112 140" fill="#5a5fc0" side="#3f4390" />
                <span className="piece-label piece-label-b">echoes</span>
              </span>
            </button>

            <span className="snap-flash" aria-hidden="true" />

            <span className="button-holder">
              <span className="enter-cta">
                <a
                  ref={buttonRef}
                  href={inApp ? undefined : APK_DOWNLOAD_URL}
                  download={inApp ? undefined : true}
                  className="enter-btn"
                  tabIndex={done ? 0 : -1}
                  aria-hidden={!done}
                  aria-disabled={inApp || undefined}
                  aria-describedby="download-note"
                >
                  Join Echoes
                </a>
              </span>
            </span>
          </div>

          <p className={`puzzle-hint ${state === "apart" ? "" : "hide"}`}>tap a piece to join</p>

          <p id="download-note" className="download-note" role={inApp ? "alert" : undefined}>
            {inApp
              ? "Downloads can't finish inside this app's browser. Open this page in Chrome or your usual browser (use the ⋮ or share menu and choose Open in browser), then tap Join Echoes there."
              : "When the download finishes, tap Open, or open Echoes from your Downloads or notifications. If Android asks, allow your browser to install apps. If Chrome shows a warning, choose Download anyway."}
          </p>

          <span className="android-link">Android</span>
        </div>
      </div>
    </section>
  );
}
