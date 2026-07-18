interface PagefindModalTriggerElement extends HTMLElement {
  openModal(): void;
}

export function initSearch(root: HTMLElement) {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const loader = root.querySelector<HTMLButtonElement>('[data-search-loader]');
  const label = loader?.querySelector<HTMLElement>('[data-search-loader-label]');
  const trigger = root.querySelector<PagefindModalTriggerElement>('pagefind-modal-trigger');
  if (!loader || !trigger) return;

  // In the icon variant the pagefind trigger button is hidden by CSS, so the
  // loader must stay visible and simply reopen the modal on later clicks.
  const hideLoaderWhenReady = root.dataset.variant !== 'icon';
  let loadPromise: Promise<unknown> | undefined;
  let loaded = false;

  loader.addEventListener('click', async () => {
    if (loaded) {
      trigger.openModal();
      return;
    }
    if (loader.disabled) return;
    loader.disabled = true;
    loader.setAttribute('aria-busy', 'true');
    if (label) label.textContent = '正在加载';

    loadPromise ??= import('@pagefind/component-ui');

    try {
      await loadPromise;
      await customElements.whenDefined('pagefind-modal-trigger');
      loaded = true;
      loader.disabled = false;
      loader.setAttribute('aria-busy', 'false');
      if (hideLoaderWhenReady) loader.hidden = true;
      trigger.openModal();
    } catch {
      loadPromise = undefined;
      loader.disabled = false;
      loader.setAttribute('aria-busy', 'false');
      loader.title = '搜索加载失败，点击重试';
      if (label) label.textContent = '重试搜索';
    }
  });
}
