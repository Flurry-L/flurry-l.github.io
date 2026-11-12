<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IconBrandGithub,
  IconMenu2,
  IconMoon,
  IconSun,
  IconX,
} from "@tabler/icons-vue";

import { SITE, SOCIALS } from "../config";
import { useTheme } from "../composables/useTheme";
import SiteSearch from "./SiteSearch.vue";

const navItems = [
  { name: "home", label: "首页" },
  { name: "links", label: "友链" },
  { name: "about", label: "关于" },
];

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const menuOpen = ref(false);
const github = SOCIALS.find(social => social.name === "github");

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
        :to="{ name: 'home' }"
        class="hover:text-accent text-lg font-bold transition-colors"
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
            :key="item.name"
            :to="{ name: item.name }"
            class="hover:text-accent transition-colors"
            active-class=""
            exact-active-class="text-accent font-medium"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <SiteSearch
          :data-pf-theme="isDark ? 'dark' : 'light'"
          @click="closeMenu"
        />

        <a
          v-if="github"
          :href="github.url"
          target="_blank"
          rel="noopener noreferrer"
          class="header-action icon-wobble hidden sm:inline-flex"
          aria-label="GitHub"
          title="GitHub"
        >
          <IconBrandGithub class="size-5" aria-hidden="true" />
        </a>

        <button
          type="button"
          class="header-action icon-wobble inline-flex"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <IconSun v-if="isDark" class="size-5" aria-hidden="true" />
          <IconMoon v-else class="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="header-action inline-flex sm:hidden"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
          @click="menuOpen = !menuOpen"
        >
          <IconX v-if="menuOpen" class="size-5" aria-hidden="true" />
          <IconMenu2 v-else class="size-5" aria-hidden="true" />
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
        :key="item.name"
        :to="{ name: item.name }"
        class="hover:text-accent block rounded-md px-2 py-2 text-sm transition-colors"
        active-class=""
        exact-active-class="text-accent font-medium"
        @click="closeMenu"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </header>
</template>
