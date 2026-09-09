import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: { name: 'document-upload' } },
  { path: '/documents', redirect: { name: 'document-upload' } },
  {
    path: '/documents/new',
    name: 'document-upload',
    component: () => import('../views/DocumentUploadView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
