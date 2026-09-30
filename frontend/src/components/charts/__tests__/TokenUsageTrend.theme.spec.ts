import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TokenUsageTrend from '../TokenUsageTrend.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', props: ['data', 'options'], template: '<div />' },
}))

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  document.documentElement.removeAttribute('data-ui-theme')
  document.documentElement.classList.remove('dark')
})

describe('chart theme changes', () => {
  it('recolors an existing chart and tooltip without changing its data or remounting', async () => {
    document.documentElement.setAttribute('data-ui-theme', 'claude-console')
    wrapper = mount(TokenUsageTrend, { props: { trendData: [{
      date: '2026-10-01', requests: 3, input_tokens: 500, output_tokens: 100,
      cache_creation_tokens: 0, cache_read_tokens: 1500, cost: 0.01, actual_cost: 0.005,
    }] } })
    const line = wrapper.findComponent({ name: 'Line' })
    const originalData = line.props('data').datasets.map((item: any) => item.data)
    expect(line.props('data').datasets[0].borderColor).toBe('#cc785c')
    expect(line.props('options').plugins.tooltip.backgroundColor).toBe('#faf9f5')
    expect(line.props('options').scales.x.ticks.color).toBe('#6c6a64')

    document.documentElement.classList.add('dark')
    await nextTick()
    await nextTick()
    expect(line.props('options').plugins.tooltip.backgroundColor).toBe('#252320')
    expect(line.props('options').scales.x.ticks.color).toBe('#a09d96')
    expect(line.props('data').datasets.map((item: any) => item.data)).toEqual(originalData)

    document.documentElement.removeAttribute('data-ui-theme')
    await nextTick()
    await nextTick()
    expect(line.props('data').datasets[0].borderColor).toBe('#3b82f6')
    expect(line.props('options').plugins.tooltip.backgroundColor).toBe('#1f2937')
  })
})
