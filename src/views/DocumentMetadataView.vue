<script setup>
import { useUploadStore } from '../stores/uploadStore'

const uploadStore = useUploadStore()
</script>

<template>
  <main class="page">
    <h1>Formulário de metadados</h1>
    <p>{{ uploadStore.uploadedDocuments.length }} arquivo(s) recebido(s) da etapa de upload.</p>
  </main>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}
</style>
