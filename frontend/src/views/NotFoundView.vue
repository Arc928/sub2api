<template>
  <div class="flex min-h-screen items-center justify-center bg-canvas px-4 dark:bg-dark-950">
    <div class="w-full max-w-md text-center">
      <!-- 404 Display: bracketed ASCII marker (the brand's iconography) -->
      <div class="mb-8">
        <div class="text-[64px] font-bold leading-none text-ink dark:text-gray-100">[404]</div>
        <div class="mt-2 text-sm text-gray-500 dark:text-dark-200">[-] page not found</div>
      </div>

      <!-- Text Content -->
      <div class="mb-8">
        <h1 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          {{ t('errors.pageNotFound') }}
        </h1>
        <p class="text-gray-500 dark:text-dark-400">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col justify-center gap-3 sm:flex-row">
        <button @click="goBack" class="btn btn-secondary">
          <Icon name="arrowLeft" size="md" class="mr-2" />
          Go Back
        </button>
        <router-link to="/dashboard" class="btn btn-primary">
          <Icon name="home" size="md" class="mr-2" />
          Go to Dashboard
        </router-link>
      </div>

      <!-- Help Link -->
      <p class="mt-8 text-sm text-gray-400 dark:text-dark-500">
        Need help?
        <a
          href="#"
          class="text-primary-600 transition-colors hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Contact support
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const router = useRouter()

function goBack(): void {
  router.back()
}
</script>
