/**
 * Appends a hover-revealed "#" anchor link to every prose heading that has an
 * id, so readers can copy a direct link to any section. Idempotent per page,
 * safe to call on every astro:page-load.
 */
export function initHeadingAnchors() {
  document.querySelectorAll('.prose :is(h2, h3)[id]').forEach((heading) => {
    if (heading.querySelector('.heading-anchor')) return;
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${encodeURIComponent(heading.id)}`;
    anchor.setAttribute('aria-label', '链接到本节');
    anchor.textContent = '#';
    heading.appendChild(anchor);
  });
}
