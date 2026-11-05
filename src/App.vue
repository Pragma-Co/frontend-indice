<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToastContainer from './components/common/ToastContainer.vue'
import Navbar from './components/layout/Navbar.vue'
import { useAuthStore } from './stores/authStore'

const route = useRoute()
const auth = useAuthStore()

const showNavbar = computed(() => auth.isAuthenticated && !route.meta.public)
</script>

<template>
  <Navbar v-if="showNavbar" />
  <ToastContainer />
  <RouterView />
</template>
