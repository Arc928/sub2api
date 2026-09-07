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

  <!-- Compact Home Page (sky-glass hero) -->
  <div
    v-else-if="compactHomeEnabled"
    data-testid="compact-home"
    class="relative isolate min-h-screen overflow-hidden bg-canvas text-ink dark:bg-dark-950 dark:text-gray-50"
  >
    <!-- Sky gradient background -->
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#e8f1ff_0%,#f4f9ff_45%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_60%,#111827_100%)]"
      aria-hidden="true"
    ></div>
    <!-- Soft cloud-like blobs (pure CSS, no external assets) -->
    <div
      class="pointer-events-none absolute -left-32 top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(125,178,255,0.35),transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(56,89,170,0.35),transparent_70%)]"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute right-[-10%] top-1/3 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(167,196,255,0.28),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(40,80,160,0.28),transparent_70%)]"
      aria-hidden="true"
    ></div>
    <!-- Blurred brand wordmark top-right -->
    <div
      aria-hidden="true"
      class="sky-wordmark pointer-events-none absolute -right-12 -top-12 select-none font-black leading-none tracking-tight text-sky-700/25 dark:text-sky-300/20"
    >
      {{ siteName }}
    </div>
    <!-- Mouse-follow aurora: WebGL fluid + pattern particles (1:1 replica) -->
    <div
      v-if="fluidEnabled"
      aria-hidden="true"
      class="fluid-hero-bg pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen overflow-hidden"
    >
      <div class="hero-fluid">
        <canvas ref="fluidCanvas" class="fluid-bg"></canvas>
        <canvas ref="particleCanvas" class="particle-bg"></canvas>
      </div>
    </div>

    <!-- Header -->
    <header class="relative z-10 px-4 py-4 sm:px-6">
      <nav class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <!-- Logo + wordmark (intentionally not a router-link so the login CTA stays the first one in DOM order — required by HomeView.compact.spec.ts) -->
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img
            :src="siteLogo || '/logo.svg'"
            alt="Logo"
            class="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-white/60 dark:ring-white/10"
          />
          <span class="hidden min-w-0 truncate text-base font-bold sm:inline">{{ siteName }}</span>
        </div>
        <div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-dark-200 dark:hover:bg-white/10"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>
          <button
            class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-dark-200 dark:hover:bg-white/10"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>
          <button
            class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/70 dark:text-dark-200 dark:hover:bg-white/10"
            :title="t('home.viewDocs')"
            type="button"
          >
            <Icon name="bell" size="md" />
          </button>
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-white/70 hover:text-ink dark:text-dark-200 dark:hover:bg-white/10 dark:hover:text-white"
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
    <main class="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 md:pt-16 lg:gap-16">
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
      <aside class="relative min-w-0">
        <div
          class="relative overflow-hidden rounded-[20px] border border-white/50 bg-white/55 p-5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-1.5" aria-hidden="true">
              <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
              <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
              <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
            </div>
            <span
              class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300"
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
                    class="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:inline"
                  >
                    {{ ep.description }}
                  </span>
                </div>
                <div
                  class="truncate font-mono text-xs text-slate-500 dark:text-slate-300"
                  :title="ep.endpoint"
                >
                  {{ ep.endpoint }}
                </div>
              </div>
              <Icon name="bolt" size="sm" class="shrink-0 text-slate-400 dark:text-slate-500" />
              <button
                type="button"
                class="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
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
      class="relative z-10 border-t border-white/40 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400"
    >
      &copy; {{ currentYear }} {{ siteName }}
    </footer>
  </div>

  <!-- Default Home Page -->
  <div
    v-else
    class="flex min-h-screen flex-col bg-canvas text-ink dark:bg-dark-950 dark:text-gray-50"
  >
    <!-- Header (primary-nav: flat, hairline rule, 56px) -->
    <header class="border-b border-hairline dark:border-dark-700">
      <nav class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <!-- Logo + wordmark -->
        <router-link to="/" class="flex items-center gap-3">
          <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-7 w-7 rounded-sm object-contain" />
          <span class="text-base font-bold tracking-normal">{{ siteName }}</span>
        </router-link>

        <!-- Nav Actions -->
        <div class="flex items-center gap-1 sm:gap-2">
          <!-- Language Switcher -->
          <LocaleSwitcher />

          <!-- Doc Link -->
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-sm px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-surface-soft hover:text-ink dark:text-dark-200 dark:hover:bg-dark-700 dark:hover:text-white"
            :title="t('home.viewDocs')"
          >
            <span class="hidden sm:inline">{{ t('home.docs') }}</span>
            <Icon name="book" size="md" class="sm:hidden" />
          </a>

          <!-- Model Plaza Link -->
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="rounded-sm px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-surface-soft hover:text-ink dark:text-dark-200 dark:hover:bg-dark-700 dark:hover:text-white"
            :title="t('nav.modelPlaza')"
          >
            <span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span>
            <Icon name="grid" size="md" class="sm:hidden" />
          </router-link>

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="rounded-sm p-2 text-gray-500 transition-colors hover:bg-surface-soft hover:text-ink dark:text-dark-200 dark:hover:bg-dark-700 dark:hover:text-white"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>

          <!-- Login / Dashboard CTA (button-primary) -->
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="ml-1 inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-5 text-sm font-medium text-canvas transition-colors hover:bg-charcoal active:bg-ink-deep dark:bg-gray-100 dark:text-ink dark:hover:bg-white"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
            <span aria-hidden="true">&rarr;</span>
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <div class="mx-auto max-w-5xl px-4 sm:px-6">
        <!-- Hero Section -->
        <section class="py-16 md:py-24">
          <div class="mb-6">
            <!-- badge-news: dark chip inline label -->
            <span class="inline-flex items-center rounded-sm bg-surface-dark px-2 py-0.5 text-sm text-on-dark dark:bg-dark-700">
              <span class="text-success-500">[+]</span>&nbsp;{{ t('home.heroSubtitle') }}
            </span>
          </div>
          <h1 class="mb-6 max-w-3xl text-[28px] font-bold leading-normal md:text-[38px]">
            {{ siteName }}
          </h1>
          <p class="mb-8 max-w-2xl text-base leading-normal text-gray-700 dark:text-gray-300">
            {{ t('home.heroDescription') }}
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <router-link
              :to="isAuthenticated ? dashboardPath : '/login'"
              class="inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-5 text-sm font-medium text-canvas transition-colors hover:bg-charcoal active:bg-ink-deep dark:bg-gray-100 dark:text-ink dark:hover:bg-white"
            >
              {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
              <span aria-hidden="true">&rarr;</span>
            </router-link>
            <a
              v-if="docUrl"
              :href="docUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-9 items-center rounded-sm border border-hairline-strong bg-canvas px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-soft dark:border-dark-400 dark:bg-transparent dark:text-gray-100 dark:hover:bg-dark-800"
            >
              {{ t('home.docs') }}
            </a>
          </div>
        </section>

        <!-- Hero TUI mockup: the system's only dark surface -->
        <section class="pb-16 md:pb-24">
          <div class="tui-window">
            <div class="tui-body">
              <pre class="tui-wordmark font-mono" aria-hidden="true">  ____        _    ____     _    ____ ___
 / ___| _   _| |__|___ \   / \  |  _ \_ _|
 \___ \| | | | '_ \ __) | / _ \ | |_) | |
  ___) | |_| | |_) / __/ / ___ \|  __/| |
 |____/ \__,_|_.__/_____/_/   \_\_|  |___|</pre>
              <div class="tui-prompt-row">
                <span class="tui-pipe">|</span>
                <span class="tui-cmd">Build</span>
                <span class="tui-token">[ Claude / GPT / Gemini ]</span>
                <span class="tui-arg">{{ siteName }}</span>
              </div>
              <div class="code-line line-1">
                <span class="code-prompt">$</span>
                <span class="code-cmd">curl</span>
                <span class="code-flag">-X POST</span>
                <span class="code-url">/v1/messages</span>
              </div>
              <div class="code-line line-2">
                <span class="code-comment"># routing to upstream pool...</span>
              </div>
              <div class="code-line line-3">
                <span class="code-success">200 OK</span>
                <span class="code-response">{ "content": "Hello!" }</span>
              </div>
              <div class="code-line line-4">
                <span class="code-prompt">$</span>
                <span class="cursor"></span>
              </div>
              <div class="tui-hints">
                <span><span class="tui-key">tab</span> switch agent</span>
                <span><span class="tui-key">ctrl-p</span> commands</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Feature list rows: ASCII bracket bullets, hairline rules -->
        <section class="border-t border-hairline py-16 dark:border-dark-700">
          <h2 class="mb-8 text-base font-bold">[+] {{ t('home.solutions.title') }}</h2>
          <div class="divide-y divide-hairline dark:divide-dark-700">
            <div class="feature-row">
              <span class="feature-marker">[+]</span>
              <div class="min-w-0">
                <span class="feature-label">{{ t('home.features.unifiedGateway') }}</span>
                <span class="feature-desc">{{ t('home.features.unifiedGatewayDesc') }}</span>
              </div>
            </div>
            <div class="feature-row">
              <span class="feature-marker">[+]</span>
              <div class="min-w-0">
                <span class="feature-label">{{ t('home.features.multiAccount') }}</span>
                <span class="feature-desc">{{ t('home.features.multiAccountDesc') }}</span>
              </div>
            </div>
            <div class="feature-row">
              <span class="feature-marker">[+]</span>
              <div class="min-w-0">
                <span class="feature-label">{{ t('home.features.balanceQuota') }}</span>
                <span class="feature-desc">{{ t('home.features.balanceQuotaDesc') }}</span>
              </div>
            </div>
            <div class="feature-row">
              <span class="feature-marker">[x]</span>
              <div class="min-w-0">
                <span class="feature-label">{{ t('home.tags.subscriptionToApi') }}</span>
                <span class="feature-desc">{{ t('home.tags.stickySession') }} · {{ t('home.tags.realtimeBilling') }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Supported Providers -->
        <section class="border-t border-hairline py-16 dark:border-dark-700">
          <h2 class="mb-2 text-base font-bold">{{ t('home.providers.title') }}</h2>
          <p class="mb-8 text-sm text-gray-500 dark:text-dark-200">{{ t('home.providers.description') }}</p>
          <div class="flex flex-wrap gap-3">
            <div class="provider-chip">
              <span class="provider-glyph">C</span>
              <span class="provider-name">{{ t('home.providers.claude') }}</span>
              <span class="provider-state">[x] {{ t('home.providers.supported') }}</span>
            </div>
            <div class="provider-chip">
              <span class="provider-glyph">G</span>
              <span class="provider-name">GPT</span>
              <span class="provider-state">[x] {{ t('home.providers.supported') }}</span>
            </div>
            <div class="provider-chip">
              <span class="provider-glyph">G</span>
              <span class="provider-name">{{ t('home.providers.gemini') }}</span>
              <span class="provider-state">[x] {{ t('home.providers.supported') }}</span>
            </div>
            <div class="provider-chip">
              <span class="provider-glyph">A</span>
              <span class="provider-name">{{ t('home.providers.antigravity') }}</span>
              <span class="provider-state">[x] {{ t('home.providers.supported') }}</span>
            </div>
            <div class="provider-chip provider-chip-soon">
              <span class="provider-glyph">+</span>
              <span class="provider-name">{{ t('home.providers.more') }}</span>
              <span class="provider-state">[-] {{ t('home.providers.soon') }}</span>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer: hairline top rule, caption row -->
    <footer class="border-t border-hairline px-4 py-8 dark:border-dark-700">
      <div
        class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row sm:text-left dark:text-dark-200"
      >
        <p>
          &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
        </p>
        <div class="flex items-center gap-6">
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-ink dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </a>
          <a
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-ink dark:hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
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
const compactHomeEnabled = computed(() => appStore.cachedPublicSettings?.compact_home_enabled === true)
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// GitHub URL
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

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
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

// Mouse-follow fluid background: loads the 1:1 WebGL fluid + pattern-particle
// replica scripts (public/fluid/*.js). They are framework-agnostic IIFEs that
// bind to #fluid-canvas / #particle-canvas on evaluation.
const fluidEnabled = computed(() => compactHomeEnabled.value && !hasHomeContent.value)
const fluidCanvas = ref<HTMLCanvasElement | null>(null)
const particleCanvas = ref<HTMLCanvasElement | null>(null)
let fluidStarted = false

const FLUID_LIGHT_COLORS = '["#f2f7ff", "#bcd4f7", "#8fb3ea", "#e8d9b8", "#f2f7ff"]'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`failed to load ${src}`))
    document.body.appendChild(s)
  })
}

