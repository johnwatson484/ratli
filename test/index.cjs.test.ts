import { describe, it, expect, beforeEach } from 'vitest'
import { Server } from '@hapi/hapi'

// Test CommonJS build
const module = await import('../dist/cjs/index.js')
const plugin = module.default || module

describe('rati (CommonJS)', () => {
  let server: Server

  beforeEach(async () => {
    server = new Server()
  })

  describe('plugin registration', () => {
    it('should register successfully with default options', async () => {
      await expect(
        server.register({
          plugin,
          options: {}
        })
      ).resolves.not.toThrow()
    })

    it('should register with custom version', async () => {
      await expect(
        server.register({
          plugin,
          options: { version: 'v2' }
        })
      ).resolves.not.toThrow()
    })

    it('should register with custom prefix', async () => {
      await expect(
        server.register({
          plugin,
          options: { prefix: 'service' }
        })
      ).resolves.not.toThrow()
    })

    it('should reject invalid option types', async () => {
      await expect(
        server.register({
          plugin,
          options: { version: 123 } as any
        })
      ).rejects.toThrow('Invalid plugin options')
    })

    it('should reject unknown options', async () => {
      await expect(
        server.register({
          plugin,
          options: { invalidOption: 'value' } as any
        })
      ).rejects.toThrow('Invalid plugin options')
    })
  })

  describe('route versioning', () => {
    it('should add default version and prefix to routes', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should add custom version and prefix to routes', async () => {
      await server.register({
        plugin,
        options: { version: 'v2', prefix: 'service' }
      })

      server.route({
        method: 'GET',
        path: '/users',
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/service/v2/users'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should handle routes with nested paths', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users/{id}/posts',
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/users/123/posts'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })
  })

  describe('route-level overrides', () => {
    it('should ignore route-specific version override (global prefix applies)', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: {
          plugins: {
            rati: { version: 'v2' }
          }
        },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should ignore route-specific prefix override (global prefix applies)', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: {
          plugins: {
            rati: { prefix: 'service' }
          }
        },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should expose alias path for version override on root path', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/',
        options: { plugins: { rati: { version: 'v2' } } },
        handler: () => ({ root: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/api/v2' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ root: true })
    })

    it('should expose alias path for prefix override on root path', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/',
        options: { plugins: { rati: { prefix: 'service' } } },
        handler: () => ({ root: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/service/v1' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ root: true })
    })

    it('should expose alias when global prefix/version are empty (version override)', async () => {
      await server.register({ plugin, options: { prefix: '', version: '' } })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: { version: 'v2' } } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/v2/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should expose alias when global prefix/version are empty (prefix override)', async () => {
      await server.register({ plugin, options: { prefix: '', version: '' } })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: { prefix: 'service' } } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/service/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should expose alias for a route registered before plugin', async () => {
      // Route added before plugin registration
      server.route({
        method: 'GET',
        path: '/pre',
        options: { plugins: { rati: { version: 'v2' } } },
        handler: () => ({ pre: true })
      })

      await server.register({ plugin })
      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/api/v2/pre' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ pre: true })
    })

    it('should expose alias path for route-specific version override', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: { version: 'v2' } } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/api/v2/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should expose alias path for route-specific prefix override', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: { prefix: 'service' } } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/service/v1/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })
  })

  describe('plugin disabling', () => {
    it('should not set global prefix when plugin is disabled', async () => {
      await server.register({ plugin, options: { enabled: false } })

      server.route({
        method: 'GET',
        path: '/users',
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })
    it('should not support per-route disabling with false (still prefixed)', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: {
          plugins: {
            rati: false
          }
        },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should expose unprefixed alias when per-route disabled with false', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: false } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })

    it('should not support per-route disabling with enabled: false (still prefixed)', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/health',
        options: {
          plugins: {
            rati: { enabled: false }
          }
        },
        handler: () => ({ status: 'ok' })
      })

      await server.initialize()

      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/health'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ status: 'ok' })
    })

    it('should expose unprefixed alias when per-route disabled with enabled: false', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/health',
        options: { plugins: { rati: { enabled: false } } },
        handler: () => ({ status: 'ok' })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ status: 'ok' })
    })

    it('should expose unprefixed alias on root path when per-route disabled', async () => {
      await server.register({ plugin })

      server.route({
        method: 'GET',
        path: '/',
        options: { plugins: { rati: false } },
        handler: () => ({ root: true })
      })

      await server.initialize()

      const res = await server.inject({ method: 'GET', url: '/' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ root: true })
    })
  })

  describe('mixed routes', () => {
    it('should version all routes when plugin is registered (no per-route disable)', async () => {
      await server.register({ plugin })

      server.route([
        {
          method: 'GET',
          path: '/users',
          handler: () => ({ versioned: true })
        },
        {
          method: 'GET',
          path: '/health',
          options: {
            plugins: {
              rati: false
            }
          },
          handler: () => ({ health: 'ok' })
        }
      ])

      await server.initialize()

      const versionedRes = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })
      expect(versionedRes.statusCode).toBe(200)
      expect(versionedRes.result).toEqual({ versioned: true })

      const healthRes = await server.inject({
        method: 'GET',
        url: '/api/v1/health'
      })
      expect(healthRes.statusCode).toBe(200)
      expect(healthRes.result).toEqual({ health: 'ok' })
    })

    it('should ignore different version overrides and use global', async () => {
      await server.register({ plugin })

      server.route([
        {
          method: 'GET',
          path: '/users',
          handler: () => ({ version: 'default' })
        },
        {
          method: 'GET',
          path: '/posts',
          options: {
            plugins: {
              rati: { version: 'v2' }
            }
          },
          handler: () => ({ version: 'v2' })
        }
      ])

      await server.initialize()

      const v1Res = await server.inject({
        method: 'GET',
        url: '/api/v1/users'
      })
      expect(v1Res.statusCode).toBe(200)
      expect(v1Res.result).toEqual({ version: 'default' })

      const v2Res = await server.inject({
        method: 'GET',
        url: '/api/v1/posts'
      })
      expect(v2Res.statusCode).toBe(200)
      expect(v2Res.result).toEqual({ version: 'v2' })
    })

    it('should expose alias for routes with different version overrides', async () => {
      await server.register({ plugin })

      server.route([
        { method: 'GET', path: '/users', handler: () => ({ version: 'default' }) },
        {
          method: 'GET',
          path: '/posts',
          options: { plugins: { rati: { version: 'v2' } } },
          handler: () => ({ version: 'v2' })
        }
      ])

      await server.initialize()

      const v2Res = await server.inject({ method: 'GET', url: '/api/v2/posts' })
      expect(v2Res.statusCode).toBe(200)
      expect(v2Res.result).toEqual({ version: 'v2' })
    })

    it('should not duplicate alias when override equals global', async () => {
      await server.register({ plugin, options: { prefix: 'api', version: 'v1' } })

      server.route({
        method: 'GET',
        path: '/users',
        options: { plugins: { rati: { prefix: 'api', version: 'v1' } } },
        handler: () => ({ success: true })
      })

      await server.initialize()

      const table = server.table().filter(r => r.method === 'get' && r.path === '/api/v1/users')
      expect(table.length).toBe(1)

      const res = await server.inject({ method: 'GET', url: '/api/v1/users' })
      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ success: true })
    })
  })
})
