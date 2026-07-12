interface PagefindModalTriggerElement extends HTMLElement {
  openModal(): void;
}

export function initSearch(root: HTMLElement) {
  const loader = root.querySelector<HTMLButtonElement>('[data-search-loader]');
  const label = loader?.querySelector<HTMLElement>('[data-search-loader-label]');
  const trigger = root.querySelector<PagefindModalTriggerElement>('pagefind-modal-trigger');
  if (!loader || !label || !trigger) return;

  let loadPromise: Promise<unknown> | undefined;

  const loadSearch = async () => {
    loadPromise ??= import('@pagefind/component-ui');
    await loadPromise;
    await customElements.whenDefined('pagefind-modal-trigger');
  };

  loader.addEventListener('click', async () => {
    if (loader.disabled) return;
    loader.disabled = true;
    loader.setAttribute('aria-busy', 'true');
    label.textContent = '正在加载';

    try {
      await loadSearch();
      loader.setAttribute('aria-busy', 'false');
      loader.hidden = true;
      trigger.openModal();
    } catch {
      loadPromise = undefined;
      loader.hidden = false;
      loader.disabled = false;
      loader.setAttribute('aria-busy', 'false');
      loader.title = '搜索加载失败，点击重试';
      label.textContent = '重试搜索';
    }
  });
}
