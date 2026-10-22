"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { assetUrl } from "@/features/home/lib/assets";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const VIDEO_SRC = assetUrl("Mzha%20Nhi%20Aaya-02.1.mp4");
const ASSET_NAME = "MZHA_NHI_AAYA_02.1.MP4";
const SEEK_STEP = 5;
/** Timeline units: TV + reveal + hold occupy 0..1, the hand-off exit runs EXIT_START..TIMELINE_END. */
const EXIT_START = 1.02;
const TIMELINE_END = 1.34;
const POWER_OFF_BELOW = 0.22;
const PAUSE_ABOVE = 0.8;

/** Screen split into four channels: [left, right, top, bottom] in % of the screen. */
type Channel = [number, number, number, number];
const CHANNELS = 4;
const CHANNEL_GAP = 0.8;
const SPLIT_INSETS = [7, 3, 9, 5];

/** One polygon tracing every channel, joined along the centre line so the bridges have no area. */
function channelClip(channels: Channel[]) {
  const points = ["0% 50%"];
  for (const [l, r, t, b] of channels) {
    points.push(`${l}% 50%`, `${l}% ${t}%`, `${r}% ${t}%`, `${r}% ${b}%`, `${l}% ${b}%`, `${l}% 50%`);
  }
  return `polygon(${points.join(", ")})`;
}

const channelState = (fn: (i: number, left: number, right: number) => Channel) =>
  channelClip(Array.from({ length: CHANNELS }, (_, i) => fn(i, (i * 100) / CHANNELS, ((i + 1) * 100) / CHANNELS)));

const CLIP_WHOLE = channelState((_, l, r) => [l, r, 0, 100]);
const CLIP_SPLIT = channelState((i, l, r) => [l + CHANNEL_GAP, r - CHANNEL_GAP, SPLIT_INSETS[i], 100 - SPLIT_INSETS[i]]);
const CLIP_LINES = channelState((_, l, r) => [l + CHANNEL_GAP, r - CHANNEL_GAP, 49.6, 50.4]);
const CLIP_DOTS = channelState((_, l, r) => [(l + r) / 2 - 0.4, (l + r) / 2 + 0.4, 49.6, 50.4]);

const pad = (n: number) => String(n).padStart(2, "0");

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  return `${pad(Math.floor(seconds / 60))}:${pad(Math.floor(seconds % 60))}`;
}

function qualityLabel(height: number) {
  if (height >= 2160) return "4K";
  if (height >= 1440) return "QHD";
  if (height >= 1080) return "FHD";
  return "HD";
}

function syncProgress(
  video: HTMLVideoElement | null,
  fill: HTMLDivElement | null,
  time: HTMLSpanElement | null,
) {
  if (!video) return;
  const progress = video.duration ? video.currentTime / video.duration : 0;
  if (fill) {
    fill.style.transform = `scaleX(${progress})`;
    fill.closest('[role="slider"]')?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  }
  if (time) time.textContent = `${formatTime(video.currentTime)} // ${formatTime(video.duration)}`;
}

/** iOS Safari only supports fullscreen on the video element through this prefixed method. */
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const CORNERS = ["left-3 top-3", "right-3 top-3", "left-3 bottom-16", "right-3 bottom-16"];

