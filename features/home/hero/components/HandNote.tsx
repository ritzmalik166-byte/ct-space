export function HandNote() {
  return (
    <div className="js-note js-reveal pointer-events-none absolute left-[54%] top-[24%] z-10 hidden w-64 -rotate-[5deg] lg:block">
      <p className="text-base font-medium leading-6 text-white/85">
        that&apos;s our little neural core.
        <br />
        <span className="text-cyan-300">move your mouse</span>, it&apos;s curious.
      </p>
      <svg viewBox="0 0 160 90" className="ml-24 mt-1 h-20 w-36 text-cyan-300/80" fill="none" aria-hidden>
        <path
          className="js-note-path"
          pathLength={1}
          d="M6 8 C 40 4, 92 14, 112 44 S 128 76, 150 80"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1"
        />
        <path
          className="js-note-path"
          pathLength={1}
          d="M136 70 L 151 80 L 135 86"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
        />
      </svg>
    </div>
  );
}
