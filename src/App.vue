<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <!-- Global site nav — sits outside every page's #export-root so it never
       leaks into a PNG export. -->
  <nav class="site-nav" aria-label="Primary">
    <RouterLink :to="{ name: 'atlas' }" class="site-nav__link" active-class="is-active" exact>
      Church Atlas
    </RouterLink>
    <span class="site-nav__sep" aria-hidden="true">·</span>
    <RouterLink :to="{ name: 'traverse' }" class="site-nav__link" active-class="is-active">
      Traverse
    </RouterLink>
  </nav>

  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>
</template>

<style scoped>
.site-nav {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: rgba(245, 237, 222, 0.92);
  border: 1px solid var(--rule-soft);
  border-radius: 999px;
  box-shadow: 0 6px 22px -12px rgba(26, 23, 20, 0.5);
  backdrop-filter: blur(6px);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.site-nav__link {
  color: rgba(26, 23, 20, 0.5);
  text-decoration: none;
  padding: 3px 8px;
  border-radius: 999px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.site-nav__link:hover {
  color: var(--ink);
}
.site-nav__link.is-active {
  color: var(--paper);
  background: var(--burgundy);
}
.site-nav__sep {
  color: var(--rule-soft);
}
</style>
