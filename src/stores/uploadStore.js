import { defineStore } from 'pinia'

export const useUploadStore = defineStore('upload', {
  state: () => ({
    uploadedDocuments: [],
  }),
  actions: {
    setUploadedDocuments(documents) {
      this.uploadedDocuments = documents
    },
    removeDocuments(documentIds) {
      this.uploadedDocuments = this.uploadedDocuments.filter(
        (document) => !documentIds.includes(document.id),
      )
    },
    reset() {
      this.uploadedDocuments = []
    },
  },
})
