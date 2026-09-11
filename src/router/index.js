import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/documentos/upload' },
    // Navbar targets. Placeholders until the home screen and the documents list (SCRUM-32) exist.
    { path: '/home', redirect: '/documentos/upload' },
    { path: '/documentos', redirect: '/documentos/upload' },
    {
      path: '/documentos/upload',
      name: 'document-upload',
      component: () => import('../views/DocumentUploadView.vue'),
      meta: { title: 'Colaborador - InserirDocumento' },
    },
    {
      path: '/documentos/metadados',
      name: 'document-metadata',
      component: () => import('../views/DocumentMetadataView.vue'),
      meta: { title: 'Colaborador - Metadados' },
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ?? 'Índice'
})

export default router
