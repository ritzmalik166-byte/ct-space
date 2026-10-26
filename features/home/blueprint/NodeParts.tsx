import { isHandover, LAST, pad, type Milestone } from "./milestones";

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 15c-1.6-1.6-2.6-3.6-2.4-6.4C9.9 5.4 12 3 15.5 2.5 16 6 13.6 8.1 15.4 8.4c-2.8.2-4.8-.8-6.4-2.4" />
      <path d="M14.5 2.5C18.5 2 21.5 5 21 9c-.4 3.3-3 5.4-6.4 6l-2.6-2.6c.6-3.4 2.7-6 6-6.4" strokeLinejoin="round" />
      <path d="M9.4 14.6 6 18M7.5 11.5 5 11l3-3h3M12.5 16.5l.5 2.5 3-3v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NodeBadge({ index }: { index: number }) {
  if (isHandover(index)) {
    return (
      <span className="relative grid size-9 place-items-center rounded-full bg-[#ff6b3d] text-white shadow-[0_0_40px_-4px_rgb(255_107_61/0.8)] lg:size-12">
        <RocketIcon className="size-4 lg:size-5" />
      </span>
    );
  }
  return (
    <span className="relative grid size-7 place-items-center rounded-full border-[1.5px] border-cyan-400 bg-[#05060b] text-[10px] font-medium text-cyan-200 lg:size-9 lg:text-[11px]">
      {pad(index)}
    </span>
  );
}

/** Popups open towards the centre of the screen so outer nodes don't push them off the edge on phones. */
const POPUP_ALIGN = {
  start: { box: "left-1/2 -translate-x-7 origin-bottom-left", arrow: "left-7 -translate-x-1/2" },
  center: { box: "left-1/2 -translate-x-1/2 origin-bottom", arrow: "left-1/2 -translate-x-1/2" },
  end: { box: "right-1/2 translate-x-7 origin-bottom-right", arrow: "right-7 translate-x-1/2" },
};

function popupAlign(index: number) {
  if (index * 2 < LAST) return POPUP_ALIGN.start;
  if (index * 2 > LAST) return POPUP_ALIGN.end;
  return POPUP_ALIGN.center;
}

export function NodePopup({ item, index }: { item: Milestone; index: number }) {
  const handover = isHandover(index);
  const align = popupAlign(index);
  return (
    <div
      role="tooltip"
      id={`bp-tip-${index}`}
      className={`pointer-events-none absolute bottom-full mb-5 w-[min(15rem,calc(100vw-2.5rem))] ${align.box} translate-y-2 scale-90 opacity-0 transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/node:translate-y-0 group-hover/node:scale-100 group-hover/node:opacity-100 group-focus-within/node:translate-y-0 group-focus-within/node:scale-100 group-focus-within/node:opacity-100`}
    >
      <div
        className={`relative rounded-2xl border bg-[#0b1626]/95 p-4 text-left ${
          handover
            ? "border-[#ff6b3d]/35 shadow-[0_18px_50px_-18px_rgb(255_107_61/0.6)]"
            : "border-cyan-400/25 shadow-[0_18px_50px_-18px_rgb(34_211_238/0.55)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] ${
              handover ? "bg-[#ff6b3d]/15 text-[#ffa27f]" : "bg-cyan-400/10 text-cyan-300"
            }`}
          >
            <span className={`size-1.5 rounded-full ${handover ? "bg-[#ff6b3d]" : "bg-cyan-400"}`} />
            {item.when}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-slate-500">
            {pad(index)} / {pad(LAST)}
          </span>
        </div>
        <p className="mt-3 text-[15px] font-semibold tracking-tight">{item.title}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{item.details}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.outputs.map((o) => (
            <li key={o} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {o}
            </li>
          ))}
        </ul>
        <span
          aria-hidden
          className={`absolute -bottom-[7px] ${align.arrow} size-3 rotate-45 border-b border-r bg-[#0b1626] ${
            handover ? "border-[#ff6b3d]/35" : "border-cyan-400/25"
          }`}
        />
      </div>
    </div>
  );
}
