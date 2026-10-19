"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { STATION_CONTACT, type StationScreenContent } from "../../../lib/station/stationContent";
import { resolveVideo, type ResolvedVideo } from "../../../lib/station/video";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d675] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03040b]";

type PlaybackStatus = "loading" | "playing" | "paused" | "error";

interface ProjectionPanelProps {
  content: StationScreenContent;
  index: number;
  total: number;
  panelRef: (el: HTMLElement | null) => void;
  onClose: () => void;
  onContact: () => void;
}

function embeddedPlayer(content: StationScreenContent): ResolvedVideo | null {
  const resolved = resolveVideo(content.video.url);
  return resolved.kind === "external" ? null : resolved;
}

/**
 * Readable HTML layer of the hologram. The 3D projection surface is fitted behind
 * this element's rect, and the open/close reveal is driven from Section 3.
 */
export default function ProjectionPanel({ content, index, total, panelRef, onClose, onContact }: ProjectionPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [player, setPlayer] = useState<ResolvedVideo | null>(() => embeddedPlayer(content));
  const [status, setStatus] = useState<PlaybackStatus>("loading");
  const [shownId, setShownId] = useState(content.id);
  if (shownId !== content.id) {
    setShownId(content.id);
    setPlayer(embeddedPlayer(content));
    setStatus("loading");
  }
  const cyan = content.accent === "cyan";
  const accent = cyan ? "text-[#7fe3ff]" : "text-[#f4d675]";
  const titleId = `station-projection-${content.id}`;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [content.id]);

  const watch = () => {
    const resolved = resolveVideo(content.video.url);
    if (resolved.kind === "external") window.open(resolved.src, "_blank", "noopener,noreferrer");
    else {
      setStatus("loading");
      setPlayer(resolved);
    }
  };

  /** Autoplays when the projector opens; if unmuted autoplay is blocked, retries muted, then leaves the native controls. */
  const startVideo = useCallback((video: HTMLVideoElement | null) => {
    video?.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "NotAllowedError")) return;
      video.muted = true;
      video.play().catch(() => setStatus("paused"));
    });
  }, []);

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      data-lenis-prevent
      className="absolute left-1/2 top-1/2 z-30 max-h-[84svh] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-md border border-white/15 bg-[#04101c]/72 p-5 text-white shadow-[0_0_60px_rgba(127,227,255,0.12)] backdrop-blur-md md:p-7"
      style={{ opacity: 0, clipPath: "inset(50% 0 50% 0)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={`font-mono text-[10px] uppercase tracking-[0.3em] ${accent}`}>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          {content.label ? ` · ${content.label}` : null}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close projection"
          className={`-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-white/20 text-white/75 transition hover:border-white/50 hover:text-white ${FOCUS_RING}`}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      <h3 ref={headingRef} id={titleId} tabIndex={-1} className="mt-3 text-2xl font-semibold leading-tight tracking-tight outline-none md:text-3xl">
        {content.category}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/75 md:text-base">{content.description}</p>

      <div
        className={`relative mt-5 w-full overflow-hidden rounded-sm border border-white/10 bg-black/60 ${
          player ? "h-[min(46svh,480px)]" : "aspect-video"
        }`}
      >
        <Image
          src={content.thumbnail}
          alt=""
          fill
          sizes="(max-width: 768px) 92vw, 680px"
          className={`object-cover transition-[filter,opacity] duration-500 ${player ? "scale-110 opacity-40 blur-xl" : "opacity-85"}`}
        />
        {player?.kind === "iframe" ? (
          <iframe
            src={player.src}
            title={content.video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : player?.kind === "file" && status !== "error" ? (
          <video
            ref={startVideo}
            src={player.src}
            title={content.video.title}
            poster={content.thumbnail}
            controls
            playsInline
            autoPlay
            preload="metadata"
            onWaiting={() => setStatus("loading")}
            onPlaying={() => setStatus("playing")}
            onPause={() => setStatus("paused")}
            onError={() => setStatus("error")}
            className="absolute inset-0 size-full object-contain"
          />
        ) : null}
        {player?.kind === "file" && status === "loading" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-white/80">
              <span aria-hidden className="size-3 animate-spin rounded-full border border-white/30 border-t-[#f4d675]" />
              Loading video
            </span>
          </div>
        ) : null}
        {status === "error" && player ? (
          <div role="alert" className="absolute inset-0 grid place-items-center bg-black/55 p-6 text-center">
            <div>
              <p className="text-sm text-white/85">This video couldn&apos;t be loaded here.</p>
              <a
                href={content.video.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block text-sm font-medium text-[#f4d675] underline-offset-4 hover:underline ${FOCUS_RING}`}
              >
                Open the video in a new tab
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={watch}
          disabled={player !== null}
          className={`brand-gold-button inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold disabled:opacity-60 ${FOCUS_RING}`}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="currentColor">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
          {!player ? "Watch Full Video" : status === "error" ? "Unavailable" : status === "playing" ? "Now Playing" : "In Projector"}
        </button>
        <a
          href={STATION_CONTACT.href}
          onClick={onContact}
          className={`inline-flex h-11 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-medium text-white/90 transition hover:border-[#f4d675]/70 hover:text-[#f4d675] ${FOCUS_RING}`}
        >
          {STATION_CONTACT.label}
        </a>
      </div>
    </section>
  );
}
