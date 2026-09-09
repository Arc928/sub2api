<template>
  <div class="model-card-grid tabular-nums" :style="accentStyle">
    <article
      v-for="m in sortedModels"
      :key="`${m.platform}:${m.name}`"
      class="model-card"
      data-testid="model-price-card"
    >
      <header class="model-card-head">
        <div class="min-w-0">
          <div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 class="break-all text-base font-semibold text-gray-950 dark:text-white">
              {{ m.name }}
            </h3>
            <span
              v-if="platform && m.platform !== platform"
              :class="[
                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                platformBadgeLightClass(m.platform)
              ]"
            >
              {{ platformLabel(m.platform) }}
            </span>
          </div>
        </div>

        <span class="model-rate" :aria-label="t('modelPlaza.table.rate')">
          {{ formatRate(rateForModel(m)) }}x
        </span>
      </header>

      <div v-if="billingMode(m) === BILLING_MODE_TOKEN" class="price-list">
        <section
          v-for="row in tokenPriceRows(m)"
          :key="row.kind"
          class="price-row"
          :data-price-kind="row.kind"
        >
          <div class="price-main">
            <span class="price-label">{{ row.label }}</span>
            <strong class="paid-price">
              {{ row.paid }}<span v-if="row.paid !== '-'" class="price-unit">{{ t('modelPlaza.table.unitPerMillionShort') }}</span>
            </strong>
          </div>
          <p class="price-meta">
            {{ t('modelPlaza.table.originalPrice') }}
            <span class="font-mono font-semibold text-gray-700 dark:text-dark-200">
              {{ row.original }}<template v-if="row.original !== '-'">{{ t('modelPlaza.table.unitPerMillionShort') }}</template>
            </span>
            <span aria-hidden="true">·</span>
            {{ t('modelPlaza.table.rate') }}
            <span class="font-mono font-semibold text-gray-700 dark:text-dark-200">{{ formatRate(effectiveRate) }}x</span>
          </p>
        </section>
      </div>

      <div v-else class="price-list">
        <section
          v-for="row in requestPriceRows(m)"
          :key="row.key"
          class="price-row"
          data-price-kind="request"
        >
          <div class="price-main">
            <span class="price-label">{{ row.label }}</span>
            <strong class="paid-price">
              {{ row.paid }}<span v-if="row.paid !== '-'" class="price-unit">{{ perUnitSuffix(m) }}</span>
            </strong>
          </div>
          <p class="price-meta">
            {{ t('modelPlaza.table.originalPrice') }}
            <span class="font-mono font-semibold text-gray-700 dark:text-dark-200">
              {{ row.original }}<template v-if="row.original !== '-'">{{ perUnitSuffix(m) }}</template>
            </span>
            <span aria-hidden="true">·</span>
            {{ t('modelPlaza.table.rate') }}
            <span class="font-mono font-semibold text-gray-700 dark:text-dark-200">{{ formatRate(requestRate(m)) }}x</span>
          </p>
        </section>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatScaled } from '@/utils/pricing'
import { platformAccentColor, platformBadgeLightClass, platformLabel } from '@/utils/platformColors'
import {
  BILLING_MODE_TOKEN,
  BILLING_MODE_IMAGE,
  type BillingMode
} from '@/constants/channel'
import type { PlazaModel } from '@/api/modelPlaza'

const props = defineProps<{
  models: PlazaModel[]
  platform?: string
  rateMultiplier: number
  userRateMultiplier?: number | null
  imageRateIndependent?: boolean
  imageRateMultiplier?: number | null
  peakWindow?: string
  peakRateMultiplier?: number | null
}>()

const { t } = useI18n()
const PER_MILLION = 1_000_000
const MIN_DECIMALS = 2

const accentStyle = computed(() => ({ '--plaza-accent': platformAccentColor(props.platform ?? '') }))
const effectiveRate = computed(() => props.userRateMultiplier ?? props.rateMultiplier)

/** Token 模型优先；同类模型沿用原有的官方输出价和名称排序。 */
const sortedModels = computed(() => {
  return [...props.models].sort((a, b) => {
    const aIsToken = billingMode(a) === BILLING_MODE_TOKEN
    const bIsToken = billingMode(b) === BILLING_MODE_TOKEN
    if (aIsToken !== bIsToken) return aIsToken ? -1 : 1
    const aPrice = a.official_pricing?.output_price ?? null
    const bPrice = b.official_pricing?.output_price ?? null
    if (aPrice != null && bPrice != null && aPrice !== bPrice) return bPrice - aPrice
    if (aPrice != null && bPrice == null) return -1
    if (aPrice == null && bPrice != null) return 1
    return b.name.localeCompare(a.name)
  })
})

