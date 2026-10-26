import gsap from "gsap";

/**
 * The step copy and rail dots: one step shows at a time. A new step's words rise into place and its lines
 * fade up once the previous step has lifted away. Time-based, so it plays the same at any scroll speed.
 */
export function createSteps(scope: HTMLElement, reduced: boolean) {
  const steps = gsap.utils.toArray<HTMLElement>(".js-step", scope);
  const dots = gsap.utils.toArray<HTMLElement>(".js-rail-dot", scope);
  let current = -1;

  const markDots = (active: number) =>
    dots.forEach((dot, i) =>
      gsap.to(dot, { scale: i === active ? 1.5 : 1, opacity: i <= active ? 1 : 0.35, duration: reduced ? 0 : 0.4 }),
    );

  const show = (active: number) => {
    if (active === current) return;
    const previous = steps[current];
    current = active;
    markDots(active);
    const step = steps[active];
    if (!step) return;
    gsap.killTweensOf(steps);

    if (reduced) {
      steps.forEach((s) => gsap.set(s, { autoAlpha: s === step ? 1 : 0, y: 0 }));
      return;
    }

    steps.forEach((s) => {
      if (s !== step && s !== previous) gsap.set(s, { autoAlpha: 0 });
    });
    if (previous) gsap.to(previous, { autoAlpha: 0, y: -30, duration: 0.35, ease: "power2.in" });

    const delay = previous ? 0.25 : 0;
    gsap.set(step, { autoAlpha: 1, y: 0 });
    gsap.fromTo(
      step.querySelectorAll(".js-step-word"),
      { yPercent: 110 },
      { yPercent: 0, duration: 0.7, stagger: 0.06, ease: "power3.out", delay, overwrite: true },
    );
    gsap.fromTo(
      step.querySelectorAll(".js-step-fade"),
      { y: 20, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: "power2.out", delay: delay + 0.15, overwrite: true },
    );
  };

  const hide = () => {
    current = -1;
    gsap.killTweensOf(steps);
    gsap.to(steps, { autoAlpha: 0, duration: reduced ? 0 : 0.3 });
    markDots(-1);
  };

  return { show, hide };
}
