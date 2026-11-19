import { defineStore } from 'pinia'
import { acceptLegalTerms, fetchPendingLegalTerms } from '../api/users'

let inflight = null

export const useLegalConsentStore = defineStore('legalConsent', {
  state: () => ({
    pending: [],
    checked: false,
    accepting: false,
    error: '',
  }),
  getters: {
    current: (state) => state.pending[0] ?? null,
    isBlocking: (state) => state.pending.length > 0,
  },
  actions: {
    refresh() {
      if (inflight) return inflight
      inflight = (async () => {
        try {
          const response = await fetchPendingLegalTerms()
          this.pending = response?.results ?? []
          this.checked = true
        } catch (failure) {
          if (failure?.status === 401) this.pending = []
        } finally {
          inflight = null
        }
      })()
      return inflight
    },
    async accept(consents) {
      const document = this.current
      const version = document?.current_version
      if (this.accepting || !version || !consents?.length) return false
      this.accepting = true
      this.error = ''
      try {
        await acceptLegalTerms({
          versionId: version.id,
          consents,
        })
        await this.refresh()
        return true
      } catch (failure) {
        const code = failure?.details?.error
        if (code === 'LegalVersionAlreadyAccepted' || code === 'OutdatedLegalVersion') {
          await this.refresh()
        } else {
          this.error = 'Não foi possível registrar o aceite. Tente novamente.'
        }
        return false
      } finally {
        this.accepting = false
      }
    },
    reset() {
      this.pending = []
      this.checked = false
      this.accepting = false
      this.error = ''
    },
  },
})