async function initFluid() {
  if (fluidStarted || !fluidCanvas.value || !particleCanvas.value) return
  fluidStarted = true
  // The scripts look up elements by id at evaluation time
  fluidCanvas.value.id = 'fluid-canvas'
  particleCanvas.value.id = 'particle-canvas'
  // Light theme keeps the field but brightens the palette
  const win = window as unknown as Record<string, unknown>
  if (!isDark.value) {
    win.__FLUID_COLORS_OVERRIDE__ = FLUID_LIGHT_COLORS
  } else {
    delete win.__FLUID_COLORS_OVERRIDE__
  }
  try {
    await loadScript('/fluid/vendor-svgs.js')
    await loadScript('/fluid/fluid-bg.js')
    await loadScript('/fluid/particle-bg.js')
  } catch {
    // WebGL unavailable or asset missing — page still works without the effect
  }
}

watch(
  fluidEnabled,
  async (enabled) => {
    if (!enabled) return
    await nextTick()
    initFluid()
  },
  { immediate: true },
)

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
/* ============ Hero TUI mockup ============
 * The system's only dark surface: flat #201d1d rectangle, no shadow,
 * no rounded corners, no perspective. */
.tui-window {
  background: #201d1d;
  border-radius: 0;
  overflow: hidden;
}

