import { useReveal } from "../hooks/useReveal";
import { APK_DOWNLOAD_URL } from "../config";

export default function EnterEchoes() {
  const { ref, visible } = useReveal<HTMLDivElement>();

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
          <span className="enter-cta">
            <a href={APK_DOWNLOAD_URL} className="enter-btn">
              <span>Join Echoes</span>
              <span className="enter-btn-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </span>
          <br />
          <a href={APK_DOWNLOAD_URL} className="android-link">
            Android
          </a>
        </div>
      </div>
    </section>
  );
}
