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
      path: '/documentos',
      name: 'document-list',
      component: () => import('../views/document/DocumentsListView.vue'),
      meta: { title: 'Colaborador - Documentos' },
    },
    {
      path: '/documentos/:documentId',
      name: 'document-details',
      component: () => import('../views/document/DocumentDetailsView.vue'),
      meta: { title: 'Colaborador - Visualizar documento' },
    },
    {
      path: '/documentos/upload',
      name: 'document-upload',
      component: () => import('../views/document/components/DocumentUpload.vue'),
      meta: { title: 'Colaborador - InserirDocumento' },
    },
    {
      path: '/documentos/metadados',
      name: 'document-metadata',
      component: () => import('../views/document/components/DocumentMetadata.vue'),
      meta: { title: 'Colaborador - Metadados' },
    },
    {
      path: '/documentos/confirmacao',
      name: 'document-confirmation',
      component: () => import('../views/document/components/DocumentConfirmation.vue'),
      meta: { title: 'Colaborador - Confirmação' },
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ?? 'Índice'
})

export default router
