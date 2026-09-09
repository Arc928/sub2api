<template>
  <section
    class="border-y border-gray-300 py-5 dark:border-dark-600"
    :aria-label="t('modelPlaza.filters.catalogLabel')"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-bold uppercase text-gray-500 dark:text-dark-300">
          [ {{ t('modelPlaza.filters.catalogLabel') }} ]
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-dark-300">
          {{ t('modelPlaza.filters.catalogMeta', { platforms: platformGroups.length, groups: groups.length }) }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <span class="mb-1 block text-[11px] font-bold uppercase text-gray-500 dark:text-dark-300">
            {{ t('modelPlaza.filters.rateLabel') }}
          </span>
          <div class="inline-flex max-w-full overflow-x-auto border border-gray-300 dark:border-dark-500" role="group">
            <button
              type="button"
              class="filter-segment"
              :class="{ 'filter-segment-active': rate === 'all' }"
              @click="$emit('update:rate', 'all')"
            >
              {{ t('modelPlaza.filters.all') }}
            </button>
            <button
              v-for="r in rates"
              :key="`rate-${r}`"
              type="button"
              class="filter-segment border-l border-gray-300 font-mono dark:border-dark-500"
              :class="{ 'filter-segment-active': rate === r }"
              @click="$emit('update:rate', r)"
            >
              {{ r }}x
            </button>
          </div>
        </div>

        <label class="block w-full sm:w-72">
          <span class="mb-1 block text-[11px] font-bold uppercase text-gray-500 dark:text-dark-300">
            {{ t('modelPlaza.filters.modelLabel') }}
          </span>
          <span class="relative block">
        <Icon
          name="search"
          size="sm"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-500"
        />
        <input
          :value="search"
          type="text"
          :placeholder="t('modelPlaza.filters.searchPlaceholder')"
          class="input rounded-lg py-1.5 pl-9 pr-9"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="search"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-dark-500 dark:hover:text-gray-300"
          @click="$emit('update:search', '')"
        >
          <Icon name="x" size="xs" class="h-3.5 w-3.5" />
        </button>
          </span>
        </label>
      </div>
    </div>

    <div class="mt-5 grid border-l border-t border-gray-300 dark:border-dark-600 sm:grid-cols-2 xl:grid-cols-4">
      <section
        v-for="entry in platformGroups"
        :key="entry.platform"
        class="min-w-0 border-b border-r border-gray-300 p-3 dark:border-dark-600"
        :aria-label="entry.platform"
      >
        <header class="mb-3 flex items-center justify-between gap-2">
          <span class="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-gray-800 dark:text-gray-100">
            <PlatformIcon :platform="entry.platform as GroupPlatform" size="xs" />
            <span class="truncate">{{ entry.platform }}</span>
          </span>
          <span class="text-[10px] text-gray-400 dark:text-dark-400">{{ entry.groups.length }}</span>
        </header>
        <div class="space-y-1.5" role="tablist">
          <button
            v-for="g in entry.groups"
            :key="`group-${g.id}`"
            type="button"
            role="tab"
            class="group-tab"
            :class="{ 'group-tab-active': groupId === g.id }"
            :disabled="!groupEnabled(g)"
            :aria-selected="groupId === g.id"
            @click="$emit('update:groupId', g.id)"
          >
            <span class="min-w-0 break-words text-left leading-5">{{ g.name }}</span>
            <span class="shrink-0 text-[10px] opacity-70">{{ g.rate }}x</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import type { GroupPlatform } from '@/types'

const props = defineProps<{
  /** 全量分组(含平台与生效倍率)。 */
  groups: Array<{ id: number; name: string; platform: string; rate: number }>
  /** 全量生效倍率去重升序。 */
  rates: number[]
  groupId: number | 'all'
  rate: number | 'all'
  /** 模型名搜索词(纯前端过滤)。 */
  search: string
}>()

defineEmits<{
  'update:groupId': [value: number | 'all']
  'update:rate': [value: number | 'all']
  'update:search': [value: string]
}>()

const { t } = useI18n()

const platformGroups = computed(() => {
  const grouped = new Map<string, typeof props.groups>()
  props.groups.forEach((group) => {
    const list = grouped.get(group.platform) ?? []
    list.push(group)
    grouped.set(group.platform, list)
  })
  return [...grouped].map(([platform, groups]) => ({ platform, groups }))
})

function groupEnabled(g: { platform: string; rate: number }): boolean {
  return props.rate === 'all' || g.rate === props.rate
}
</script>

<style scoped>
.filter-segment {
  @apply min-h-[34px] shrink-0 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:bg-dark-900 dark:text-dark-200 dark:hover:bg-dark-700 dark:hover:text-white;
}

.filter-segment-active {
  @apply bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white;
}

.group-tab {
  @apply flex min-h-[40px] w-full items-center justify-between gap-3 rounded-sm border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-600 hover:bg-white hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-35 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-dark-300 dark:hover:bg-dark-700 dark:hover:text-white;
}

.group-tab-active {
  @apply border-gray-900 bg-gray-900 text-white hover:bg-gray-800 hover:text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:hover:text-gray-950;
}
</style>
