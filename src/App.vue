<script setup lang="ts">
import SiteFooter from "./components/SiteFooter.vue";
import SiteHeader from "./components/SiteHeader.vue";
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen flex-col">
    <SiteHeader />
    <main class="mx-auto w-full max-w-3xl flex-1 px-5 pt-10 pb-16 sm:px-6">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>
