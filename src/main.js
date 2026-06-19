import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import './assets/styles.css'
import App from './App.vue'
import router from './router/index.js'

createApp(App).use(router).mount('#app')
