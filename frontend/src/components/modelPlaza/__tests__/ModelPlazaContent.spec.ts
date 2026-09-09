import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelPlazaContent from '../ModelPlazaContent.vue'
import PlazaFilterBar from '../PlazaFilterBar.vue'
import PlazaGroupSection from '../PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse, PlazaModel } from '@/api/modelPlaza'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: false })
}))

function model(name: string, platform: string): PlazaModel {
  return { name, platform, pricing: null, official_pricing: null }
}

function group(id: number, name: string, platform: string, rate: number, models: PlazaModel[]): ModelPlazaGroup {
  return {
    id,
    name,
    description: '',
    platform,
    subscription_type: 'standard',
    rate_multiplier: rate,
    peak_rate_enabled: false,
    peak_start: '',
    peak_end: '',
    peak_rate_multiplier: 1,
    is_exclusive: false,
    image_rate_independent: false,
    image_rate_multiplier: 1,
    long_context_pricing_enabled: true,
    models
  }
}

const response: ModelPlazaResponse = {
  description: '',
  groups: [
    group(1, 'OpenAI Plus', 'openai', 0.5, [model('gpt-alpha', 'openai'), model('gpt-beta', 'openai')]),
    group(2, 'Claude Max', 'anthropic', 1, [model('claude-alpha', 'anthropic')])
  ]
}

const FilterStub = defineComponent({
  name: 'PlazaFilterBar',
  props: ['groups', 'rates', 'groupId', 'rate', 'search'],
  emits: ['update:groupId', 'update:rate', 'update:search'],
  template: '<div class="filter-stub" />'
})

const GroupStub = defineComponent({
  name: 'PlazaGroupSection',
  props: ['group'],
  template: '<div class="group-stub">{{ group.name }}</div>'
})

function mountContent() {
  return mount(ModelPlazaContent, {
    props: { response, loading: false },
    global: {
      stubs: {
        Icon: true,
        PlazaFilterBar: FilterStub,
        PlazaGroupSection: GroupStub
      }
    }
  })
}

describe('ModelPlazaContent', () => {
  it('载入后默认聚焦首个分组,切换时只渲染当前分组', async () => {
    const wrapper = mountContent()
    const filter = wrapper.findComponent(PlazaFilterBar)

    expect(filter.props('groupId')).toBe(1)
    expect(wrapper.findComponent(PlazaGroupSection).props('group').id).toBe(1)

    filter.vm.$emit('update:groupId', 2)
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(PlazaGroupSection).props('group').id).toBe(2)
  })

  it('模型搜索只过滤当前分组并保留目录上下文', async () => {
    const wrapper = mountContent()
    const filter = wrapper.findComponent(PlazaFilterBar)

    filter.vm.$emit('update:search', 'beta')
    await wrapper.vm.$nextTick()
    const visibleGroup = wrapper.findComponent(PlazaGroupSection).props('group') as ModelPlazaGroup
    expect(visibleGroup.id).toBe(1)
    expect(visibleGroup.models.map((item) => item.name)).toEqual(['gpt-beta'])
  })
})
