import { onBeforeUnmount, watch } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    uiTheme?: 'claude-console'
  }
}

export function isConsoleRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'meta' | 'name' | 'query'>,
  isAuthenticated: boolean,
): boolean {
  return route.meta.uiTheme === 'claude-console'
    || (route.name === 'ModelPlaza' && route.query.embedded === '1' && isAuthenticated)
}

/** Apply the route's theme above both app content and body-level Teleports. */
export function useConsoleTheme() {
  const route = useRoute()
  const authStore = useAuthStore()
  const root = document.documentElement
  const previousTheme = root.getAttribute('data-ui-theme')

  const stop = watch(
    () => isConsoleRoute(route, authStore.isAuthenticated),
    (enabled) => {
      if (enabled) root.setAttribute('data-ui-theme', 'claude-console')
      else root.removeAttribute('data-ui-theme')
    },
    { immediate: true, flush: 'sync' },
  )

  onBeforeUnmount(() => {
    stop()
    if (previousTheme === null) root.removeAttribute('data-ui-theme')
    else root.setAttribute('data-ui-theme', previousTheme)
  })
}
