import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadConfig } from '../src/config-loader'
import { renderAscii, renderMermaid } from '../src/commands/visualize'

describe('renderAscii', () => {
  it('shows all states and transitions', async () => {
    const config = await loadConfig(resolve(__dirname, 'fixtures/valid-config.ts'))
    const output = renderAscii(config)

    expect(output).toContain('test-app (entrypoint: home)')
    expect(output).toContain('home /')
    expect(output).toContain('──search──> results')
    expect(output).toContain('──go-about──> about')
    expect(output).toContain('results /results')
    expect(output).toContain('──go-home──> home')
  })

  it('marks self-transitions', async () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: {
          route: '/',
          description: 'Home',
          actions: {
            refresh: { transitions: 'home' },
          },
        },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['refresh'],
        authenticatedActions: [],
      },
    }
    const output = renderAscii(config as any)
    expect(output).toContain('(self)')
  })

  it('marks auth actions', async () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: {
          route: '/',
          description: 'Home',
          actions: {
            buy: {
              params: { id: { type: 'string', required: true } },
              transitions: 'cart',
            },
          },
        },
        cart: { route: '/cart', description: 'Cart', actions: {} },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: [],
        authenticatedActions: ['buy'],
      },
    }
    const output = renderAscii(config as any)
    expect(output).toContain('[auth]')
  })
})

describe('renderMermaid', () => {
  it('outputs stateDiagram-v2 syntax', async () => {
    const config = await loadConfig(resolve(__dirname, 'fixtures/valid-config.ts'))
    const output = renderMermaid(config)

    expect(output).toContain('stateDiagram-v2')
    expect(output).toContain('[*] --> home')
    expect(output).toContain('home --> results : search')
    expect(output).toContain('home --> about : go-about')
  })

  it('escapes dots in state names', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'product.loading',
      states: {
        'product.loading': {
          route: '/product',
          description: 'Loading',
          actions: { done: { transitions: 'product.ready' } },
        },
        'product.ready': {
          route: '/product',
          description: 'Ready',
          actions: { back: { transitions: 'product.loading' } },
        },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['done', 'back'],
        authenticatedActions: [],
      },
    }
    const output = renderMermaid(config as any)
    expect(output).toContain('product_loading')
    expect(output).toContain('product_ready')
    expect(output).not.toContain('product.loading')
    expect(output).not.toContain('product.ready')
  })

  it('escapes spaces in state names', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'my state',
      states: {
        'my state': {
          route: '/',
          description: 'Test',
          actions: { go: { transitions: 'my state' } },
        },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['go'],
        authenticatedActions: [],
      },
    }
    const output = renderMermaid(config as any)
    expect(output).toContain('my_state')
    expect(output).not.toMatch(/my state/)
  })

  it('leaves valid identifier names unchanged', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home_page',
      states: {
        'home_page': {
          route: '/',
          description: 'Home',
          actions: { go: { transitions: 'home_page' } },
        },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['go'],
        authenticatedActions: [],
      },
    }
    const output = renderMermaid(config as any)
    expect(output).toContain('home_page')
  })

  it('handles self-transitions', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: {
          route: '/',
          description: 'Home',
          actions: { refresh: { transitions: 'home' } },
        },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['refresh'],
        authenticatedActions: [],
      },
    }
    const output = renderMermaid(config as any)
    expect(output).toContain('home --> home : refresh')
  })
})
