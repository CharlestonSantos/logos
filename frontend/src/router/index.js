// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [

    // ── Auth (sem layout autenticado) ──────────────────────────
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/cadastro',
      name: 'Register',
      component: () => import('@/modules/auth/views/RegisterView.vue'),
      meta: { guest: true },
    },

    // ── App principal (layout autenticado) ────────────────────
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/modules/study/views/DashboardView.vue'),
        },
        {
          path: 'estudo/:id',
          name: 'StudyDetail',
          component: () => import('@/modules/study/views/StudyDetailView.vue'),
        },
        {
          path: 'leitura',
          name: 'Bible',
          component: () => import('@/modules/bible/views/BibleView.vue'),
        },
        {
          path: 'notas',
          name: 'Notes',
          component: () => import('@/modules/notes/views/NotesView.vue'),
        },
        {
          path: 'perfil',
          name: 'Profile',
          component: () => import('@/modules/auth/views/ProfileView.vue'),
        },
      ],
    },

    // ── Fallback ───────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ── Navigation Guard ─────────────────────────────────────────
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }
})

export default router
