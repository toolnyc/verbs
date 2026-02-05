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
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.45, ease: easing.smooth }
  );
}

/**
 * Preview hover effect - hides element with animation
 */
export function hidePreview(element: HTMLElement) {
  gsap.killTweensOf(element);
  gsap.to(element, {
    opacity: 0,
    scale: 0.95,
    duration: duration.normal,
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
 * Uses gsap.quickTo() for smooth, interpolated cursor-following via transforms
 * Returns cleanup function
 */
export function createHoverPreview(
  trigger: HTMLElement,
  preview: HTMLElement,
  options: { offset?: number; delay?: number } = {}
): () => void {
  const { offset = 20, delay = 180 } = options;
  let isVisible = false;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let currentX = 0;
  let currentY = 0;
  let previewWidth = 0;
  let previewHeight = 0;

  // quickTo creates reusable tweens — much faster than gsap.to() per frame
  // and provides smooth interpolation between positions
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.35, ease: 'power3.out' });

  function calcPosition(clientX: number, clientY: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = clientX + offset;
    let y = clientY + offset;

    if (x + previewWidth > vw) {
      x = clientX - previewWidth - offset;
    }
    if (y + previewHeight > vh) {
      y = vh - previewHeight - offset;
    }
    if (y < offset) {
      y = offset;
    }

    return { x, y };
  }

  const onEnter = (e: MouseEvent) => {
    currentX = e.clientX;
    currentY = e.clientY;

    hoverTimer = setTimeout(() => {
      // Cache dimensions once on show (avoids reflow on every mousemove)
      const rect = preview.getBoundingClientRect();
      previewWidth = rect.width;
      previewHeight = rect.height;

      // Snap to current mouse position instantly before fading in
      const pos = calcPosition(currentX, currentY);
      gsap.set(preview, { x: pos.x, y: pos.y });

      isVisible = true;
      gsap.fromTo(
        preview,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.45, ease: easing.smooth, overwrite: 'auto' }
      );
    }, delay);
  };

  const hide = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (isVisible) {
      isVisible = false;
      gsap.to(preview, {
        opacity: 0,
        scale: 0.95,
        duration: duration.normal,
        ease: easing.smooth,
        overwrite: 'auto',
      });
    }
  };

  const onLeave = hide;

  // Browsers don't reliably fire mouseleave when elements scroll away
  // from the cursor, so hide on scroll as well
  const onScroll = () => {
    if (!isVisible && !hoverTimer) return;
    const rect = trigger.getBoundingClientRect();
    if (
      currentX < rect.left || currentX > rect.right ||
      currentY < rect.top || currentY > rect.bottom
    ) {
      hide();
    }
  };

  const onMove = (e: MouseEvent) => {
    currentX = e.clientX;
    currentY = e.clientY;

    if (!isVisible) return;

    const pos = calcPosition(currentX, currentY);
    xTo(pos.x);
    yTo(pos.y);
  };

  trigger.addEventListener('mouseenter', onEnter);
  trigger.addEventListener('mouseleave', onLeave);
  trigger.addEventListener('mousemove', onMove);
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    trigger.removeEventListener('mouseenter', onEnter);
    trigger.removeEventListener('mouseleave', onLeave);
    trigger.removeEventListener('mousemove', onMove);
    window.removeEventListener('scroll', onScroll);
    gsap.killTweensOf(preview);
    gsap.set(preview, { opacity: 0 });
    isVisible = false;
  };
}
