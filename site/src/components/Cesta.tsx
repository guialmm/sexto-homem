/**
 * The signup's "swish": a ball arcs in from the left and drops through the rim,
 * the net shaking as it goes. Pure CSS (offset-path), no library.
 */
export function Cesta() {
  return (
    <svg viewBox="0 0 220 120" className="cesta h-24 w-44" aria-hidden>
      {/* backboard, rim and net */}
      <rect x="168" y="14" width="6" height="56" rx="2" className="fill-ink/80" />
      <path d="M140 46 H170" className="stroke-bola" strokeWidth="4" strokeLinecap="round" />
      <path className="rede fill-none stroke-ink/40" strokeWidth="1.5" d="M142 48 L148 74 M168 48 L162 74 M148 74 L162 74 M150 48 L154 74 M160 48 L156 74 M144 60 H166" />
      {/* the ball travels this arc */}
      <g className="bola">
        <circle r="10" className="fill-bola" />
        <path d="M-10 0 H10 M0 -10 V10 M-7 -7 Q0 0 -7 7 M7 -7 Q0 0 7 7" className="fill-none stroke-ink/50" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
