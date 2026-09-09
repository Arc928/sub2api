import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaFilterBar from '../PlazaFilterBar.vue'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

const groups = [
  { id: 1, name: 'OpenAI Plus', platform: 'openai', rate: 0.5 },
  { id: 2, name: 'OpenAI Pro', platform: 'openai', rate: 1 },
  { id: 3, name: 'Claude Max', platform: 'anthropic', rate: 0.5 }
]

function mountFilter(rate: number | 'all' = 'all') {
  return mount(PlazaFilterBar, {
    props: {
      groups,
      rates: [0.5, 1],
      groupId: 1,
      rate,
      search: ''
    },
    global: {
      stubs: { Icon: true, PlatformIcon: true }
    }
  })
}

describe('PlazaFilterBar', () => {
  it('按平台分栏展示分组并标记当前项', () => {
    const wrapper = mountFilter()

    expect(wrapper.find('[aria-label="openai"]').text()).toContain('OpenAI Plus')
    expect(wrapper.find('[aria-label="openai"]').text()).toContain('OpenAI Pro')
    expect(wrapper.find('[aria-label="anthropic"]').text()).toContain('Claude Max')
    expect(wrapper.findAll('.group-tab-active')).toHaveLength(1)
    expect(wrapper.find('.group-tab-active').text()).toContain('OpenAI Plus')
  })

  it('点击分组发出选择事件,倍率筛选会禁用不匹配的分组', async () => {
    const wrapper = mountFilter(0.5)
    const buttons = wrapper.findAll('.group-tab')

    expect(buttons[1].attributes('disabled')).toBeDefined()
    expect(buttons[2].attributes('disabled')).toBeUndefined()
    await buttons[2].trigger('click')
    expect(wrapper.emitted('update:groupId')).toEqual([[3]])
  })
})
