import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/LoginView.vue'),
      meta: { title: 'Índice - Entrar', public: true },
    },
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
      path: '/documents',
      name: 'document-list',
      component: () => import('../views/document/DocumentsListView.vue'),
      meta: { title: 'Colaborador - Documentos' },
    },
    {
      path: '/documents/:documentId',
      name: 'document-details',
      component: () => import('../views/document/DocumentDetailsView.vue'),
      meta: { title: 'Colaborador - Visualizar documento' },
    },
    {
      path: '/documents/:documentId/new-revision',
      name: 'document-new-revision',
      component: () => import('../views/document/NewRevisionView.vue'),
      meta: { title: 'Colaborador - Nova revisão' },
    },
    {
      path: '/documents/upload',
      name: 'document-upload',
      component: () => import('../views/document/components/DocumentUpload.vue'),
      meta: { title: 'Colaborador - Inserir Documento' },
    },
    {
      path: '/documents/metadata',
      name: 'document-metadata',
      component: () => import('../views/document/components/DocumentMetadata.vue'),
      meta: { title: 'Colaborador - Metadados' },
    },
    {
      path: '/documents/confirmation',
      name: 'document-confirmation',
      component: () => import('../views/document/components/DocumentConfirmation.vue'),
      meta: { title: 'Colaborador - Confirmação' },
    },
    {
      path: '/revisions',
      name: 'revisions',
      component: () => import('../views/UnderConstructionView.vue'),
      meta: { title: 'Gestor - Revisões', heading: 'Revisões', managerOnly: true },
    },
    {
      path: '/collaborators',
      name: 'collaborators',
      component: () => import('../views/UnderConstructionView.vue'),
      meta: { title: 'Gestor - Colaboradores', heading: 'Colaboradores', managerOnly: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/UnderConstructionView.vue'),
      meta: { title: 'Índice - Gestão do Titular', heading: 'Gestão do Titular' },
    },
  ],
})

router.beforeEach((to, from) => {
  if (to.path === from.path && JSON.stringify(to.query) === JSON.stringify(from.query)) {
    return false
  }

  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.managerOnly && !auth.isManager) return { name: 'home' }
})

router.afterEach((to) => {
  document.title = to.meta.title ?? 'Índice'
})

export default router
