import { watch, type Ref } from 'vue'

type Effect = (canvas: HTMLCanvasElement) => (() => void) | undefined
type EffectWindow = Window & { Sub2APIHomeEffects?: { fluid?: Effect; particles?: Effect } }
const scripts = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const existing = scripts.get(src)
  if (existing) return existing
  const request = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      scripts.delete(src)
      reject(new Error(`Failed to load ${src}`))
    }
    document.body.appendChild(script)
  })
  scripts.set(src, request)
  return request
}

export function useHomeEffects(
  fluidCanvas: Ref<HTMLCanvasElement | null>,
  particleCanvas: Ref<HTMLCanvasElement | null>,
) {
  // Watch the actual canvases: navigation and template hot reload can replace them.
  watch([fluidCanvas, particleCanvas], ([fluid, particles], _previous, onCleanup) => {
    if (!fluid || !particles) return
    let disposed = false
    const cleanups: Array<() => void> = []
    onCleanup(() => {
      disposed = true
      cleanups.forEach(cleanup => cleanup())
    })

    async function start(kind: 'fluid' | 'particles', canvas: HTMLCanvasElement) {
      try {
        if (kind === 'particles') {
          // Vendor icons are optional; keep the AI particles if they fail to load.
          await loadScript('/fluid/vendor-svgs.js').catch(() => undefined)
        }
        await loadScript(`/fluid/${kind === 'fluid' ? 'fluid-bg' : 'particle-bg'}.js`)
        if (disposed) return
        const cleanup = (window as EffectWindow).Sub2APIHomeEffects?.[kind]?.(canvas)
        if (cleanup) cleanups.push(cleanup)
      } catch (error) {
        console.warn(`[home] ${kind} effect unavailable`, error)
      }
    }

    // The 2D particles can run even if WebGL or the fluid asset is unavailable.
    void start('fluid', fluid)
    void start('particles', particles)
  }, { flush: 'post' })
}