.dark .tui-window {
  background: #201d1d;
  border: 1px solid #302c2c;
}

.tui-body {
  padding: 48px 24px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  color: #fdfcfc;
}

@media (min-width: 640px) {
  .tui-body {
    padding: 64px 32px;
    font-size: 16px;
  }
}

/* Block-pixel ASCII wordmark */
.tui-wordmark {
  margin: 0 0 28px;
  font-size: 12px;
  line-height: 1.05;
  text-align: center;
  color: #fdfcfc;
  white-space: pre;
  overflow-x: auto;
}

@media (min-width: 640px) {
  .tui-wordmark {
    font-size: 14px;
  }
}

/* tui-prompt-row: one notch lighter inset command line */
.tui-prompt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #302c2c;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 24px;
  overflow-x: auto;
  white-space: nowrap;
}

.tui-pipe {
  color: #9a9898;
}

.tui-cmd {
  font-weight: 700;
  color: #fdfcfc;
}

.tui-token {
  color: #007aff;
}

.tui-arg {
  color: #9a9898;
}

/* Terminal command lines */
.code-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  opacity: 0;
  animation: line-appear 0.4s ease forwards;
}

.line-1 {
  animation-delay: 0.3s;
}
.line-2 {
  animation-delay: 0.9s;
}
.line-3 {
  animation-delay: 1.5s;
}
.line-4 {
  animation-delay: 2s;
}

