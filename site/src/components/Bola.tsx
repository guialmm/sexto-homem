/**
 * A basketball that stands in for the letter "O" in a headline. It is sized in em
 * so it sits on the baseline at cap height, whatever the font size; screen readers
 * still read the letter.
 */
export function Bola({ atraso = 0 }: { atraso?: number }) {
  return (
    <span className="bola-letra" style={{ animationDelay: `${atraso}ms` }}>
      <span className="sr-only">o</span>
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <radialGradient id="bola-couro" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#e9a058" />
            <stop offset="0.55" stopColor="#c8732c" />
            <stop offset="1" stopColor="#8f4a16" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#bola-couro)" />
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        >
          <path d="M50 4 V96 M4 50 H96" />
          <path d="M19 16 Q40 50 19 84 M81 16 Q60 50 81 84" />
          <circle cx="50" cy="50" r="46" />
        </g>
      </svg>
    </span>
  );
}
