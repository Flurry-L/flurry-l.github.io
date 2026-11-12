import mediumZoom from "medium-zoom";
import { onBeforeUnmount, watch, type Ref, type WatchSource } from "vue";

/** The library owns zoom/close/animation; this adapter adds keyboard access. */
export function useImageZoom(
  container: Ref<HTMLElement | undefined>,
  content: WatchSource<string | undefined>
) {
  const stop = watch(
    [container, content],
    ([element], _previous, onCleanup) => {
      const images = [
        ...(element?.querySelectorAll<HTMLImageElement>("img") ?? []),
      ].filter(image => !image.closest("a, button"));
      if (!images.length) return;
      for (const image of images) {
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute(
          "aria-label",
          image.alt ? `放大图片：${image.alt}` : "放大图片"
        );
      }
      const zoom = mediumZoom(images, {
        background: "var(--background)",
        margin: 16,
        scrollOffset: 0,
      });
      zoom.on("opened", () =>
        document
          .querySelector<HTMLElement>(".medium-zoom-image--opened")
          ?.focus({ preventScroll: true })
      );
      zoom.on("closed", event => {
        const image = event.target as HTMLImageElement;
        if (image.isConnected) image.focus({ preventScroll: true });
      });
      const onKeydown = (event: KeyboardEvent) => {
        if (event.repeat || !["Enter", " "].includes(event.key)) return;
        const image = event.target as HTMLImageElement;
        if (images.includes(image)) {
          event.preventDefault();
          void zoom.toggle({ target: image });
        } else if (
          zoom.getZoomedImage() &&
          image.classList.contains("medium-zoom-image--opened")
        ) {
          event.preventDefault();
          void zoom.close();
        }
      };
      document.addEventListener("keydown", onKeydown);
      onCleanup(() => {
        document.removeEventListener("keydown", onKeydown);
        zoom.detach();
      });
    },
    { immediate: true, flush: "post" }
  );
  onBeforeUnmount(stop);
}
