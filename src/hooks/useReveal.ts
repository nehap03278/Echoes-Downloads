import { useEffect, useRef, useState } from "react";

function prefersInstantReveal() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  );
}

export function useReveal<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(prefersInstantReveal);

  useEffect(() => {
    if (visible) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);

    const fallback = window.setTimeout(() => setVisible(true), 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [visible, threshold]);

  return { ref, visible };
}
