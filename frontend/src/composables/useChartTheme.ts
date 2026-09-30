import { computed, ref } from 'vue'
import { useMutationObserver } from '@vueuse/core'

const legacyPalette = [
  '#007aff', '#30d158', '#ff9f0a', '#ff3b30', '#201d1d', '#646262',
  '#9a9898', '#0056b3', '#24a947', '#cc7f08', '#d70015', '#424245',
]

/** Canvas charts need reactive colors; CSS inheritance cannot recolor pixels. */
export function useChartTheme() {
  const root = document.documentElement
  const isDark = ref(root.classList.contains('dark'))
  const isConsole = ref(root.getAttribute('data-ui-theme') === 'claude-console')

  useMutationObserver(root, () => {
    isDark.value = root.classList.contains('dark')
    isConsole.value = root.getAttribute('data-ui-theme') === 'claude-console'
  }, { attributes: true, attributeFilter: ['class', 'data-ui-theme'] })

  const colors = computed(() => {
    const dark = isDark.value
    if (!isConsole.value) {
      return {
        text: dark ? '#e5e7eb' : '#374151',
        grid: dark ? '#374151' : '#e5e7eb',
        tooltipBg: dark ? '#1f2937' : '#ffffff',
        tooltipTitle: dark ? '#f3f4f6' : '#111827',
        tooltipBody: dark ? '#d1d5db' : '#4b5563',
        primary: '#3b82f6', teal: '#10b981', amber: '#f59e0b',
        success: '#10b981', error: '#ef4444', muted: '#9a9898',
        secondary: '#007aff', tertiary: '#8b5cf6',
        font: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", palette: legacyPalette,
      }
    }
    return {
      text: dark ? '#a09d96' : '#6c6a64',
      grid: dark ? '#3d3a35' : '#e6dfd8',
      tooltipBg: dark ? '#252320' : '#faf9f5',
      tooltipTitle: dark ? '#faf9f5' : '#141413',
      tooltipBody: dark ? '#e6dfd8' : '#3d3d3a',
      primary: '#cc785c', teal: '#5db8a6', amber: '#e8a55a',
      success: '#5db872', error: '#c64545', muted: '#8e8b82',
      secondary: dark ? '#e8e0d2' : '#6c6a64', tertiary: '#bc975b',
      font: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
      palette: [
        '#cc785c', '#5db8a6', '#e8a55a', '#bc975b',
        dark ? '#e8e0d2' : '#3d3d3a', '#8e8b82', '#a09d96',
        '#a9583e', '#387f73', '#ae773a', '#c64545', '#6c6a64',
      ],
    }
  })

  const tooltipStyle = computed(() => ({
    backgroundColor: colors.value.tooltipBg,
    titleColor: colors.value.tooltipTitle,
    bodyColor: colors.value.tooltipBody,
    borderColor: colors.value.grid,
    borderWidth: 1,
    cornerRadius: 8,
    titleFont: { family: colors.value.font },
    bodyFont: { family: colors.value.font },
  }))

  const seriesColors = (count: number) => Array.from(
    { length: count }, (_, index) => colors.value.palette[index % colors.value.palette.length],
  )

  return { colors, tooltipStyle, seriesColors }
}
