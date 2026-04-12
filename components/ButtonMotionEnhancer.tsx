'use client';

import { animate, hover, press } from 'motion';
import { useEffect } from 'react';

const BUTTON_SELECTOR = '.btn, .btn-outline, .btn-gold, .icon-btn, .icon-btn-outline';

export default function ButtonMotionEnhancer() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cleanups = new Map<HTMLElement, () => void>();

    const attach = (element: HTMLElement) => {
      if (cleanups.has(element)) return;
      if (element.matches(':disabled, [aria-disabled="true"]')) return;

      let hoverAnimation: ReturnType<typeof animate> | null = null;
      let pressAnimation: ReturnType<typeof animate> | null = null;
      element.style.willChange = 'transform';

      const cancelHover = hover(element, () => {
        pressAnimation?.stop();
        hoverAnimation?.stop();
        hoverAnimation = animate(
          element,
          { y: -2, scale: 1.02 },
          { duration: 0.16, ease: 'easeOut' }
        );

        return () => {
          hoverAnimation?.stop();
          hoverAnimation = animate(
            element,
            { y: 0, scale: 1 },
            { duration: 0.16, ease: 'easeOut' }
          );
        };
      });

      const cancelPress = press(element, () => {
        hoverAnimation?.stop();
        pressAnimation?.stop();
        pressAnimation = animate(
          element,
          { y: 0, scale: 0.97 },
          { duration: 0.08, ease: 'easeOut' }
        );

        return () => {
          pressAnimation?.stop();
          pressAnimation = animate(
            element,
            { y: 0, scale: 1 },
            { duration: 0.14, ease: 'easeOut' }
          );
        };
      });

      cleanups.set(element, () => {
        cancelHover();
        cancelPress();
        hoverAnimation?.stop();
        pressAnimation?.stop();
        element.style.willChange = '';
        element.style.transform = '';
      });
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(BUTTON_SELECTOR)) {
        attach(root);
      }
      root.querySelectorAll<HTMLElement>(BUTTON_SELECTOR).forEach(attach);
    };

    const detach = (node: Node) => {
      if (!(node instanceof Element)) return;

      if (node instanceof HTMLElement) {
        const cleanup = cleanups.get(node);
        if (cleanup) {
          cleanup();
          cleanups.delete(node);
        }
      }

      node.querySelectorAll<HTMLElement>(BUTTON_SELECTOR).forEach((element) => {
        const cleanup = cleanups.get(element);
        if (cleanup) {
          cleanup();
          cleanups.delete(element);
        }
      });
    };

    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
        mutation.removedNodes.forEach(detach);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  return null;
}
