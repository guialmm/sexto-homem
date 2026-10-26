/**
 * A full NBA court, drawn to scale (94 × 50 ft → 940 × 500), fixed behind the
 * page. Its lines trace themselves on load: sidelines, the
 * half-court line and center circle, then both ends at once (paint, free-throw
 * circle, three-point line, backboard, rim, restricted area). Decorative only.
 */

// One end of the court, for the left basket; the right one is its mirror.
function Garrafao({
  espelhar = false,
  atrasoBase = 0,
}: {
  espelhar?: boolean;
  atrasoBase?: number;
}) {
  const linha = (atraso: number) => ({
    style: { ["--atraso" as string]: `${atrasoBase + atraso}s` },
  });
  return (
    <g transform={espelhar ? "translate(940 0) scale(-1 1)" : undefined}>
      {/* paint: 16 ft wide, 19 ft deep */}
      <rect
        pathLength={1}
        x="0"
        y="170"
        width="190"
        height="160"
        {...linha(0)}
      />
      {/* free-throw circle */}
      <circle pathLength={1} cx="190" cy="250" r="60" {...linha(0.1)} />
      {/* three-point line: straight in the corners, then the 23.75 ft arc */}
      <path
        pathLength={1}
        d="M0 30 H140 A237.5 237.5 0 0 1 140 470 H0"
        {...linha(0.2)}
      />
      {/* backboard, rim and restricted area */}
      <path pathLength={1} d="M40 220 V280" {...linha(0.35)} />
      <circle pathLength={1} cx="52.5" cy="250" r="7.5" {...linha(0.4)} />
      <path
        pathLength={1}
        d="M52.5 210 A40 40 0 0 1 52.5 290"
        {...linha(0.45)}
      />
    </g>
  );
}

function Linhas() {
  return (
    <>
      {/* boundary, half-court line, center circles */}
      <rect
        pathLength={1}
        x="0"
        y="0"
        width="940"
        height="500"
        style={{ ["--atraso" as string]: "0s" }}
      />
      <path
        pathLength={1}
        d="M470 0 V500"
        style={{ ["--atraso" as string]: "0.2s" }}
      />
      <circle
        pathLength={1}
        cx="470"
        cy="250"
        r="60"
        style={{ ["--atraso" as string]: "0.3s" }}
      />
      <circle
        pathLength={1}
        cx="470"
        cy="250"
        r="20"
        style={{ ["--atraso" as string]: "0.4s" }}
      />
      <Garrafao atrasoBase={0.5} />
      <Garrafao espelhar atrasoBase={0.5} />
    </>
  );
}

const svg = {
  "aria-hidden": true,
  preserveAspectRatio: "xMidYMid meet",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  className: "absolute inset-0 size-full",
} as const;

// Fixed behind the whole page, so it stays put while the content scrolls: lying
// down on landscape screens, standing up (baskets top and bottom) on phones.
export function Quadra() {
  return (
    <div className="quadra pointer-events-none fixed inset-0 -z-10 p-3 text-ink/[0.11] sm:p-6">
      <div className="relative size-full">
        <svg
          viewBox="-4 -4 948 508"
          {...svg}
          className={`${svg.className} portrait:hidden`}
        >
          <Linhas />
        </svg>
        <svg
          viewBox="-4 -4 508 948"
          {...svg}
          className={`${svg.className} landscape:hidden`}
        >
          <g transform="translate(500 0) rotate(90)">
            <Linhas />
          </g>
        </svg>
      </div>
    </div>
  );
}
