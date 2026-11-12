<script setup lang="ts">
import { pages } from "virtual:pages";

import MarkdownContent from "../components/MarkdownContent.vue";
import { SOCIALS } from "../config";

const about = pages.about;

const contacts = [
  ...SOCIALS.map(social => ({
    label: social.name === "github" ? "GitHub" : "Mail",
    url: social.url,
  })),
  { label: "RSS", url: "/rss.xml" },
];
</script>

<template>
  <article data-pagefind-body>
    <img
      src="/avatar.jpg"
      alt="Flurry 的头像"
      class="border-border mb-6 size-24 rounded-full border"
      width="96"
      height="96"
    />
    <h1 data-pagefind-meta="title" class="text-2xl font-bold">
      {{ about.title }}
    </h1>
    <div data-pagefind-ignore="all" class="mt-3 mb-8 flex gap-4 text-sm">
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
    <MarkdownContent :html="about.html" />
  </article>
</template>
