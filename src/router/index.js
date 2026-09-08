import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: { name: 'document-upload' } },
  { path: '/documentos', redirect: { name: 'document-upload' } },
  {
    path: '/documentos/novo',
    name: 'document-upload',
    component: () => import('../views/DocumentUploadView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