function FeaturePlayer({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const fill = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [resolution, setResolution] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const loop = () => {
      syncProgress(videoRef.current, fill.current, time.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, videoRef]);

  const sync = () => syncProgress(videoRef.current, fill.current, time.current);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  const seekTo = (ratio: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.min(Math.max(ratio, 0), 1) * video.duration;
    sync();
  };

  const onTrackPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  };

  useEffect(() => {
    const onChange = () => {
      const video = videoRef.current;
      if (video && document.fullscreenElement !== video) video.controls = false;
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [videoRef]);

  const enterFullscreen = () => {
    const video = videoRef.current as FullscreenVideo | null;
    if (!video) return;
    if (video.requestFullscreen) {
      // Native controls only while fullscreen; the custom overlay isn't shown there.
      video.controls = true;
      video.requestFullscreen().catch(() => (video.controls = false));
    } else {
      video.webkitEnterFullscreen?.();
    }
    if (video.paused) video.play().catch(() => setPlaying(false));
  };

  const onTrackKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    if (e.key === "ArrowRight") seekTo((video.currentTime + SEEK_STEP) / video.duration);
    if (e.key === "ArrowLeft") seekTo((video.currentTime - SEEK_STEP) / video.duration);
  };

  return (
    <>
      <div className="js-nf-bar flex items-center justify-between gap-4 px-1 pb-3 font-mono text-[9px] uppercase tracking-[0.16em] sm:pb-4 sm:text-[10px]">
        <span className="text-cyan-400">CT Space / Master mission control</span>
        <span className="hidden text-slate-500 md:inline">Asset: {ASSET_NAME}</span>
        <span className="text-slate-500">
          Resolution: {resolution ?? "detecting…"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-black">
      <div className="js-tv-screen group relative aspect-video overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d2233]">
        <div aria-hidden className="js-tv-static tv-static pointer-events-none invisible absolute inset-0 z-20" />
        <div aria-hidden className="js-tv-flash pointer-events-none invisible absolute inset-0 z-20 bg-white" />
        <video
          ref={videoRef}
          src={`${VIDEO_SRC}#t=0.1`}
          preload="metadata"
          playsInline
          className="absolute inset-0 size-full cursor-pointer object-cover"
          onClick={toggle}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setResolution(`${v.videoWidth} × ${v.videoHeight} • ${qualityLabel(v.videoHeight)}`);
            sync();
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onSeeked={sync}
        />

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${playing ? "opacity-30" : "opacity-100"}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(20_70_100/0.35)_0%,rgb(8_16_30/0.55)_55%,rgb(5_9_18/0.95)_100%)]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.018)_0_1px,transparent_1px_7px)]" />
          <div className={`absolute inset-y-0 left-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-cyan-300/[0.07] to-transparent ${playing ? "hidden" : ""}`} />
        </div>

        {CORNERS.map((pos) => (
          <span
            key={pos}
            aria-hidden
            className={`js-nf-corner pointer-events-none absolute ${pos} font-mono text-[10px] leading-none text-cyan-400/60`}
          >
            +
          </span>
        ))}

        <div className="js-nf-play absolute left-1/2 top-1/2 -ml-7 -mt-7 sm:-ml-8 sm:-mt-8">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause video" : "Play video"}
          className={`relative grid size-14 place-items-center rounded-full border border-cyan-400/25 bg-[#0a1424]/85 text-cyan-400 shadow-[0_0_40px_-6px_rgb(34_211_238/0.45)] transition-[opacity,transform,background-color] duration-300 hover:scale-105 hover:bg-[#0d1b30] sm:size-16 ${
            playing ? "opacity-0 focus-visible:opacity-100 group-hover:opacity-100" : ""
          }`}
        >
          {!playing && (
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-cyan-400/20 [animation-duration:2.6s]" />
          )}
          {playing ? (
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path d="M4.5 3h2.2v10H4.5zM9.3 3h2.2v10H9.3z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 size-4" aria-hidden>
              <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
            </svg>
          )}
        </button>
        </div>

        <div className="js-nf-controls absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060c16] via-[#060c16]/70 to-transparent px-3 pb-3 pt-10 sm:px-4">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Seek video"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            onPointerDown={onTrackPointer}
            onKeyDown={onTrackKey}
            className="js-nf-track flex h-3 origin-left cursor-pointer items-center outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50"
          >
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                ref={fill}
                className="h-full origin-left bg-gradient-to-r from-[#ff6b3d] via-cyan-400 to-[#ff6b3d]"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
          <div className="js-nf-foot mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
            <span ref={time} className="tabular-nums">
              00:00 // --:--
            </span>
            <span className="flex items-center gap-3">
              <span className="hidden sm:inline">Spectral analysis: optimal</span>
              <button
                type="button"
                onClick={enterFullscreen}
                aria-label="Watch fullscreen"
                title="Fullscreen"
                className="-m-1.5 grid size-8 place-items-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-cyan-300 focus-visible:outline-1 focus-visible:outline-cyan-400/60"
              >
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path
                    d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export function NowFeaturing() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            if (self.progress < POWER_OFF_BELOW || self.progress > PAUSE_ABOVE) video.current?.pause();
          },
        },
      });

      // Phase 1: a small TV drifts in from the network and powers on.
      tl.fromTo(".js-nf-panel", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0)
        .fromTo(".js-nf-veil", { autoAlpha: 0 }, { autoAlpha: 0.4, duration: 0.12 }, 0)
        .fromTo(
          ".js-nf-frame",
          { autoAlpha: 0, scale: 0.16, rotateX: 24, y: 80 },
          { autoAlpha: 1, scale: 0.42, rotateX: 14, y: 0, duration: 0.14, ease: "power2.out" },
          0.01,
        )
        .fromTo(
          ".js-tv-screen",
          { clipPath: "inset(50% 50% 50% 50% round 12px)" },
          { clipPath: "inset(49.4% 4% 49.4% 4% round 12px)", duration: 0.035, ease: "power3.out" },
          0.15,
        )
        .to(".js-tv-screen", { clipPath: "inset(0% 0% 0% 0% round 12px)", duration: 0.05, ease: "expo.out" }, 0.19)
        .fromTo(".js-tv-flash", { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 0.02 }, 0.15)
        .to(".js-tv-flash", { autoAlpha: 0, duration: 0.07 }, 0.2)
        .fromTo(".js-tv-static", { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 0.02 }, 0.19)
        .to(".js-tv-static", { autoAlpha: 0, duration: 0.07 }, 0.24)
        .fromTo(".js-nf-glow", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.2);

      // Phase 2: scroll pushes into the screen until it becomes the full player layout.
      tl.to(".js-nf-frame", { scale: 1, rotateX: 0, duration: 0.3, ease: "power2.inOut" }, 0.31)
        .to(".js-nf-veil", { autoAlpha: 1, duration: 0.2 }, 0.31)
        .fromTo(".js-nf-title", { yPercent: 110 }, { yPercent: 0, duration: 0.08, ease: "power3.out" }, 0.5)
        .fromTo(".js-nf-meta", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.53)
        .fromTo(".js-nf-bar > *", { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.015 }, 0.55)
        .fromTo(".js-nf-corner", { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.05, stagger: 0.01 }, 0.57)
        .fromTo(
          ".js-nf-play",
          { autoAlpha: 0, scale: 0.4 },
          { autoAlpha: 1, scale: 1, duration: 0.07, ease: "back.out(2)" },
          0.59,
        )
        .fromTo(".js-nf-track", { scaleX: 0 }, { scaleX: 1, duration: 0.08, ease: "power2.inOut" }, 0.61)
        .fromTo(".js-nf-foot > *", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, stagger: 0.015 }, 0.65);

      // Phase 3: the screen splits into four channels that power off one by one, as the camera pulls back.
      const at = (t: number) => EXIT_START + t;
      tl.to(".js-nf-head", { y: -50, autoAlpha: 0, duration: 0.08, ease: "power2.in" }, at(0))
        .to(
          [".js-nf-bar", ".js-nf-controls", ".js-nf-corner", ".js-nf-play"],
          { autoAlpha: 0, duration: 0.05 },
          at(0),
        )
        .to(".js-nf-shell", { autoAlpha: 0, scale: 0.96, duration: 0.07 }, at(0.02))
        .to(".js-nf-glow", { autoAlpha: 0, duration: 0.08 }, at(0.02))
        .to(".js-nf-frame", { scale: 0.86, y: -12, duration: 0.12, ease: "power2.inOut" }, at(0.02))
        .fromTo(
          ".js-tv-screen",
          { clipPath: CLIP_WHOLE },
          { clipPath: CLIP_SPLIT, duration: 0.08, ease: "power3.inOut", immediateRender: false },
          at(0.04),
        )
        .to(".js-tv-flash", { autoAlpha: 0.35, duration: 0.015 }, at(0.04))
        .to(".js-tv-flash", { autoAlpha: 0, duration: 0.05 }, at(0.06))
        .to(".js-tv-static", { autoAlpha: 0.3, duration: 0.03 }, at(0.06))
        .to(".js-tv-screen", { clipPath: CLIP_LINES, duration: 0.07, ease: "expo.in" }, at(0.13))
        .to(".js-tv-flash", { autoAlpha: 0.85, duration: 0.05 }, at(0.15))
        .to(".js-tv-screen", { clipPath: CLIP_DOTS, duration: 0.05, ease: "power3.in" }, at(0.2))
        .to(".js-nf-frame", { autoAlpha: 0, duration: 0.04 }, at(0.24))
        .to(".js-nf-veil", { autoAlpha: 0, duration: 0.16 }, at(0.1))
        .set({}, {}, TIMELINE_END);
    },
    { scope: root },
  );

  return (
    <section
      id="now-featuring"
      ref={root}
      aria-labelledby="now-featuring-title"
      className="pointer-events-none relative -mt-[100svh] h-[520svh]"
    >
      <div className="js-nf-panel invisible sticky top-0 flex h-svh items-center overflow-hidden">
        <div
          aria-hidden
          className="js-nf-veil absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(8_15_28/0.35)_0%,rgb(6_11_22/0.8)_70%,rgb(5_6_11/0.94)_100%)]"
        />

        {/* Width is capped by viewport height so the 16:9 screen plus ~14rem of heading and chrome always fits. */}
        <div className="relative mx-auto w-full max-w-[min(72rem,calc((100svh_-_14rem)*16/9_+_6rem))] px-5 sm:px-8">
          <div className="js-nf-head flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="now-featuring-title"
              className="overflow-hidden pb-1 text-3xl font-bold tracking-[-0.02em] sm:text-[2.6rem]"
            >
              <span className="js-nf-title inline-block">Now featuring</span>
            </h2>
            <p className="js-nf-meta flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
              Feed 01 • Mzha Nhi Aaya
              <span className="flex items-center gap-1.5 font-semibold text-[#ff6b3d]">
                <span className="size-1.5 animate-pulse rounded-full bg-[#ff6b3d]" />
                Live feed
              </span>
            </p>
          </div>

          <div className="relative mt-6 [perspective:1600px] sm:mt-8">
            <div
              aria-hidden
              className="js-nf-glow pointer-events-none absolute -inset-8 animate-breathe rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgb(34_211_238/0.16),transparent_70%)] blur-2xl"
            />
            <div className="js-nf-frame pointer-events-auto relative p-3 sm:p-4">
              <div
                aria-hidden
                className="js-nf-shell absolute inset-0 rounded-2xl border border-white/[0.08] bg-[#0a1322]/90 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]"
              />
              <div className="relative">
                <FeaturePlayer videoRef={video} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
