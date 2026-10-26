import type { Project } from "./projects";
import { HIDDEN } from "./timeline";

type Props = {
  project: Project;
  index: number;
  load: boolean;
  onOpen: (index: number, media: HTMLElement) => void;
};

/**
 * Grid cell (scroll 3D moves) wrapping the card (pointer tilt). The featured title rests on the bottom edge and
 * slides up on reveal; small cards stay image-only until the reveal brings in their title and details.
 */
export function ProjectCard({ project, index, load, onOpen }: Props) {
  const featured = index === 0;

  return (
    <div className={`js-arch-cell ${featured ? "col-span-2 aspect-[4/3] lg:col-span-1 lg:row-span-2 lg:aspect-auto" : "aspect-[4/3] lg:aspect-auto"}`}>
      <button
        type="button"
        onClick={(e) => onOpen(index, e.currentTarget)}
        aria-haspopup="dialog"
        aria-label={`Watch ${project.title}`}
        className="js-arch-card group relative block size-full overflow-hidden bg-[#0a1220] text-left ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DAAF25]"
      >
        <video
          className="js-arch-video absolute inset-0 size-full object-cover transition-[scale] duration-[1200ms] ease-out group-hover:scale-105"
          src={load ? `${project.preview}#t=0.5` : undefined}
          preload={load ? "metadata" : "none"}
          muted
          loop
          playsInline
          disablePictureInPicture
        />
        {featured && (
          // Height matches the resting title row: its padding plus one 1.25-leading line.
          <span aria-hidden className="js-arch-strip absolute inset-x-0 bottom-0 h-[63px] bg-black/45 sm:h-[94px]" />
        )}
        <span aria-hidden className="js-arch-glass absolute inset-0 border-t border-white/15 bg-black/55" style={{ clipPath: HIDDEN }} />

        <span
          className={`js-arch-content absolute inset-x-0 bottom-0 flex flex-col [text-shadow:0_1px_12px_rgb(0_0_0/0.5)] ${
            featured ? "items-center p-5 text-center sm:p-8" : "items-start p-4 sm:p-5"
          }`}
        >
          <span
            className={`js-arch-title block font-heading font-bold leading-tight text-white ${
              featured ? "text-lg sm:text-[24px]" : "invisible text-sm sm:text-lg"
            }`}
          >
            {project.title}
          </span>

          <span className={`js-arch-details mt-3 flex flex-col gap-3 sm:gap-4 ${featured ? "items-center" : "items-start"}`}>
            <span className="js-arch-line invisible flex flex-wrap items-center gap-2 font-sans text-[10px] uppercase tracking-[0.2em] text-white/70 sm:text-[11px]">
              <span className="rounded-full border border-white/25 px-2 py-0.5 text-white">{project.code}</span>
              {project.place} · {project.year}
            </span>

            {featured && (
              <>
                <span className="js-arch-line invisible hidden max-w-md font-sans text-[15px] leading-snug text-white/80 sm:block">
                  {project.summary}
                </span>
                {project.stats && (
                  <span className="js-arch-line invisible hidden divide-x divide-white/15 sm:flex">
                    {project.stats.map(([label, value]) => (
                      <span key={label} className="block px-6">
                        <span className="block font-heading text-2xl font-bold text-white">{value}</span>
                        <span className="mt-1 block font-sans text-[10px] uppercase tracking-[0.18em] text-white/55">{label}</span>
                      </span>
                    ))}
                  </span>
                )}
                <span className="js-arch-line invisible inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-sans text-sm font-semibold text-black [text-shadow:none]">
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                    <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
                  </svg>
                  Watch film
                </span>
              </>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}
