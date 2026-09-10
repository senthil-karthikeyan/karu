import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger safely in browser environment
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Check if the user has requested reduced motion.
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if viewport is mobile (<768px).
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/**
 * Recommended motion constants
 */
export const MOTION_CONFIG = {
  duration: 0.8,
  stagger: 0.08,
  ease: "power3.out",
  // Adaptive vertical offsets
  yDesktop: 28,
  yMobile: 14,
  getDistance: () => (isMobile() ? 14 : 28),
};

export { gsap, ScrollTrigger };
