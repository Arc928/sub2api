<template>
  <!-- Custom Home Content: Full Page Mode -->
  <div v-if="hasHomeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode - SECURITY: homeContent is admin-only setting, XSS risk is acceptable -->
    <div v-else v-html="homeContent"></div>
  </div>

  <!-- Built-in Home Page -->
  <div
    v-else
    data-testid="home-page"
    class="relative isolate min-h-screen overflow-hidden bg-canvas text-ink dark:bg-dark-950 dark:text-gray-50"
  >
    <HomeBackground :site-name="siteName" />

    <!-- Header -->
    <header class="relative z-10 px-4 py-4 sm:px-6">
      <nav class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <!-- Logo + wordmark -->
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img
            :src="siteLogo || '/logo.svg'"
            alt="Logo"
            class="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-white/60 dark:ring-white/10"
          />
          <span class="hidden min-w-0 truncate text-base font-bold sm:inline">{{ siteName }}</span>
        </div>
        <div class="home-nav-actions flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5 rounded-full p-1.5 sm:gap-2 dark:bg-[#0b1220]/80 dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:backdrop-blur-xl">
          <LocaleSwitcher class="home-locale" />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-white dark:hover:bg-white/10"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>
          <button
            class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-white dark:hover:bg-white/10"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>
          <button
            class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-white dark:hover:bg-white/10"
            :title="t('home.viewDocs')"
            type="button"
          >
            <Icon name="bell" size="md" />
          </button>
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-white/70 hover:text-ink dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            :title="t('nav.modelPlaza')"
          >
            <Icon name="grid" size="md" />
            <span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span>
          </router-link>
          <!-- Login / Dashboard CTA — first unconditional RouterLink in this branch -->
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(56,89,170,0.55)] transition-all hover:from-sky-600 hover:to-indigo-600 hover:shadow-[0_10px_28px_-6px_rgba(56,89,170,0.65)] dark:from-sky-400 dark:to-indigo-400 dark:text-slate-900"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
            <Icon name="arrowRight" size="sm" />
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <main data-home-hero class="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 md:pt-16 lg:gap-16">
      <section class="flex min-w-0 flex-col justify-center">
        <span
          class="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        >
          <Icon name="sparkles" size="xs" class="text-sky-500" />
          {{ t('home.heroEyebrow') }}
        </span>
        <h1
          class="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl"
        >
          {{ t('home.heroTitleLine1') }}
          <span class="mt-1 block text-slate-900/90 dark:text-white/85">{{ t('home.heroTitleLine2') }}</span>
          <span
            class="mt-1 block bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent"
          >
            {{ t('home.heroTitleLine3') }}
          </span>
        </h1>
        <p class="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {{ siteSubtitle }}
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] transition-all hover:bg-slate-800 hover:shadow-[0_10px_28px_-6px_rgba(15,23,42,0.45)] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
            <Icon name="arrowRight" size="sm" />
          </router-link>
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/70 px-6 text-sm font-semibold text-slate-800 backdrop-blur transition-all hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <Icon name="book" size="sm" />
            {{ t('home.docs') }}
          </a>
        </div>
      </section>

      <!-- Glassmorphic API endpoint card -->
      <aside data-home-endpoint class="relative min-w-0">
        <div
          class="relative overflow-hidden rounded-[20px] border border-white/50 bg-white/55 p-5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/20 dark:bg-[#0b1220]/85 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-1.5" aria-hidden="true">
              <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
              <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
              <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
            </div>
            <span
              class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-[#dce6f3]"
            >
              {{ t('home.endpointCard.label') }}
            </span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="(ep, i) in endpointCards"
              :key="ep.endpoint + i"
              class="flex items-center gap-3 rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                aria-hidden="true"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {{ ep.name }}
                  </span>
                  <span
                    v-if="ep.description"
                    class="hidden truncate text-xs text-slate-500 dark:text-[#dce6f3] sm:inline"
                  >
                    {{ ep.description }}
                  </span>
                </div>
                <div
                  class="truncate font-mono text-xs text-slate-500 dark:text-[#dce6f3]"
                  :title="ep.endpoint"
                >
                  {{ ep.endpoint }}
                </div>
              </div>
              <Icon name="bolt" size="sm" class="shrink-0 text-slate-400 dark:text-[#dce6f3]" />
              <button
                type="button"
                class="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-white dark:hover:bg-white/15 dark:hover:text-white"
                :title="t('home.endpointCard.copy')"
                @click="copyEndpoint(ep.endpoint, ep.name)"
              >
                <Icon :name="copiedId === ep.name ? 'check' : 'copy'" size="xs" />
                <span class="hidden sm:inline">
                  {{ copiedId === ep.name ? t('home.endpointCard.copied') : t('home.endpointCard.copy') }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </main>

    <!-- Footer -->
    <footer
      class="relative z-10 border-t border-white/40 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-[#cbd5e1]"
    >
      &copy; {{ currentYear }} {{ siteName }}
    </footer>
  </div>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import HomeBackground from '@/components/home/HomeBackground.vue'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'
import { useClipboard } from '@/composables/useClipboard'

const { t } = useI18n()

const authStore = useAuthStore()
const appStore = useAppStore()

// Site settings - directly from appStore (already initialized from injected config)
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'AI API Gateway Platform')
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || ''))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => homeContent.value.trim().length > 0)
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const modelPlazaRequiresAuth = computed(
  () => appStore.cachedPublicSettings?.model_plaza_require_auth === true,
)
const showModelPlazaEntry = computed(
  () => modelPlazaEnabled.value && (isAuthenticated.value || !modelPlazaRequiresAuth.value),
)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')

