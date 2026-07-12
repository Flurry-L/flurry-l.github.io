import tocbot from 'tocbot';
import { focusAfterAnchorScroll } from './focus-after-scroll';

function isVisible(element: HTMLElement) {
  return getComputedStyle(element).display !== 'none';
}

export function initPostToc() {
  const desktopToc = document.querySelector<HTMLElement>('[data-post-toc-desktop]');
  const compactToc = document.querySelector<HTMLDetailsElement>('[data-post-toc-compact]');
  const compactSlot = document.querySelector<HTMLElement>('[data-post-toc-compact-slot]');
  const compactPanel = compactToc?.querySelector<HTMLElement>('.toc-compact-panel');
  const compactRootSlot = compactToc?.querySelector<HTMLElement>('[data-tocbot-compact-slot]');
  const compactFallback = compactToc?.querySelector<HTMLElement>('[data-toc-compact-fallback]');
  const tocRoot = desktopToc?.querySelector<HTMLElement>('[data-tocbot-root]');
  const prose = document.querySelector<HTMLElement>('.prose');
  if (
    !desktopToc
    || !compactToc
    || !compactSlot
    || !compactPanel
    || !compactRootSlot
    || !compactFallback
    || !tocRoot
    || !prose
  ) return;

  const compactMedia = matchMedia('(max-width: 1279px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let compactDetached = false;
  let scrollBehaviorResetTimer = 0;
  let previousScrollBehavior: string | null = null;

  const syncAriaCurrent = () => {
    tocRoot.querySelectorAll<HTMLAnchorElement>('.toc-link').forEach((link) => {
      if (link.classList.contains('is-active-link')) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const moveTocRoot = () => {
    compactToc.open = false;
    if (compactMedia.matches) {
      compactRootSlot.replaceChildren(tocRoot);
    } else {
      desktopToc.append(tocRoot);
    }
    document.dispatchEvent(new Event('scroll'));
  };

  const updateCompactPosition = () => {
    const shouldDetach = compactMedia.matches
      && isVisible(compactSlot)
      && compactSlot.getBoundingClientRect().bottom <= 12;
    if (shouldDetach === compactDetached) return;
    compactDetached = shouldDetach;
    compactToc.open = false;
    compactToc.dataset.detached = String(shouldDetach);
  };

  const update = () => {
    frame = 0;
    updateCompactPosition();
  };
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };

  compactToc.addEventListener('toggle', () => {
    if (compactToc.open) document.dispatchEvent(new Event('scroll'));
    schedule();
  });
  compactToc.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    compactToc.open = false;
    compactToc.querySelector<HTMLElement>('summary')?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (compactToc.open && event.target instanceof Node && !compactToc.contains(event.target)) {
      compactToc.open = false;
    }
  });

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    schedule();
  });
  compactMedia.addEventListener('change', moveTocRoot);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(prose);
  void document.fonts?.ready.then(schedule);

  moveTocRoot();
  compactFallback.remove();

  const smoothScrollDuration = 360;
  const hasTocbotSmoothScrolling = !reducedMotion.matches;
  tocbot.init({
    tocElement: tocRoot,
    contentElement: prose,
    headingSelector: 'h2, h3',
    hasInnerContainers: true,
    linkClass: 'toc-link',
    activeLinkClass: 'is-active-link',
    listClass: 'toc-list',
    isCollapsedClass: 'is-collapsed',
    collapsibleClass: 'is-collapsible',
    listItemClass: 'toc-list-item',
    activeListItemClass: 'is-active-li',
    collapseDepth: 2,
    scrollSmooth: hasTocbotSmoothScrolling,
    scrollSmoothDuration: smoothScrollDuration,
    scrollSmoothOffset: -24,
    headingsOffset: 24,
    scrollHandlerType: 'throttle',
    scrollHandlerTimeout: 60,
    tocScrollOffset: 12,
    bottomModeThreshold: 24,
    onClick(event) {
      const link = event.currentTarget;
      if (!(link instanceof HTMLAnchorElement)) return;

      if (reducedMotion.matches) {
        link.classList.add('no-smooth-scroll');
        window.setTimeout(() => link.classList.remove('no-smooth-scroll'), 0);
        const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if (target instanceof HTMLElement) focusAfterAnchorScroll(target);
      } else if (hasTocbotSmoothScrolling) {
        const documentElement = document.documentElement;
        previousScrollBehavior ??= documentElement.style.scrollBehavior;
        documentElement.style.scrollBehavior = 'auto';
        window.clearTimeout(scrollBehaviorResetTimer);
        scrollBehaviorResetTimer = window.setTimeout(() => {
          documentElement.style.scrollBehavior = previousScrollBehavior ?? '';
          previousScrollBehavior = null;
        }, smoothScrollDuration + 100);
      } else {
        const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if (target instanceof HTMLElement) focusAfterAnchorScroll(target);
      }

      if (compactToc.contains(link)) {
        requestAnimationFrame(() => { compactToc.open = false; });
      }
      schedule();
    },
  });

  const activeStateObserver = new MutationObserver(syncAriaCurrent);
  activeStateObserver.observe(tocRoot, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  desktopToc.dataset.enhanced = 'true';
  compactToc.dataset.enhanced = 'true';
  syncAriaCurrent();
  schedule();
}
