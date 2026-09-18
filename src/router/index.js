import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/home/HomeView.vue'),
      meta: { title: 'Colaborador - Início' },
    },
    {
      path: '/results',
      name: 'results',
      component: () => import('../views/document/components/ResultsList.vue'),
      meta: { title: 'Colaborador - Resultados' },
    },
    {
      path: '/documentos',
      name: 'document-list',
      component: () => import('../views/DocumentListView.vue'),
      meta: { title: 'Colaborador - Documentos' },
    },
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
    {
      path: '/documentos/confirmacao',
      name: 'document-confirmation',
      component: () => import('../views/DocumentConfirmationView.vue'),
      meta: { title: 'Colaborador - Confirmação' },
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ?? 'Índice'
})

export default router