// Endpoint list for sky-glass hero card
type EndpointEntry = { name: string; endpoint: string; description: string }
const endpointCards = computed<EndpointEntry[]>(() => {
  const settings = appStore.cachedPublicSettings as
    | (Record<string, unknown> & { custom_endpoints?: EndpointEntry[]; api_base_url?: string })
    | null
  const raw = settings?.custom_endpoints ?? []
  const list = Array.isArray(raw) ? raw.filter((ep): ep is EndpointEntry => !!ep && !!ep.endpoint) : []
  if (list.length > 0) {
    return list.map((ep) => ({
      name: ep.name,
      endpoint: sanitizeUrl(ep.endpoint, { allowRelative: true }),
      description: ep.description,
    }))
  }
  // Fallback: derive a single default endpoint from current origin
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const fallback = origin
    ? `${origin.replace(/\/$/, '')}/v1`
    : (settings?.api_base_url || '/v1')
  return [
    {
      name: t('home.endpointCard.fallbackName'),
      endpoint: sanitizeUrl(fallback, { allowRelative: true }),
      description: t('home.endpointCard.fallbackDesc'),
    },
  ]
})

// Copy-to-clipboard for endpoint rows
const { copyToClipboard } = useClipboard()
const copiedId = ref<string | null>(null)
async function copyEndpoint(endpoint: string, name: string) {
  const ok = await copyToClipboard(endpoint, t('home.endpointCard.copied'))
  if (ok) {
    copiedId.value = name
    setTimeout(() => {
      if (copiedId.value === name) copiedId.value = null
    }, 2000)
  }
}

// Current year for footer
const currentYear = computed(() => new Date().getFullYear())

// Toggle theme
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme !== 'light'
  document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
  initTheme()

  // Check auth state
  authStore.checkAuth()

  // Ensure public settings are loaded (will use cache if already loaded from injected config)
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>

<style scoped>
/* Keep navigation legible over the bright parts of the animated background. */
.dark .home-locale :deep(button[title]),
.dark .home-locale :deep(button[title] svg) {
  color: #fff;
}

/* Browsers without backdrop-filter get a slightly more opaque fallback so the
   glass card still reads as a card instead of disappearing into the sky. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :where(.bg-white\/55) {
    background-color: rgba(255, 255, 255, 0.92);
  }

}
</style>
