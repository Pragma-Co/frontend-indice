import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', {
  state: () => ({
    lastSearch: {},
    currentTerm: '',
  }),

  getters: {
    hasLastSearch: (state) => Object.keys(state.lastSearch).length > 0,
  },

  actions: {
    remember(query = {}) {
      this.lastSearch = { ...query }
    },

    forget() {
      this.lastSearch = {}
    },

    setCurrentTerm(term = '') {
      this.currentTerm = String(term ?? '').trim()
    },

    clearCurrentTerm() {
      this.currentTerm = ''
    },
  },
})
