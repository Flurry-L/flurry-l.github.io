export function focusAfterAnchorScroll(target: HTMLElement) {
  const focus = () => {
    const previousTabIndex = target.getAttribute('tabindex');
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => {
      if (previousTabIndex === null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previousTabIndex);
    }, { once: true });
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setTimeout(focus, 0);
    return;
  }
  if (!('onscrollend' in document)) return;

  const handleScrollEnd = () => focus();
  document.addEventListener('scrollend', handleScrollEnd, { once: true });
  window.setTimeout(() => document.removeEventListener('scrollend', handleScrollEnd), 3000);
}
