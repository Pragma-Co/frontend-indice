import { defineStore } from 'pinia'

const DEFAULT_TIMEOUT_MS = 5000
const ERROR_TIMEOUT_MS = 8000

let nextId = 1

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [],
  }),

  actions: {
    notify({ type = 'info', message, timeout = DEFAULT_TIMEOUT_MS }) {
      const id = nextId++
      this.items.push({ id, type, message })
      if (timeout > 0) setTimeout(() => this.dismiss(id), timeout)
      return id
    },

    success(message, options = {}) {
      return this.notify({ type: 'success', message, ...options })
    },

    error(message, options = {}) {
      return this.notify({ type: 'error', message, timeout: ERROR_TIMEOUT_MS, ...options })
    },

    dismiss(id) {
      this.items = this.items.filter((item) => item.id !== id)
    },

    clear() {
      this.items = []
    },
  },
})
