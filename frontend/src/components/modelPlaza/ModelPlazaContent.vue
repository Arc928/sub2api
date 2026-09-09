<template>
  <div class="space-y-7">
    <!-- 目录页头:独立页与后台内嵌形态保持相同的信息入口。 -->
    <header class="border-y border-gray-300 py-6 dark:border-dark-600 sm:py-8">
      <p class="text-xs font-bold uppercase text-gray-500 dark:text-dark-300">
        [ {{ t('modelPlaza.catalogKicker') }} ]
      </p>
      <h1 class="mt-3 text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">
        {{ t('modelPlaza.title') }}
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-dark-200">
        {{ t('modelPlaza.description') }}
      </p>
    </header>

    <!-- 全局价格说明(管理员配置,Markdown) -->
    <div
      v-if="descriptionHtml"
      class="plaza-description rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm shadow-card dark:border-dark-700/50 dark:bg-dark-800/50"
      v-html="descriptionHtml"
    ></div>

    <!-- 未登录提示 -->
    <p
      v-if="!isAuthenticated"
      class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-dark-500"
    >
      <Icon name="infoCircle" size="xs" class="h-3.5 w-3.5" />
      {{ t('modelPlaza.anonymousHint') }}
    </p>

    <!-- 加载/错误/空 -->
    <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600/25 border-t-primary-600 dark:border-primary-400/25 dark:border-t-primary-400"></div>
    </div>
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      {{ t('modelPlaza.loadFailed') }}
    </div>
    <template v-else>
      <!-- 与参考目录一致的四项概览,数值完全来自当前接口响应。 -->
      <section
        class="grid grid-cols-2 border-l border-t border-gray-300 dark:border-dark-600 lg:grid-cols-4"
        :aria-label="t('modelPlaza.summary.label')"
      >
        <article
          v-for="item in summaryItems"
          :key="item.label"
          class="min-w-0 border-b border-r border-gray-300 bg-white p-4 dark:border-dark-600 dark:bg-dark-900 sm:p-5"
        >
          <p class="text-[11px] font-bold uppercase leading-5 text-gray-500 dark:text-dark-300">
            {{ item.label }}
          </p>
          <strong class="mt-2 block truncate text-2xl font-bold text-gray-950 dark:text-white">
            {{ item.value }}
          </strong>
          <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-dark-300">
            {{ item.note }}
          </p>
        </article>
      </section>

      <!-- 平台分栏目录 + 倍率与模型名筛选。 -->
      <PlazaFilterBar
        :groups="groupOptions"
        :rates="rates"
        :group-id="selectedGroupId"
        :rate="selectedRate"
        :search="searchQuery"
        @update:group-id="selectGroup"
        @update:rate="selectRate"
        @update:search="searchQuery = $event"
      />

      <!-- 目录一次聚焦一个分组,避免在长列表中反复寻找价格上下文。 -->
      <div v-if="filteredGroups.length > 0" class="space-y-5">
        <PlazaGroupSection v-for="g in filteredGroups" :key="g.id" :group="g" />
      </div>
      <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-dark-400"
      >
        {{ searchActive ? t('modelPlaza.noSearchResult') : t('modelPlaza.empty') }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Icon from '@/components/icons/Icon.vue'
import PlazaFilterBar from './PlazaFilterBar.vue'
import PlazaGroupSection from './PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  response: ModelPlazaResponse | null
  loading: boolean
  error?: boolean
  /** 后台内嵌形态标记,保留供调用方兼容。 */
  embedded?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const selectedGroupId = ref<number | 'all'>('all')
const selectedRate = ref<number | 'all'>('all')
const searchQuery = ref('')

const searchActive = computed(() => searchQuery.value.trim() !== '')

const descriptionHtml = computed(() => {
  const md = props.response?.description?.trim()
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md) as string)
})

/** 生效倍率 = 用户专属倍率 ?? 分组默认倍率。 */
function effectiveRate(g: ModelPlazaGroup): number {
  return g.user_rate_multiplier ?? g.rate_multiplier
}

const allGroups = computed(() => props.response?.groups ?? [])

