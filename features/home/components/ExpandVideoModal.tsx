"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/media";

export type ExpandVideo = {
  id: string;
  src: string;
  eyebrow: string;
  title: string;
  summary: string;
  tags?: string[];
};

/** Aspect ratio of the preview inside a card, so the modal opens at the right shape before the film loads. */
export function previewRatio(media: HTMLElement) {
  const preview = media.querySelector("video");
  return preview?.videoWidth && preview.videoHeight ? preview.videoWidth / preview.videoHeight : 16 / 9;
}

/** Native dialog that expands a video out of the card it was opened from and shrinks back into it on close. */
export function ExpandVideoModal({
  video,
  ratio,
  origin,
  onRatio,
  onClosed,
}: {
  video: ExpandVideo | null;
  ratio: number;
  origin: () => HTMLElement | null;
  onRatio: (ratio: number) => void;
  onClosed: () => void;
}) {
  const titleId = useId();
  const portrait = ratio < 1;
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const isOpen = video !== null;

  /** Transform that makes the expanded frame sit exactly over the card it came from. */
  const fromCard = () => {
    const card = origin()?.getBoundingClientRect();
    const el = frame.current;
    if (!card || !el) return null;
    gsap.set(el, { clearProps: "transform" });
    const box = el.getBoundingClientRect();
    return {
      x: card.left - box.left,
      y: card.top - box.top,
      scaleX: card.width / box.width,
      scaleY: card.height / box.height,
    };
  };

  useEffect(() => {
    const el = dialog.current;
    if (!el || !isOpen) return;
    closing.current = false;
    el.showModal();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";

    const q = gsap.utils.selector(el);
    const from = prefersReducedMotion() ? null : fromCard();
    const tl = gsap.timeline();
    tl.fromTo(q(".js-xm-shade"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0);
    if (from) {
      tl.fromTo(
        frame.current,
        { ...from, transformOrigin: "0 0" },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.85, ease: "expo.inOut" },
        0,
      );
    }
    tl.fromTo(
      q(".js-xm-info > *"),
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" },
      from ? 0.6 : 0.1,
    );

    return () => {
      tl.kill();
      html.style.overflow = overflow;
      if (el.open) el.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => {
    const el = dialog.current;
    if (closing.current || !el) return;
    closing.current = true;
    frame.current?.querySelector("video")?.pause();
    const q = gsap.utils.selector(el);
    const to = prefersReducedMotion() ? null : fromCard();
    const tl = gsap.timeline({ onComplete: onClosed });
    tl.to(q(".js-xm-info > *"), { autoAlpha: 0, duration: 0.2 }, 0).to(q(".js-xm-shade"), { autoAlpha: 0, duration: 0.5 }, 0.15);
    if (to) tl.to(frame.current, { ...to, transformOrigin: "0 0", duration: 0.7, ease: "expo.inOut" }, 0);
    else tl.to(frame.current, { autoAlpha: 0, duration: 0.25 }, 0);
  };

  return (
    <dialog
      ref={dialog}
      data-lenis-prevent
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-white backdrop:bg-transparent open:grid"
    >
      <div aria-hidden className="js-xm-shade invisible absolute inset-0 bg-[#03060d]/95" onClick={close} />
      {video && (
        <div
          className={`pointer-events-none relative m-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-8 ${
            portrait ? "items-center sm:flex-row sm:items-end sm:justify-center sm:gap-8" : ""
          }`}
        >
          <div
            ref={frame}
            style={{
              aspectRatio: ratio,
              width: `min(100%, calc(var(--frame-h) * ${ratio}))`,
            }}
            className={`pointer-events-auto relative shrink-0 ${
              portrait ? "[--frame-h:62svh] sm:[--frame-h:82svh]" : "[--frame-h:64svh] sm:[--frame-h:72svh]"
            } self-center overflow-hidden rounded-2xl border border-cyan-400/25 bg-black shadow-[0_40px_140px_-30px_rgb(34_211_238/0.35)]`}
          >
            <video
              key={video.id}
              src={video.src}
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) onRatio(v.videoWidth / v.videoHeight);
              }}
              className="absolute inset-0 size-full object-contain"
            />
          </div>
          <div
            className={`js-xm-info pointer-events-auto flex flex-col gap-4 ${
              portrait ? "w-full sm:w-auto sm:max-w-sm" : "sm:flex-row sm:items-end sm:justify-between"
            }`}
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">{video.eyebrow}</p>
              <h3 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {video.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{video.summary}</p>
              {video.tags && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {video.tags.map((tag) => (
                    <li key={tag} className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] text-slate-300">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              autoFocus
              className="flex shrink-0 items-center gap-2 self-start rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 sm:self-auto"
            >
              Close
              <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
