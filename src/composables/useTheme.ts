import { inject, onMounted, provide, ref } from "vue";
import type { InjectionKey, Ref } from "vue";

interface Theme {
  isDark: Ref<boolean>;
  toggleTheme: () => void;
}

const themeKey: InjectionKey<Theme> = Symbol("theme");

export function provideTheme() {
  // Keep the server and first client render identical. The inline script
  // applies the visual theme before hydration; controls catch up afterward.
  const isDark = ref(false);

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains("dark");
  });

  function toggleTheme() {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle("dark", isDark.value);
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
  }

  provide(themeKey, { isDark, toggleTheme });
}

export function useTheme() {
  const theme = inject(themeKey);
  if (!theme) throw new Error("useTheme requires provideTheme in the app root");
  return theme;
}
