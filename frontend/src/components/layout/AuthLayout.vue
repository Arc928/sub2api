<template>
  <div
    class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-4 dark:bg-dark-950"
    :class="{ 'auth-home-background': homeBackground }"
  >
    <HomeBackground v-if="homeBackground" :site-name="siteName" />
    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="mb-8 text-center">
        <!-- Custom Logo or Default Logo -->
        <template v-if="settingsLoaded">
          <img
            :src="siteLogo || '/logo.svg'"
            alt="Logo"
            class="mb-4 inline-block h-16 w-16 object-contain"
          />
          <h1 class="mb-2 text-2xl font-bold text-ink dark:text-gray-50">
            {{ siteName }}
          </h1>
          <p class="auth-subtitle text-sm text-gray-500 dark:text-dark-200">
            {{ siteSubtitle }}
          </p>
        </template>
      </div>

      <!-- Form surface stays readable over the animated background. -->
      <div class="auth-card card p-6 sm:p-8">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="auth-copyright mt-8 text-center text-xs text-gray-500 dark:text-dark-300">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'
import HomeBackground from '@/components/home/HomeBackground.vue'

withDefaults(defineProps<{ homeBackground?: boolean }>(), { homeBackground: false })

const appStore = useAppStore()

const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'Subscription to API Conversion Platform')
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.auth-home-background .auth-card {
  border-radius: 20px;
  border-color: rgb(255 255 255 / 60%);
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 24px 60px -20px rgb(15 23 42 / 25%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.dark .auth-home-background .auth-card {
  border-color: rgb(255 255 255 / 20%);
  background: rgb(11 18 32 / 90%);
  box-shadow: 0 24px 60px -20px rgb(0 0 0 / 60%);
}

.dark .auth-home-background .auth-subtitle,
.dark .auth-home-background .auth-copyright {
  color: #dce6f3;
}
</style>
