<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'

const route = useRoute()

const heading = computed(() => route.meta.heading ?? 'Em construção')
</script>

<template>
  <PageLayout :title="heading" subtitle="Esta tela ainda está em construção." />
</template>
