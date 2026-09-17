import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

describe('home effect lifecycle', () => {
  let scope: ReturnType<typeof effectScope>
  const fluidCleanup = vi.fn()
  const particleCleanup = vi.fn()
  const fluid = vi.fn(() => fluidCleanup)
  const particles = vi.fn(() => particleCleanup)

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    Object.assign(window, { Sub2APIHomeEffects: { fluid, particles } })
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
    document.querySelectorAll('script[src^="/fluid/"]').forEach(script => script.remove())
    vi.restoreAllMocks()
  })

  async function mountEffects() {
    const { useHomeEffects } = await import('../useHomeEffects')
    const fluidCanvas = ref<HTMLCanvasElement | null>(null)
    const particleCanvas = ref<HTMLCanvasElement | null>(null)
    scope.run(() => useHomeEffects(fluidCanvas, particleCanvas))
    fluidCanvas.value = document.createElement('canvas')
    particleCanvas.value = document.createElement('canvas')
    await nextTick()
    return { fluidCanvas, particleCanvas }
  }

  async function finishScript(name: string, event = 'load') {
    const script = document.querySelector(`script[src="/fluid/${name}.js"]`)
    expect(script).not.toBeNull()
    script!.dispatchEvent(new Event(event))
    await flushPromises()
  }

  async function loadAll() {
    await finishScript('fluid-bg')
    await finishScript('vendor-svgs')
    await finishScript('particle-bg')
  }

  it('restarts on replacement canvases and disposes the previous animations', async () => {
    const refs = await mountEffects()
    await loadAll()
    const replacement = document.createElement('canvas')
    refs.particleCanvas.value = replacement
    await flushPromises()

    expect(fluidCleanup).toHaveBeenCalledOnce()
    expect(particleCleanup).toHaveBeenCalledOnce()
    expect(particles).toHaveBeenLastCalledWith(replacement)
    expect(document.querySelectorAll('script[src^="/fluid/"]')).toHaveLength(3)
    scope.stop()
    expect(particleCleanup).toHaveBeenCalledTimes(2)
  })

  it('does not start a stale animation after leaving while scripts load', async () => {
    await mountEffects()
    scope.stop()
    await loadAll()
    expect(fluid).not.toHaveBeenCalled()
    expect(particles).not.toHaveBeenCalled()
  })

  it('keeps particles working when the fluid and optional vendor assets fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const refs = await mountEffects()
    await finishScript('fluid-bg', 'error')
    await finishScript('vendor-svgs', 'error')
    await finishScript('particle-bg')
    expect(fluid).not.toHaveBeenCalled()
    expect(particles).toHaveBeenCalledWith(refs.particleCanvas.value)
  })
})
