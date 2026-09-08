import { defineStore } from 'pinia'

export const useUploadStore = defineStore('upload', {
  state: () => ({
    uploadedDocuments: [],
  }),
  actions: {
    setUploadedDocuments(documents) {
      this.uploadedDocuments = documents
    },
    reset() {
      this.uploadedDocuments = []
    },
  },
})
