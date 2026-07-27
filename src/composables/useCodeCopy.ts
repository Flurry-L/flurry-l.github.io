import { onBeforeUnmount, onMounted, type Ref } from "vue";

/** Appends a copy button to every <pre> inside the given container. */
export function useCodeCopy(container: Ref<HTMLElement | undefined>) {
  const buttons: HTMLButtonElement[] = [];

  onMounted(() => {
    const blocks = container.value?.querySelectorAll("pre") ?? [];
    for (const block of blocks) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      button.addEventListener("click", async () => {
        const code = block.querySelector("code")?.innerText ?? block.innerText;
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "已复制";
        } catch {
          button.textContent = "复制失败";
        }
        setTimeout(() => {
          button.textContent = "复制";
        }, 1500);
      });
      block.appendChild(button);
      buttons.push(button);
    }
  });

  onBeforeUnmount(() => {
    for (const button of buttons) button.remove();
  });
}
