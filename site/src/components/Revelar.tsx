"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** Fades its content up the first time it scrolls into view. */
export function Revelar({ children, atraso = 0, className = "" }: { children: ReactNode; atraso?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisto(true);
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition duration-700 ease-out ${visto ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  );
}
