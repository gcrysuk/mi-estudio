import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      initializeAuth: () => {
        const token = localStorage.getItem('access_token')
        const refresh = localStorage.getItem('refresh_token')
        if (token && refresh) {
          set({ token, refreshToken: refresh, isAuthenticated: true })
          get().fetchProfile()
        }
      },

      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login/', { username, password })
          const {
            access, refresh, user_id, username: userName, email,
            is_superuser, is_staff, nombre, apellido, plan,
          } = response.data

          localStorage.setItem('access_token', access)
          localStorage.setItem('refresh_token', refresh)

          set({
            token: access,
            refreshToken: refresh,
            user: { id: user_id, username: userName, email, is_superuser, is_staff, nombre, apellido, plan },
            isAuthenticated: true,
            isLoading: false,
          })
          return { ok: true }
        } catch (error) {
          const detail = error.response?.data?.detail || 'Error de autenticación'
          const code = error.response?.data?.code || ''
          set({ error: detail, isLoading: false })
          return { ok: false, detail, code }
        }
      },

      logout: async () => {
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) {
          try { await api.post('/auth/logout/', { refresh }) } catch { /* ignorar */ }
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },

      fetchProfile: async () => {
        try {
          const response = await api.get('/auth/profile/')
          const { id, username, email, is_superuser, is_staff, nombre, apellido, plan, email_verificado } = response.data
          set(state => ({
            user: { ...state.user, id, username, email, is_superuser, is_staff, nombre, apellido, plan, email_verificado },
          }))
        } catch (error) {
          console.error('Error fetching profile:', error)
        }
      },
    }),
    { name: 'auth-storage' }
  )
)

export default useAuthStore
