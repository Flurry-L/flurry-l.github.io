<script setup lang="ts">
import { watchEffect } from "vue";
import { pages } from "virtual:pages";

import { SITE, SOCIALS } from "../config";

const about = pages.about;

const contacts = [
  ...SOCIALS.map(social => ({
    label: social.name === "github" ? "GitHub" : "Mail",
    url: social.url,
  })),
  { label: "RSS", url: "/rss.xml" },
];

watchEffect(() => {
  document.title = `${about.title} | ${SITE.title}`;
});
</script>

<template>
  <img
    src="/avatar.jpg"
    alt="Flurry 的头像"
    class="border-border mb-6 size-24 rounded-full border"
    width="96"
    height="96"
  />
  <h1 class="text-2xl font-bold tracking-tight">{{ about.title }}</h1>
  <div class="mt-3 mb-8 flex gap-4 text-sm">
    <a
      v-for="contact in contacts"
      :key="contact.url"
      :href="contact.url"
      target="_blank"
      rel="noopener noreferrer"
      class="text-accent hover:underline"
    >
      {{ contact.label }}
    </a>
  </div>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="prose max-w-none" v-html="about.html" />
</template>
