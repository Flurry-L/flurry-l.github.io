const HITOKOTO_ENDPOINT = 'https://international.v1.hitokoto.cn?c=a&c=d';
const REQUEST_TIMEOUT = 6000;

interface HitokotoPayload {
  hitokoto?: unknown;
  from?: unknown;
}

export function initHitokoto(root: HTMLButtonElement) {
  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const textElement = root.querySelector<HTMLElement>('[data-hitokoto-text]');
  const fromElement = root.querySelector<HTMLElement>('[data-hitokoto-from]');
  const statusElement = root.querySelector<HTMLElement>('[data-hitokoto-status]');
  if (!textElement || !fromElement || !statusElement) return;

  let loading = false;

  const refresh = async (announce: boolean) => {
    if (loading) return;
    loading = true;
    root.dataset.state = 'loading';
    root.setAttribute('aria-busy', 'true');
    root.setAttribute('aria-disabled', 'true');
    root.title = '正在换一句';
    if (announce) statusElement.textContent = '正在换一句';

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(HITOKOTO_ENDPOINT, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Hitokoto request failed: ${response.status}`);

      const payload = await response.json() as HitokotoPayload;
      const text = typeof payload.hitokoto === 'string' ? payload.hitokoto.trim() : '';
      const from = typeof payload.from === 'string' ? payload.from.trim() : '';
      if (!text || !from || text.length > 160 || from.length > 80) {
        throw new Error('Hitokoto response is invalid');
      }

      textElement.textContent = text;
      fromElement.textContent = `——${from}`;
      root.dataset.state = 'ready';
      root.title = '换一句';
      if (announce) statusElement.textContent = `已换一句：${text}`;
    } catch {
      root.dataset.state = 'error';
      root.title = '获取失败，点击重试';
      if (announce) statusElement.textContent = '暂时无法获取新的一言，已保留当前内容';
    } finally {
      window.clearTimeout(timeout);
      loading = false;
      root.setAttribute('aria-busy', 'false');
      root.removeAttribute('aria-disabled');
    }
  };

  root.addEventListener('click', () => void refresh(true));

  // Defer the initial refresh so first paint stays stable.
  const scheduleInitial = 'requestIdleCallback' in window
    ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 3000 })
    : (cb: () => void) => window.setTimeout(cb, 1200);
  scheduleInitial(() => void refresh(false));
}
