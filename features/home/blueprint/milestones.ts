import { flowNodeScreen } from "@/features/home/scene/journeyPath";

export type Milestone = { title: string; body: string; when: string; details: string; outputs: string[] };

export const MILESTONES: Milestone[] = [
  {
    title: "Brief & Target",
    body: "Goals, users and success metrics, agreed up front.",
    when: "Week 1",
    details: "Workshops with your team to pin down the problem, the users and the numbers that define success.",
    outputs: ["Goals", "KPIs", "Scope"],
  },
  {
    title: "Design Schema",
    body: "Architecture, data flows and clickable prototypes.",
    when: "Week 2",
    details: "System architecture, data flows and clickable prototypes, signed off before production code.",
    outputs: ["Architecture", "UX flows", "Data model"],
  },
  {
    title: "Engineering",
    body: "Weekly releases of models, APIs and front end.",
    when: "Weeks 3–6",
    details: "Parallel sprints across models, APIs and front end, with a release you can click every Friday.",
    outputs: ["Sprints", "CI/CD", "Evals"],
  },
  {
    title: "Refinement",
    body: "Tuning, load testing and polish from real feedback.",
    when: "Weeks 7–8",
    details: "Load tests, model tuning and interface polish driven by feedback from real users.",
    outputs: ["QA", "Performance", "Feedback"],
  },
  {
    title: "Handover",
    body: "Code, docs, training and 30 days of support.",
    when: "Week 9+",
    details: "Your code, documentation and team training, plus a 30-day support window after launch.",
    outputs: ["Docs", "Training", "Support"],
  },
];

/** Progress where the sticky panel locks: the trigger starts when the section enters (100svh of its 640svh). */
export const STUCK_AT = 100 / 640;
/** The next section starts entering here; the energy line carries on past Handover and the camera follows. */
export const EXIT_START = 540 / 640;
export const LAST = MILESTONES.length - 1;
export const POINTS = MILESTONES.map((_, i) => flowNodeScreen(i));
export const EXIT_POINT = { left: 118, top: POINTS[LAST].top - 14 };
/** Energy pulse head followed by two fading tail dots. */
export const PULSE_LAYERS = [
  { scale: 1, opacity: 1 },
  { scale: 0.7, opacity: 0.45 },
  { scale: 0.45, opacity: 0.2 },
];
export const CYAN = "#22d3ee";
export const ORANGE = "#ff6b3d";

export const isHandover = (i: number) => i === LAST;
export const countdown = (i: number) => `T-${LAST - i}`;
export const pad = (i: number) => String(i + 1).padStart(2, "0");