function billingMode(model: PlazaModel): BillingMode {
  return (model.pricing?.billing_mode || BILLING_MODE_TOKEN) as BillingMode
}

function formatRate(rate: number): string {
  return String(Math.round(rate * 1000) / 1000)
}

function paidPerMillion(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatScaled(value * effectiveRate.value, PER_MILLION, MIN_DECIMALS)
}

function originalPerMillion(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatScaled(value, PER_MILLION, MIN_DECIMALS)
}

function tokenPriceRows(model: PlazaModel) {
  return [
    {
      kind: 'input',
      label: t('modelPlaza.table.input'),
      paid: paidPerMillion(model.pricing?.input_price),
      original: originalPerMillion(model.pricing?.input_price)
    },
    {
      kind: 'output',
      label: t('modelPlaza.table.output'),
      paid: paidPerMillion(model.pricing?.output_price),
      original: originalPerMillion(model.pricing?.output_price)
    },
    {
      kind: 'cache-read',
      label: t('modelPlaza.table.cacheRead'),
      paid: paidPerMillion(model.pricing?.cache_read_price),
      original: originalPerMillion(model.pricing?.cache_read_price)
    }
  ]
}

function usesIndependentImageRate(model: PlazaModel): boolean {
  return billingMode(model) === BILLING_MODE_IMAGE && props.imageRateIndependent === true
}

function requestRate(model: PlazaModel): number {
  return usesIndependentImageRate(model) ? (props.imageRateMultiplier ?? 1) : effectiveRate.value
}

function rateForModel(model: PlazaModel): number {
  return billingMode(model) === BILLING_MODE_TOKEN ? effectiveRate.value : requestRate(model)
}

function paidRequestPrice(model: PlazaModel, value: number | null | undefined): string {
  if (value == null) return '-'
  return formatScaled(value * requestRate(model), 1, MIN_DECIMALS)
}

function originalRequestPrice(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatScaled(value, 1, MIN_DECIMALS)
}

function billingModeLabel(model: PlazaModel): string {
  return billingMode(model) === BILLING_MODE_IMAGE
    ? t('modelPlaza.table.perImage')
    : t('modelPlaza.table.perRequest')
}

function requestPriceRows(model: PlazaModel) {
  const intervals = (model.pricing?.intervals ?? []).filter((interval) => interval.per_request_price != null)
  if (intervals.length > 0) {
    return intervals.map((interval, index) => ({
      key: `${index}:${interval.tier_label}`,
      label: interval.tier_label || billingModeLabel(model),
      paid: paidRequestPrice(model, interval.per_request_price),
      original: originalRequestPrice(interval.per_request_price)
    }))
  }
  return [{
    key: 'base',
    label: billingModeLabel(model),
    paid: paidRequestPrice(model, model.pricing?.per_request_price),
    original: originalRequestPrice(model.pricing?.per_request_price)
  }]
}

function perUnitSuffix(model: PlazaModel): string {
  return billingMode(model) === BILLING_MODE_IMAGE
    ? t('modelPlaza.table.perUnitImage')
    : t('modelPlaza.table.perUnitRequest')
}
</script>

<style scoped>
.model-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 1rem;
  width: 100%;
}

.model-card {
  @apply min-w-0 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition-colors dark:border-dark-600 dark:bg-dark-900;
}

.model-card:hover {
  border-color: color-mix(in srgb, var(--plaza-accent) 60%, #9ca3af);
}

.model-card-head {
  @apply flex min-h-[4.75rem] items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-dark-600 dark:bg-dark-800;
}

.model-rate {
  @apply inline-flex h-10 shrink-0 items-center rounded-md border bg-white px-3 font-mono text-sm font-bold dark:bg-dark-900;
  border-color: color-mix(in srgb, var(--plaza-accent) 70%, #d1d5db);
  color: var(--plaza-accent);
}

.price-list {
  @apply divide-y divide-dashed divide-gray-300 px-5 dark:divide-dark-600;
}

.price-row {
  @apply py-4;
}

.price-main {
  @apply flex min-h-8 items-baseline justify-between gap-4;
}

.price-label {
  @apply text-xs font-bold uppercase text-gray-600 dark:text-dark-200;
}

.paid-price {
  @apply whitespace-nowrap font-mono text-xl font-bold;
  color: var(--plaza-accent);
}

.price-unit {
  @apply ml-0.5 text-sm font-semibold;
}

.price-meta {
  @apply mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-dark-300;
}
</style>
