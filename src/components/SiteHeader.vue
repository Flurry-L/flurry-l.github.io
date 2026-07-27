<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

import { SITE, SOCIALS } from "../config";
import { useTheme } from "../composables/useTheme";
import SearchDialog from "./SearchDialog.vue";

interface NavItem {
  to: string;
  label: string;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "首页", exact: true },
  { to: "/links", label: "友链" },
  { to: "/about", label: "关于" },
];

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const menuOpen = ref(false);
const searchOpen = ref(false);
const githubUrl = SOCIALS.find(social => social.name === "github")?.url ?? "#";

function isActive(item: NavItem): boolean {
  if (item.exact) return route.path === item.to;
  return route.path.startsWith(item.to);
}

function closeMenu() {
  menuOpen.value = false;
}

watch(() => route.fullPath, closeMenu);
</script>

<template>
  <header
    class="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur"
  >
    <div
      class="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 sm:px-6"
    >
      <RouterLink
        to="/"
        class="hover:text-accent text-lg font-bold tracking-tight transition-colors"
        @click="closeMenu"
      >
        {{ SITE.title }}
      </RouterLink>

      <div class="flex items-center gap-1">
        <nav
          class="hidden items-center gap-4 pr-3 text-sm sm:flex"
          aria-label="主导航"
        >
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="hover:text-accent transition-colors"
            :class="
              isActive(item) ? 'text-accent font-medium' : 'text-foreground'
            "
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <button
          type="button"
          class="icon-wobble text-muted-foreground hover:text-accent rounded-md p-2 transition-colors"
          aria-label="搜索"
          @click="searchOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        <a
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="icon-wobble text-muted-foreground hover:text-accent hidden rounded-md p-2 transition-colors sm:block"
          aria-label="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <path
              d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"
            />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>

        <button
          type="button"
          class="icon-wobble text-muted-foreground hover:text-accent rounded-md p-2 transition-colors"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <svg
            v-if="isDark"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </button>

        <button
          type="button"
          class="text-muted-foreground hover:text-accent rounded-md p-2 transition-colors sm:hidden"
          :aria-expanded="menuOpen"
          aria-label="打开导航菜单"
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="menuOpen"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <nav
      v-if="menuOpen"
      class="border-border border-t px-5 py-3 sm:hidden"
      aria-label="移动端导航"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="hover:text-accent block rounded-md px-2 py-2 text-sm transition-colors"
        :class="isActive(item) ? 'text-accent font-medium' : 'text-foreground'"
        @click="closeMenu"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <SearchDialog v-if="searchOpen" @close="searchOpen = false" />
  </header>
</template>
