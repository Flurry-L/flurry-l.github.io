import { watch, type Ref } from "vue";

/** One delegated listener also handles code blocks replaced by v-html. */
export function useCodeCopy(container: Readonly<Ref<HTMLElement | null>>) {
  watch(
    container,
    (element, _previous, onCleanup) => {
      if (!element) return;
      let timer: number | undefined;
      let lastButton: HTMLButtonElement | undefined;
      const reset = () => {
        clearTimeout(timer);
        if (!lastButton) return;
        delete lastButton.dataset.state;
        delete lastButton.dataset.message;
        lastButton
          .closest(".code-block")!
          .querySelector('[role="status"]')!.textContent = "";
      };
      const copy = async (event: MouseEvent) => {
        const button = (event.target as Element).closest<HTMLButtonElement>(
          "button.code-copy-button"
        );
        if (!button) return;
        const block = button.closest(".code-block")!;
        let message = "已复制";
        let state = "copied";
        try {
          await navigator.clipboard.writeText(
            block.querySelector("pre code")!.textContent ?? ""
          );
        } catch {
          message = "复制失败";
          state = "error";
        }
        if (!button.isConnected) return;
        reset();
        lastButton = button;
        button.dataset.state = state;
        button.dataset.message = message;
        block.querySelector('[role="status"]')!.textContent = message;
        timer = window.setTimeout(reset, 1500);
      };
      element.addEventListener("click", copy);
      onCleanup(() => {
        clearTimeout(timer);
        element.removeEventListener("click", copy);
      });
    },
    { flush: "post" }
  );
}
