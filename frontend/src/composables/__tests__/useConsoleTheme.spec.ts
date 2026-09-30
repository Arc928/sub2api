import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { isConsoleRoute, useConsoleTheme } from '../useConsoleTheme'

const auth = reactive({ isAuthenticated: true })
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.documentElement.removeAttribute('data-ui-theme')
  document.body.innerHTML = ''
  auth.isAuthenticated = true
})

describe('console route theme', () => {
  it.each(['Dashboard', 'AdminDashboard', 'PaymentResult', 'StripePopup'])(
    'enables the theme for a marked %s route', (name) => {
      expect(isConsoleRoute({ name, meta: { uiTheme: 'claude-console' }, query: {} }, false)).toBe(true)
    },
  )

  it.each(['Home', 'Login', 'Register', 'KeyUsage', 'ModelPlaza'])(
    'keeps an unmarked public %s route outside the theme', (name) => {
      expect(isConsoleRoute({ name, meta: {}, query: {} }, true)).toBe(false)
    },
  )

  it('requires both embedded mode and authentication for the model plaza', () => {
    const route = { name: 'ModelPlaza', meta: {}, query: { embedded: '1' } }
    expect(isConsoleRoute(route, true)).toBe(true)
    expect(isConsoleRoute(route, false)).toBe(false)
    expect(isConsoleRoute({ ...route, query: {} }, true)).toBe(false)
  })

  it('themes body-level dialogs and clears the theme when returning to login', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard', component: {}, meta: { uiTheme: 'claude-console' } },
        { path: '/login', component: {} },
      ],
    })
    await router.push('/dashboard')
    const Harness = defineComponent({
      setup() {
        useConsoleTheme()
        return () => h(BaseDialog, { show: true, title: 'Details' })
      },
    })
    wrapper = mount(Harness, { attachTo: document.body, global: { plugins: [router] } })
    await nextTick()
    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.closest('html[data-ui-theme="claude-console"]')).toBe(document.documentElement)

    await router.push('/login')
    expect(document.documentElement.hasAttribute('data-ui-theme')).toBe(false)
    expect(dialog.closest('[data-ui-theme]')).toBeNull()
  })

  it('updates the embedded plaza theme on logout and releases it on unmount', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ name: 'ModelPlaza', path: '/model-plaza', component: {} }],
    })
    await router.push('/model-plaza?embedded=1')
    wrapper = mount(defineComponent({
      setup() { useConsoleTheme(); return () => h('div') },
    }), { global: { plugins: [router] } })
    expect(document.documentElement.getAttribute('data-ui-theme')).toBe('claude-console')
    auth.isAuthenticated = false
    expect(document.documentElement.hasAttribute('data-ui-theme')).toBe(false)
    auth.isAuthenticated = true
    wrapper.unmount()
    wrapper = undefined
    expect(document.documentElement.hasAttribute('data-ui-theme')).toBe(false)
  })
})
