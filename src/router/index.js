import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history keeps deep links working on GitHub Pages without a server-side
// 404 fallback. Routes are lazy-loaded so the church atlas and the Traverse
// tool (which pulls in Mapbox GL) never ship in the same initial chunk.
const routes = [
  {
    path: '/',
    name: 'atlas',
    component: () => import('../views/ChurchAtlasView.vue'),
    meta: { title: 'Gathera SDA District — Church Atlas' },
  },
  {
    path: '/traverse',
    name: 'traverse',
    component: () => import('../views/DistanceToolView.vue'),
    // Generic document title so a shared link reads neutrally in the browser
    // tab / history (the in-app brand is still "Traverse").
    meta: { title: 'Distance & Route Map' },
  },
  // Unknown paths fall back to the atlas home.
  { path: '/:pathMatch(.*)*', redirect: { name: 'atlas' } },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  if (to.meta?.title) document.title = to.meta.title
})

export default router
