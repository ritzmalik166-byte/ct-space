export type ResolvedVideo =
  | { kind: "iframe"; src: string }
  | { kind: "file"; src: string }
  | { kind: "external"; src: string };

/** Maps a configured video URL to an embeddable player, or falls back to opening it in a new tab. */
export function resolveVideo(url: string): ResolvedVideo {
  let parsed: URL;
  try {
    parsed = new URL(url, typeof window === "undefined" ? "http://localhost" : window.location.href);
  } catch {
    return { kind: "external", src: url };
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v") ?? parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.match(/(\d{6,})/)?.[1];
    if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1` };
  }
  if (/\.(mp4|webm|ogg|mov)$/i.test(parsed.pathname)) return { kind: "file", src: parsed.href };
  return { kind: "external", src: parsed.href };
}
