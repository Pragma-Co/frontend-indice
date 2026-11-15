import { defineStore } from 'pinia'
import { acceptLegalTerms, fetchPendingLegalTerms } from '../api/users'

export const useLegalConsentStore = defineStore('legalConsent', {
  state: () => ({
    pending: [],
    accepting: false,
    error: '',
  }),
  getters: {
    current: (state) => state.pending[0] ?? null,
    isBlocking: (state) => state.pending.length > 0,
  },
  actions: {
    async refresh() {
      try {
        const response = await fetchPendingLegalTerms()
        this.pending = response?.results ?? []
      } catch (failure) {
        if (failure?.status === 401) this.pending = []
      }
    },
    async accept() {
      const document = this.current
      const version = document?.current_version
      if (this.accepting || !version) return false
      this.accepting = true
      this.error = ''
      try {
        await acceptLegalTerms({
          versionId: version.id,
          consents: version.clauses.map((clause) => ({ clause_id: clause.id, accepted: true })),
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
      this.accepting = false
      this.error = ''
    },
  },
})