const platforms = computed(() =>
  [...new Set(allGroups.value.map((g) => g.platform).filter(Boolean))].sort()
)

const groupOptions = computed(() =>
  allGroups.value.map((g) => ({
    id: g.id,
    name: g.name,
    platform: g.platform,
    rate: effectiveRate(g)
  }))
)

/** 全量生效倍率;当前组合下不可用的项由 FilterBar 置灰而非隐藏。 */
const rates = computed(() =>
  [...new Set(allGroups.value.map(effectiveRate))].sort((a, b) => a - b)
)

/** 接口返回后默认聚焦第一项;刷新时尽量保留仍存在的当前分组。 */
watch(
  allGroups,
  (groups) => {
    if (groups.length === 0) {
      selectedGroupId.value = 'all'
      return
    }
    if (selectedGroupId.value === 'all' || !groups.some((g) => g.id === selectedGroupId.value)) {
      selectedGroupId.value = groups[0].id
    }
    if (selectedRate.value !== 'all' && !rates.value.includes(selectedRate.value)) {
      selectedRate.value = 'all'
    }
  },
  { immediate: true }
)

const activeGroup = computed(() => {
  const candidates = selectedRate.value === 'all'
    ? allGroups.value
    : allGroups.value.filter((g) => effectiveRate(g) === selectedRate.value)
  return candidates.find((g) => g.id === selectedGroupId.value) ?? candidates[0] ?? null
})

const totalModels = computed(() =>
  allGroups.value.reduce((count, group) => count + group.models.length, 0)
)

const summaryItems = computed(() => [
  {
    label: t('modelPlaza.summary.groups'),
    value: allGroups.value.length,
    note: t('modelPlaza.summary.groupsNote')
  },
  {
    label: t('modelPlaza.summary.models'),
    value: totalModels.value,
    note: t('modelPlaza.summary.modelsNote')
  },
  {
    label: t('modelPlaza.summary.current'),
    value: activeGroup.value?.models.length ?? 0,
    note: t('modelPlaza.summary.currentNote')
  },
  {
    label: t('modelPlaza.summary.platforms'),
    value: platforms.value.length,
    note: t('modelPlaza.summary.platformsNote')
  }
])

function selectGroup(id: number | 'all') {
  selectedGroupId.value = id
}

function selectRate(rate: number | 'all') {
  selectedRate.value = rate
  if (rate === 'all') return
  const current = allGroups.value.find((g) => g.id === selectedGroupId.value)
  if (!current || effectiveRate(current) !== rate) {
    selectedGroupId.value = allGroups.value.find((g) => effectiveRate(g) === rate)?.id ?? 'all'
  }
}

const filteredGroups = computed(() => {
  const group = activeGroup.value
  if (!group) return []
  // 模型名搜索只过滤当前目录,切换分组后搜索词保持不变。
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return [group]
  const models = group.models.filter((m) => m.name.toLowerCase().includes(q))
  return models.length > 0 ? [{ ...group, models }] : []
})
</script>

<style scoped>
.plaza-description {
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.plaza-description :deep(h1),
.plaza-description :deep(h2),
.plaza-description :deep(h3) {
  @apply mb-2 mt-3 font-semibold text-gray-900 first:mt-0 dark:text-white;
}

.plaza-description :deep(p) {
  @apply mb-2 text-gray-700 last:mb-0 dark:text-dark-200;
}

.plaza-description :deep(a) {
  @apply text-primary-600 underline underline-offset-4 hover:text-primary-700 dark:text-primary-300;
}

.plaza-description :deep(ul) {
  @apply mb-2 list-disc pl-5;
}

.plaza-description :deep(ol) {
  @apply mb-2 list-decimal pl-5;
}

.plaza-description :deep(li) {
  @apply mb-0.5 text-gray-700 dark:text-dark-200;
}

.plaza-description :deep(code) {
  @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-800;
}

.plaza-description :deep(blockquote) {
  @apply my-2 border-l-4 border-gray-300 pl-3 text-gray-600 dark:border-dark-600 dark:text-dark-300;
}
</style>
