/**
 * Reading progress bar for article pages. The scroll listener lives on
 * window and looks up the bar element fresh on every frame, so it keeps
 * working across client-side navigations without re-initialization.
 */
export function initReadingProgress() {
  let ticking = false;
  const update = () => {
    ticking = false;
    const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
    if (!bar) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
    bar.style.transform = `scaleX(${progress})`;
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
}
