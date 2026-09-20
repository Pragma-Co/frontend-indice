<script setup>
import ToastContainer from './components/common/ToastContainer.vue'
import Navbar from './components/layout/Navbar.vue'
</script>

<template>
  <Navbar />
  <ToastContainer />
  <RouterView />
</template>
