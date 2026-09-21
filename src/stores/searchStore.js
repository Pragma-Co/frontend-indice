import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', {
  state: () => ({
    lastSearch: {},
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
  },
})
