import { computed, inject, provide } from "vue";
import type { InjectionKey, Ref } from "vue";
import { useDark, useMounted, useToggle } from "@vueuse/core";

interface Theme {
  isDark: Ref<boolean>;
  toggleTheme: () => void;
}

const themeKey: InjectionKey<Theme> = Symbol("theme");

export function provideTheme() {
  const dark = useDark({ storageKey: "theme" });
  const mounted = useMounted();
  // Keep the server and first client render identical. The inline script
  // applies the visual theme before hydration; controls catch up afterward.
  const isDark = computed(() => mounted.value && dark.value);
  const toggleTheme = useToggle(dark);

  provide(themeKey, { isDark, toggleTheme });
}

export function useTheme() {
  const theme = inject(themeKey);
  if (!theme) throw new Error("useTheme requires provideTheme in the app root");
  return theme;
}
