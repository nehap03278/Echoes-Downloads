export default function Nav() {
  const scrollToInstall = () => {
    document.getElementById("install")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <nav className="nav" aria-label="Primary">
      <a href="#top" className="nav-brand" aria-label="Echoes, back to top">
        <img className="nav-logo" src="/logo.png" alt="" width="32" height="32" />
      </a>
      <button type="button" className="nav-link" onClick={scrollToInstall}>
        Install
      </button>
    </nav>
  );
}
