<template>
  <section
    class="border-b border-gray-300 pb-6 dark:border-dark-600"
    :aria-labelledby="`plaza-group-${group.id}`"
  >
    <!-- 当前目录头部:明确分组上下文,价格卡片本身不再嵌套进外层卡片。 -->
    <header class="mb-4 flex flex-col gap-4 border-b border-gray-300 pb-4 dark:border-dark-600 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <PlatformIcon :platform="group.platform as GroupPlatform" size="sm" />
          <h2 :id="`plaza-group-${group.id}`" class="break-words text-lg font-bold text-gray-950 dark:text-white sm:text-xl">
            {{ group.name }}
          </h2>
        </div>
        <p class="mt-1.5 text-xs text-gray-500 dark:text-dark-300">
          {{ t('modelPlaza.detail.modelCount', { count: group.models.length }) }}
        </p>
        <p v-if="group.description" class="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-dark-200">
          {{ group.description }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 lg:max-w-[48%] lg:justify-end">
        <span class="badge badge-gray gap-1.5">
          <span class="text-gray-400 dark:text-dark-300">{{ group.platform }}</span>
        </span>
        <span class="badge badge-primary font-mono">
          <template v-if="hasCustomRate">
            <span class="mr-1 text-gray-400 line-through dark:text-dark-300">{{ group.rate_multiplier }}x</span>
          </template>
          {{ effectiveRate }}x
        </span>
        <span v-if="group.is_exclusive" class="badge badge-gray gap-1">
          <Icon name="shield" size="xs" class="h-3 w-3" />
          {{ t('modelPlaza.badges.exclusive') }}
        </span>
        <span v-if="group.subscription_type === 'subscription'" class="badge badge-gray">
          {{ t('modelPlaza.badges.subscription') }}
        </span>
        <p
          v-if="peakNote"
          class="flex basis-full items-center gap-1 text-xs text-amber-600 dark:text-amber-400 lg:justify-end"
        >
          <Icon name="clock" size="xs" class="h-3 w-3" />
          {{ peakNote }}
        </p>
        <p
          v-if="longContextNote"
          class="flex basis-full items-start gap-1 text-xs leading-5 text-gray-500 dark:text-dark-300 lg:justify-end"
        >
          <Icon name="infoCircle" size="xs" class="mt-0.5 h-3 w-3 shrink-0" />
          {{ longContextNote }}
        </p>
      </div>
    </header>

    <!-- 模型价格卡片:保留原有计费计算与阶梯/分时披露。 -->
    <div>
      <PlazaModelPricingTable
        v-if="group.models.length > 0"
        :models="group.models"
        :platform="group.platform"
        :rate-multiplier="group.rate_multiplier"
        :user-rate-multiplier="group.user_rate_multiplier ?? null"
        :image-rate-independent="group.image_rate_independent"
        :image-rate-multiplier="group.image_rate_multiplier"
        :peak-window="peakWindow"
        :peak-rate-multiplier="group.peak_rate_multiplier"
      />
      <p v-else class="px-5 py-4 text-center text-sm text-gray-400 dark:text-dark-500">
        {{ t('modelPlaza.detail.noModels') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import PlazaModelPricingTable from './PlazaModelPricingTable.vue'
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import type { GroupPlatform } from '@/types'
import { hasPeakRate, formatPeakRateWindow, serverTimezoneLabel } from '@/utils/peak-rate'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  group: ModelPlazaGroup
}>()

const { t } = useI18n()
const appStore = useAppStore()

const effectiveRate = computed(() => props.group.user_rate_multiplier ?? props.group.rate_multiplier)
const hasCustomRate = computed(
  () => props.group.user_rate_multiplier != null && props.group.user_rate_multiplier !== props.group.rate_multiplier
)

/** 高峰窗口描述(含倍率与服务器时区标注);分组未启用高峰为空串。 */
const peakWindow = computed(() => {
  if (!hasPeakRate(props.group)) return ''
  return formatPeakRateWindow(
    props.group,
    serverTimezoneLabel(appStore.cachedPublicSettings?.server_utc_offset)
  )
})

const peakNote = computed(() => {
  if (!peakWindow.value) return ''
  return t('modelPlaza.detail.peakNote', {
    window: peakWindow.value,
    multiplier: props.group.peak_rate_multiplier
  })
})

/**
 * 分组关闭了长上下文阶梯、但组内有模型官方带阶梯时提示:实付列只展示基础档,
 * 官方阶梯仅供参考。字段缺失(旧后端)不提示。
 */
const longContextNote = computed(() => {
  if (props.group.long_context_pricing_enabled !== false) return ''
  const hasOfficialLadder = props.group.models.some(
    (m) => (m.official_pricing?.intervals?.length ?? 0) > 1
  )
  return hasOfficialLadder ? t('modelPlaza.detail.longContextDisabledNote') : ''
})
</script>
