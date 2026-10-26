import { CYAN, LAST, ORANGE, POINTS, PULSE_LAYERS } from "./milestones";

const lineProps = { strokeLinecap: "round", vectorEffect: "non-scaling-stroke" } as const;

/** The dashed route, the segments GSAP draws between nodes, the exit beam and the travelling pulse. */
export function EnergyLine() {
  const end = POINTS[LAST];
  return (
    <>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient
            id="bp-handover-line"
            gradientUnits="userSpaceOnUse"
            x1={POINTS[LAST - 1].left}
            y1={POINTS[LAST - 1].top}
            x2={end.left}
            y2={end.top}
          >
            <stop offset="0" stopColor={CYAN} />
            <stop offset="1" stopColor={ORANGE} />
          </linearGradient>
        </defs>
        <polyline
          className="js-bp-ghost invisible"
          points={POINTS.map((p) => `${p.left},${p.top}`).join(" ")}
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="1"
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
        {POINTS.slice(0, LAST).map((p, i) => {
          const stroke = i === LAST - 1 ? "url(#bp-handover-line)" : CYAN;
          return (
            <g key={i}>
              {[7, 1.6].map((width) => (
                <line
                  key={width}
                  className={`js-bp-seg-${i}`}
                  x1={p.left}
                  y1={p.top}
                  x2={p.left}
                  y2={p.top}
                  stroke={stroke}
                  strokeOpacity={width > 2 ? 0.18 : 1}
                  strokeWidth={width}
                  {...lineProps}
                />
              ))}
            </g>
          );
        })}
        {[7, 1.6].map((width) => (
          <line
            key={width}
            className="js-bp-ext"
            x1={end.left}
            y1={end.top}
            x2={end.left}
            y2={end.top}
            stroke={ORANGE}
            strokeOpacity={width > 2 ? 0.18 : 1}
            strokeWidth={width}
            {...lineProps}
          />
        ))}
      </svg>

      {PULSE_LAYERS.map((layer, i) => (
        <div key={i} aria-hidden className="js-bp-pulse invisible absolute inset-0" style={{ zIndex: PULSE_LAYERS.length - i }}>
          <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2" style={{ scale: layer.scale, opacity: layer.opacity }}>
            {i === 0 && <span className="absolute -inset-3 rounded-full bg-cyan-300/20" />}
            <span className="js-bp-pulse-dot block size-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_3px_rgb(165_243_252/0.8)]" />
          </span>
        </div>
      ))}
    </>
  );
}
