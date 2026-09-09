import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaModelPricingTable from '../PlazaModelPricingTable.vue'
import type { PlazaModel } from '@/api/modelPlaza'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

function tokenModel(overrides: Partial<PlazaModel> = {}): PlazaModel {
  return {
    name: 'gpt-5.6-sol',
    platform: 'openai',
    pricing: {
      billing_mode: 'token',
      input_price: 5e-6,
      output_price: 30e-6,
      cache_write_price: 6.25e-6,
      cache_write_1h_price: 12.5e-6,
      cache_read_price: 0.5e-6,
      image_input_price: null,
      image_output_price: null,
      per_request_price: null,
      intervals: []
    },
    official_pricing: {
      input_price: 5e-6,
      output_price: 30e-6,
      cache_write_price: 6.25e-6,
      cache_write_1h_price: 12.5e-6,
      cache_read_price: 0.5e-6
    },
    ...overrides
  }
}

function mountTable(
  models: PlazaModel[],
  rateMultiplier = 1,
  userRateMultiplier?: number | null,
  extraProps: Record<string, unknown> = {}
) {
  return mount(PlazaModelPricingTable, {
    props: { models, rateMultiplier, userRateMultiplier: userRateMultiplier ?? null, ...extraProps }
  })
}

describe('PlazaModelPricingTable compact cards', () => {
  it('shows only input, output, and cache read for token models', () => {
    const card = mountTable([tokenModel()], 0.09).get('[data-testid="model-price-card"]')
    const rows = card.findAll('.price-row')

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.attributes('data-price-kind'))).toEqual([
      'input',
      'output',
      'cache-read'
    ])
    expect(card.text()).toContain('$0.45')
    expect(card.text()).toContain('$2.70')
    expect(card.text()).toContain('$0.045')
    expect(card.text()).toContain('$5.00')
    expect(card.text()).toContain('$30.00')
    expect(card.text()).toContain('$0.50')
    expect(card.text()).not.toContain('$6.25')
    expect(card.text()).not.toContain('$12.50')
  })

  it('uses the personal rate for the badge, paid prices, and metadata', () => {
    const card = mountTable([tokenModel()], 1, 0.8).get('[data-testid="model-price-card"]')

    expect(card.get('.model-rate').text()).toBe('0.8x')
    expect(card.get('[data-price-kind="input"] .paid-price').text()).toContain('$4.00')
    expect(card.get('[data-price-kind="input"] .price-meta').text()).toContain('0.8x')
    expect(card.find('.line-through').exists()).toBe(false)
  })

  it('does not expand long-context tiers or time-pricing periods into extra rows', () => {
    const model = tokenModel({
      pricing: {
        ...tokenModel().pricing!,
        intervals: [{
          min_tokens: 272000,
          max_tokens: null,
          tier_label: '>272K',
          input_price: 10e-6,
          output_price: 45e-6,
          cache_write_price: 12.5e-6,
          cache_read_price: 1e-6,
          per_request_price: null
        }]
      },
      time_pricing: {
        timezone: 'Asia/Shanghai',
        periods: [{ start_time: '00:30', end_time: '08:30', multiplier: 0.5 }]
      }
    })
    const wrapper = mountTable([model], 0.09)

    expect(wrapper.findAll('[data-testid="model-price-card"]')).toHaveLength(1)
    expect(wrapper.findAll('.price-row')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('>272K')
    expect(wrapper.text()).not.toContain('00:30')
  })

  it('keeps token models first and preserves output-price sorting', () => {
    const cheap = tokenModel({
      name: 'gpt-5.6-luna',
      official_pricing: { ...tokenModel().official_pricing!, output_price: 6e-6 }
    })
    const request = tokenModel({
      name: 'search-tool',
      pricing: {
        ...tokenModel().pricing!,
        billing_mode: 'per_request',
        per_request_price: 0.04
      },
      official_pricing: null
    })
    const cards = mountTable([request, cheap, tokenModel()]).findAll('[data-testid="model-price-card"]')

    expect(cards.map((card) => card.get('h3').text())).toEqual([
      'gpt-5.6-sol',
      'gpt-5.6-luna',
      'search-tool'
    ])
  })

  it('shows per-request pricing with original price and effective rate', () => {
    const model = tokenModel({
      name: 'search-tool',
      pricing: {
        ...tokenModel().pricing!,
        billing_mode: 'per_request',
        per_request_price: 0.04,
        intervals: []
      },
      official_pricing: null
    })
    const card = mountTable([model], 0.5).get('[data-testid="model-price-card"]')

    expect(card.findAll('.price-row')).toHaveLength(1)
    expect(card.get('.paid-price').text()).toContain('$0.02')
    expect(card.get('.price-meta').text()).toContain('$0.04')
    expect(card.get('.model-rate').text()).toBe('0.5x')
  })

  it('keeps image tiers and uses the independent image rate', () => {
    const model = tokenModel({
      name: 'gpt-image-2',
      pricing: {
        ...tokenModel().pricing!,
        billing_mode: 'image',
        per_request_price: null,
        intervals: [
          { min_tokens: 0, max_tokens: null, tier_label: '1K', input_price: null, output_price: null, cache_write_price: null, cache_read_price: null, per_request_price: 0.02 },
          { min_tokens: 0, max_tokens: null, tier_label: '2K', input_price: null, output_price: null, cache_write_price: null, cache_read_price: null, per_request_price: 0.04 }
        ]
      },
      official_pricing: null
    })
    const card = mountTable([model], 0.1, null, {
      imageRateIndependent: true,
      imageRateMultiplier: 1
    }).get('[data-testid="model-price-card"]')

    expect(card.findAll('.price-row')).toHaveLength(2)
    expect(card.text()).toContain('1K')
    expect(card.text()).toContain('2K')
    expect(card.text()).toContain('$0.02')
    expect(card.text()).toContain('$0.04')
    expect(card.get('.model-rate').text()).toBe('1x')
  })

  it('keeps platform badges for duplicate model names in composite groups', () => {
    const anthropic = tokenModel({ name: 'shared-model', platform: 'anthropic' })
    const openai = tokenModel({ name: 'shared-model', platform: 'openai' })
    const wrapper = mount(PlazaModelPricingTable, {
      props: { models: [anthropic, openai], platform: 'composite', rateMultiplier: 1 }
    })

    expect(wrapper.findAll('[data-testid="model-price-card"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Anthropic')
    expect(wrapper.text()).toContain('OpenAI')
  })
})
