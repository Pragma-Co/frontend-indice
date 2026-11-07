import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useSearchStore } from '../stores/searchStore'

const PATHS_WITHOUT_REDIRECT = ['/', '/home']

export function loginLocation(fullPath) {
  if (!fullPath || PATHS_WITHOUT_REDIRECT.includes(fullPath)) return { name: 'login' }
  return { name: 'login', query: { redirect: fullPath } }
}

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
      meta: { title: 'Colaborador - Documentos', collaboratorOnly: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('../views/document/FavoritesListView.vue'),
      meta: { title: 'Colaborador - Favoritos' },
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
      component: () => import('../views/manager/ReviewPanelView.vue'),
      meta: { title: 'Gestor - Painel de gestão', managerOnly: true },
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
      component: () => import('../views/user-management/UserManagementView.vue'),
      meta: { title: 'Índice - Gestão do Titular' },
    },
  ],
})

router.beforeEach(async (to, from) => {
  if (to.path === from.path && JSON.stringify(to.query) === JSON.stringify(from.query)) {
    return false
  }

  const auth = useAuthStore()
  await auth.ensureSession()

  if (to.name === 'login' && auth.isAuthenticated) return { name: 'home' }
  if (to.meta.public) return true
  if (!auth.isAuthenticated) return loginLocation(to.fullPath)
  if (to.meta.managerOnly && !auth.isManager) return { name: 'home' }
  if (to.meta.collaboratorOnly && auth.isManager) return { name: 'home' }
  return true
})

router.afterEach((to, from) => {
  const searchStore = useSearchStore()
  const isLeavingSearchRoutes =
    ['home', 'results'].includes(from.name) && !['home', 'results'].includes(to.name)
  if (isLeavingSearchRoutes) {
    searchStore.clearCurrentTerm()
    searchStore.forget()
  }
  document.title = to.meta.title ?? 'Índice'
})

export default router
