/**
 * GSAP Animation Utilities
 * Reusable animation patterns for the VERBS app
 */

import gsap from 'gsap';

// Default easing curves
export const easing = {
  smooth: 'power2.out',
  snappy: 'power3.out',
  bounce: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.5)',
} as const;

// Default durations
export const duration = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
} as const;

/**
 * Fade in an element with optional scale
 */
export function fadeIn(
  element: HTMLElement,
  options: {
    duration?: number;
    scale?: number;
    y?: number;
    ease?: string;
    onComplete?: () => void;
  } = {}
) {
  const {
    duration: dur = duration.normal,
    scale = 1,
    y = 0,
    ease = easing.smooth,
    onComplete
  } = options;

  gsap.fromTo(
    element,
    { opacity: 0, scale: scale * 0.95, y: y + 10 },
    { opacity: 1, scale, y, duration: dur, ease, onComplete }
  );
}

/**
 * Fade out an element with optional scale
 */
export function fadeOut(
  element: HTMLElement,
  options: {
    duration?: number;
    scale?: number;
    y?: number;
    ease?: string;
    onComplete?: () => void;
  } = {}
) {
  const {
    duration: dur = duration.fast,
    scale = 0.95,
    y = 10,
    ease = easing.smooth,
    onComplete
  } = options;

  gsap.to(element, {
    opacity: 0,
    scale,
    y,
    duration: dur,
    ease,
    onComplete,
  });
}

/**
 * Preview hover effect - shows element near cursor with animation
 */
export function showPreview(element: HTMLElement) {
  gsap.killTweensOf(element);
  gsap.fromTo(
    element,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: duration.normal, ease: easing.snappy }
  );
}

/**
 * Preview hover effect - hides element with animation
 */
export function hidePreview(element: HTMLElement) {
  gsap.killTweensOf(element);
  gsap.to(element, {
    opacity: 0,
    scale: 0.9,
    duration: duration.fast,
    ease: easing.smooth,
  });
}

/**
 * Update element position smoothly (for cursor-following elements)
 */
export function updatePosition(
  element: HTMLElement,
  x: number,
  y: number,
  options: { duration?: number; ease?: string } = {}
) {
  const { duration: dur = 0.15, ease = 'power2.out' } = options;
  gsap.to(element, { x, y, duration: dur, ease });
}

/**
 * Stagger animation for lists of elements
 */
export function staggerIn(
  elements: HTMLElement[] | NodeListOf<Element>,
  options: {
    duration?: number;
    stagger?: number;
    y?: number;
    ease?: string;
  } = {}
) {
  const {
    duration: dur = duration.normal,
    stagger = 0.05,
    y = 20,
    ease = easing.smooth,
  } = options;

  gsap.fromTo(
    elements,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration: dur, stagger, ease }
  );
}

/**
 * Hover scale effect
 */
export function hoverScale(element: HTMLElement, isHovering: boolean) {
  gsap.to(element, {
    scale: isHovering ? 1.02 : 1,
    duration: duration.fast,
    ease: easing.smooth,
  });
}

/**
 * Create a hover preview controller for an element
 * Returns cleanup function
 */
export function createHoverPreview(
  trigger: HTMLElement,
  preview: HTMLElement,
  options: { offset?: number } = {}
): () => void {
  const { offset = 20 } = options;
  let isVisible = false;

  const onEnter = () => {
    isVisible = true;
    showPreview(preview);
  };

  const onLeave = () => {
    isVisible = false;
    hidePreview(preview);
  };

  const onMove = (e: MouseEvent) => {
    if (!isVisible) return;

    const previewRect = preview.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // Keep preview within viewport bounds
    if (x + previewRect.width > viewportWidth) {
      x = e.clientX - previewRect.width - offset;
    }
    if (y + previewRect.height > viewportHeight) {
      y = viewportHeight - previewRect.height - offset;
    }
    if (y < offset) {
      y = offset;
    }

    // Use left/top for fixed positioning
    gsap.set(preview, { left: x, top: y });
  };

  trigger.addEventListener('mouseenter', onEnter);
  trigger.addEventListener('mouseleave', onLeave);
  trigger.addEventListener('mousemove', onMove);

  // Return cleanup function
  return () => {
    trigger.removeEventListener('mouseenter', onEnter);
    trigger.removeEventListener('mouseleave', onLeave);
    trigger.removeEventListener('mousemove', onMove);
  };
}
