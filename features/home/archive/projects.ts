import { assetUrl } from "@/features/home/lib/assets";
import type { ExpandVideo } from "@/features/home/components/ExpandVideoModal";

export type Project = {
  code: string;
  title: string;
  place: string;
  type: string;
  year: string;
  summary: string;
  preview: string;
  film?: string;
  stats?: [string, string][];
};

export const PROJECTS: Project[] = [
  {
    code: "ARC-01",
    title: "Azure Heights Residences",
    place: "Dubai, UAE",
    type: "Residential tower",
    year: "2026",
    summary: "A 42-storey waterfront tower, taken from massing studies to a full cinematic launch film.",
    preview: assetUrl("14.mp4"),
    film: assetUrl("auto.mp4"),
    stats: [
      ["Floors", "42"],
      ["Residences", "380"],
      ["Film", "4K"],
    ],
  },
  {
    code: "ARC-02",
    title: "Marina Crest Villas",
    place: "Abu Dhabi, UAE",
    type: "Villas",
    year: "2025",
    summary: "Beachfront villas walked through room by room, from dawn light to evening interiors.",
    preview: assetUrl("09.mp4"),
  },
  {
    code: "ARC-03",
    title: "The Foundry Lofts",
    place: "London, UK",
    type: "Mixed-use",
    year: "2025",
    summary: "A Victorian foundry reborn as lofts and studios, with heritage brick meeting new steel.",
    preview: assetUrl("10.mp4"),
  },
];

export const projectVideo = (project: Project): ExpandVideo => ({
  id: project.code,
  src: project.film ?? project.preview,
  eyebrow: `${project.code} · ${project.place} · ${project.year}`,
  title: project.title,
  summary: project.summary,
});
