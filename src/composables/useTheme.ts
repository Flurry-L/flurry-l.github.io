import { ref } from "vue";

// The initial value matches the inline script in index.html, which applies
// the dark class before the app mounts to avoid a flash of the wrong theme.
const isDark = ref(document.documentElement.classList.contains("dark"));

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle("dark", isDark.value);
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
  }

  return { isDark, toggleTheme };
}
