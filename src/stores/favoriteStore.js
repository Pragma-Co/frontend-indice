import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { useNotificationStore } from './notificationStore'

export const FAVORITES_STORAGE_KEY = 'indice.favorites'

function storageKey(userId) {
  return `${FAVORITES_STORAGE_KEY}.${userId ?? 'anonymous'}`
}

function readFavorites(userId, storage = globalThis.localStorage) {
  try {
    const stored = JSON.parse(storage?.getItem(storageKey(userId)) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export const useFavoriteStore = defineStore('favorites', {
  state: () => ({
    userId: null,
    items: [],
  }),

  actions: {
    load() {
      const userId = useAuthStore().currentUser?.id ?? null
      if (userId === this.userId && this.items.length) return
      this.userId = userId
      this.items = readFavorites(userId)
    },

    isFavorite(documentId) {
      return this.items.some((item) => item.id === documentId)
    },

    persist() {
      try {
        globalThis.localStorage?.setItem(storageKey(this.userId), JSON.stringify(this.items))
      } catch (error) {
        console.warn(error)
      }
    },

    toggle(document) {
      this.load()
      const notifications = useNotificationStore()

      if (this.isFavorite(document.id)) {
        this.items = this.items.filter((item) => item.id !== document.id)
        notifications.success('Documento removido dos favoritos.')
      } else {
        this.items = [document, ...this.items]
        notifications.success('Documento adicionado aos favoritos.')
      }
      this.persist()
    },
  },
})
