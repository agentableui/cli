import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadConfig } from '../src/config-loader'
import { validateConfig } from '../src/commands/validate'
import type { AgentableConfig } from '@agentableui/core'

describe('validateConfig', () => {
  it('returns no errors for valid config', async () => {
    const config = await loadConfig(resolve(__dirname, 'fixtures/valid-config.ts'))
    const result = validateConfig(config)
    expect(result.errors).toHaveLength(0)
  })

  it('detects orphan states', async () => {
    const config = await loadConfig(resolve(__dirname, 'fixtures/orphan-state-config.ts'))
    const result = validateConfig(config)
    expect(result.errors.some(e => e.includes('orphan'))).toBe(true)
  })

  it('detects invalid transitions', async () => {
    const config = (await import('./fixtures/invalid-transition-config')).default as unknown as AgentableConfig
    const result = validateConfig(config)
    expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true)
  })

  it('detects invalid redirect targets', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: { route: '/', description: 'Home', actions: {
          buy: {
            params: { id: { type: 'string', required: true } },
            redirects: { 'auth-required': 'nonexistent-login' },
            transitions: 'home',
          },
        }},
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['buy'],
        authenticatedActions: [],
      },
    } as unknown as AgentableConfig
    const result = validateConfig(config)
    expect(result.errors.some(e => e.includes('redirects') && e.includes('nonexistent-login'))).toBe(true)
  })

  it('passes with valid redirect targets', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: { route: '/', description: 'Home', actions: {
          buy: {
            params: { id: { type: 'string', required: true } },
            redirects: { 'auth-required': 'login' },
            transitions: 'home',
          },
        }},
        login: { route: '/login', description: 'Login', actions: {
          auth: { transitions: 'home' },
        }},
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['buy', 'auth'],
        authenticatedActions: [],
      },
    } as unknown as AgentableConfig
    const result = validateConfig(config)
    expect(result.errors.filter(e => e.includes('redirect'))).toHaveLength(0)
  })

  it('nonexistent redirect target does not suppress orphan detection', () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: { route: '/', description: 'Home', actions: {
          buy: {
            params: { id: { type: 'string', required: true } },
            redirects: { 'auth-required': 'does-not-exist' },
          },
        }},
        orphan: { route: '/orphan', description: 'Orphan', actions: {} },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: ['buy'],
        authenticatedActions: [],
      },
    } as unknown as AgentableConfig
    const result = validateConfig(config)
    // orphan should still be detected as orphan
    expect(result.errors.some(e => e.includes('orphan') && e.includes('unreachable'))).toBe(true)
    // redirect to nonexistent should be an error
    expect(result.errors.some(e => e.includes('does-not-exist'))).toBe(true)
  })

  it('detects empty states', async () => {
    const config = {
      name: 'test',
      baseUrl: 'http://localhost',
      entrypoint: 'home',
      states: {
        home: { route: '/', description: 'Home', actions: { go: { transitions: 'empty' } } },
        empty: { route: '/empty', description: 'Empty', actions: {} },
      },
      auth: { public: '*' },
      security: {
        requireApiKey: false,
        rateLimit: { requests: 100, window: '1m', scope: 'per-key' },
        publicActions: [], authenticatedActions: [],
      },
    } as unknown as AgentableConfig

    const result = validateConfig(config)
    expect(result.warnings.some(w => w.includes('empty') && w.includes('no actions'))).toBe(true)
  })
})
