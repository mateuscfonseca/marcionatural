import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: () => import('@/views/Leaderboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-entries',
      name: 'MyEntries',
      component: () => import('@/views/MyEntries.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects',
      name: 'Projects',
      component: () => import('@/views/Projects.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('@/views/Users.vue'),
      meta: { requiresAuth: true, title: 'Usuários' },
    },
    {
      path: '/users/:userId/entries',
      name: 'UserEntries',
      component: () => import('@/views/UserEntries.vue'),
      meta: { requiresAuth: true, title: 'Entradas do Usuário' },
    },
    {
      path: '/voting',
      name: 'Voting',
      component: () => import('@/views/Voting.vue'),
      meta: { requiresAuth: true, title: 'Votação' },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const auth = useAuth()

  // Aguarda a autenticação ser verificada antes de decidir
  if (auth.state.loading) {
    next()
    return
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && auth.isAuthenticated()) {
    next('/leaderboard')
  } else {
    next()
  }
})

export default router
