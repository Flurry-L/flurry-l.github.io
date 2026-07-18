const DESKTOP_QUERY = '(min-width: 1024px)';
const OPEN_ATTRIBUTE = 'data-open';
const BODY_OPEN_CLASS = 'site-sidebar-open';

export function initSiteSidebar() {
  const sidebar = document.querySelector<HTMLElement>('[data-site-sidebar]');
  const scrim = document.querySelector<HTMLElement>('[data-sidebar-scrim]');
  const triggers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-sidebar-toggle]'),
  );

  if (!sidebar || !scrim || triggers.length === 0) return undefined;

  const desktop = window.matchMedia(DESKTOP_QUERY);
  let isOpen = false;
  let lastTrigger: HTMLElement | null = null;

  const syncTriggers = () => {
    for (const trigger of triggers) {
      const label = isOpen ? '关闭站点信息' : '打开站点信息';
      trigger.setAttribute('aria-controls', sidebar.id);
      trigger.setAttribute('aria-expanded', String(isOpen));
      trigger.setAttribute('aria-label', label);
      trigger.setAttribute('title', label);
    }
  };

  const focusableElements = () => Array.from(
    sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.tabIndex >= 0);

  const applyViewportState = () => {
    const isDesktop = desktop.matches;
    sidebar.toggleAttribute('inert', !isDesktop && !isOpen);
    sidebar.setAttribute('aria-hidden', String(!isDesktop && !isOpen));
    scrim.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle(BODY_OPEN_CLASS, !isDesktop && isOpen);
    syncTriggers();
  };

  const setOpen = (nextOpen: boolean, restoreFocus = true) => {
    const wasOpen = isOpen;
    isOpen = !desktop.matches && nextOpen;
    sidebar.toggleAttribute(OPEN_ATTRIBUTE, isOpen);
    scrim.toggleAttribute(OPEN_ATTRIBUTE, isOpen);
    applyViewportState();

    if (isOpen) {
      window.requestAnimationFrame(() => {
        if (isOpen) sidebar.focus({ preventScroll: true });
      });
      return;
    }

    if (wasOpen && restoreFocus && lastTrigger?.isConnected) {
      lastTrigger.focus({ preventScroll: true });
    }
  };

  const handleTriggerClick = (event: Event) => {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement) || desktop.matches) return;

    lastTrigger = trigger;
    setOpen(!isOpen);
  };

  const handleScrimClick = () => setOpen(false);

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isOpen || event.defaultPrevented) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      sidebar.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const handleBreakpointChange = () => {
    setOpen(false, false);
    lastTrigger = null;
  };

  for (const trigger of triggers) {
    trigger.addEventListener('click', handleTriggerClick);
  }
  scrim.addEventListener('click', handleScrimClick);
  document.addEventListener('keydown', handleKeydown);
  desktop.addEventListener('change', handleBreakpointChange);
  applyViewportState();

  return () => {
    for (const trigger of triggers) {
      trigger.removeEventListener('click', handleTriggerClick);
    }
    scrim.removeEventListener('click', handleScrimClick);
    document.removeEventListener('keydown', handleKeydown);
    desktop.removeEventListener('change', handleBreakpointChange);
    document.body.classList.remove(BODY_OPEN_CLASS);
  };
}
