
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function journalTimeline(root: HTMLElement) {
  const q = gsap.utils.selector(root);

  const heading = q(".js-jr-head");
  const cards = q(".js-jr-card") as HTMLElement[];
  const frames = q(".js-jr-frame");
  const lines = q(".js-jr-line");
  const cta = q(".js-jr-cta");

  // Smooth heading reveal
  gsap.fromTo(
    heading,
    {
      y: 35,
      autoAlpha: 0,
      filter: "blur(6px)",
    },
    {
      y: 0,
      autoAlpha: 1,
      filter: "blur(0px)",
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: root,
        start: "top 78%",
        toggleActions: "play none none reverse",
      },
    },
  );

  // Smooth staggered card entrance
  gsap.fromTo(
    cards,
    {
      y: 65,
      autoAlpha: 0,
      scale: 0.96,
      rotateX: 4,
      transformPerspective: 1000,
      filter: "blur(5px)",
    },
    {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      rotateX: 0,
      filter: "blur(0px)",
      duration: 1.15,
      stagger: {
        each: 0.16,
        from: "start",
      },
      ease: "power3.out",
      clearProps: "transform,filter",
      scrollTrigger: {
        trigger: ".js-jr-grid",
        start: "top 82%",
        toggleActions: "play none none reverse",
      },
    },
  );

  // Subtle staggered reveal for text and arrow
  gsap.fromTo(
    lines,
    {
      y: 18,
      autoAlpha: 0,
    },
    {
      y: 0,
      autoAlpha: 1,
      duration: 0.75,
      stagger: 0.08,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".js-jr-grid",
        start: "top 75%",
        toggleActions: "play none none reverse",
      },
    },
  );

  // Gentle image reveal
  gsap.fromTo(
    frames,
    {
      scale: 0.97,
      autoAlpha: 0,
    },
    {
      scale: 1,
      autoAlpha: 1,
      duration: 1.2,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".js-jr-grid",
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    },
  );

  // Smooth CTA entrance
  gsap.fromTo(
    cta,
    {
      y: 24,
      autoAlpha: 0,
    },
    {
      y: 0,
      autoAlpha: 1,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: cta,
        start: "top 95%",
        toggleActions: "play none none reverse",
      },
    },
  );
}