@keyframes line-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Syntax colors: the semantic ramp used as TUI highlight stand-ins */
.code-prompt {
  color: #30d158;
  font-weight: 700;
}
.code-cmd {
  color: #007aff;
}
.code-flag {
  color: #ff9f0a;
}
.code-url {
  color: #fdfcfc;
}
.code-comment {
  color: #9a9898;
}
.code-success {
  color: #30d158;
  font-weight: 700;
}
.code-response {
  color: #fdfcfc;
}

/* Blinking cursor */
.cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #fdfcfc;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Keybinding hints */
.tui-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 32px;
  color: #9a9898;
  font-size: 14px;
}

.tui-key {
  display: inline-block;
  border: 1px solid #646262;
  border-radius: 4px;
  padding: 0 6px;
  margin-right: 6px;
  color: #fdfcfc;
}

/* ============ Feature list rows ============ */
.feature-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

.feature-marker {
  color: #646262;
  flex-shrink: 0;
  font-weight: 700;
}

.feature-label {
  display: block;
  font-weight: 700;
  color: inherit;
}

.feature-desc {
  display: block;
  color: #424245;
}

.dark .feature-desc {
  color: #9a9898;
}

/* ============ Provider chips ============ */
.provider-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(15, 0, 0, 0.12);
  border-radius: 4px;
  background: #fdfcfc;
  padding: 8px 14px;
  font-size: 14px;
}

.dark .provider-chip {
  border-color: #3a3535;
  background: #262222;
}

.provider-glyph {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 0, 0, 0.12);
  border-radius: 4px;
  font-weight: 700;
  font-size: 12px;
}

.dark .provider-glyph {
  border-color: #4a4545;
}

.provider-name {
  font-weight: 500;
}

.provider-state {
  color: #646262;
  font-size: 12px;
}

.dark .provider-state {
  color: #9a9898;
}

.provider-chip-soon {
  opacity: 0.55;
}

/* ============ Sky-glass hero (compact-home) ============ */
.sky-wordmark {
  font-size: clamp(140px, 22vw, 280px);
  filter: blur(56px);
  letter-spacing: -0.05em;
  white-space: nowrap;
}

/* ============ Fluid hero background (1:1 replica) ============
 * Structure mirrors deepseek.com/harness (and the reference site):
 *   .fluid-hero-bg  — viewport-height container, fluid fades out toward the
 *                     bottom via the mask on .hero-fluid
 *   #fluid-canvas   — WebGL 3D simplex domain-warped noise field
 *   #particle-canvas— transparent pattern-particle layer stacked on top */
.hero-fluid {
  position: absolute;
  inset: 0;
  -webkit-mask-image: linear-gradient(#000000fc 0%, #000000e8 8.98%, transparent 100%);
  mask-image: linear-gradient(#000000fc 0%, #000000e8 8.98%, transparent 100%);
}

.fluid-bg,
.particle-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.fluid-bg {
  z-index: 0;
}

.particle-bg {
  z-index: 1;
}

/* Browsers without backdrop-filter get a slightly more opaque fallback so the
   glass card still reads as a card instead of disappearing into the sky. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :where(.bg-white\/55) {
    background-color: rgba(255, 255, 255, 0.92);
  }
  :where(.dark .dark\:bg-white\/\[0\.06\]) {
    background-color: rgba(15, 23, 42, 0.78);
  }
}
</style>
