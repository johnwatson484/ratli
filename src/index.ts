import { Server, type Plugin, type ReqRefDefaults, type RequestRoute } from '@hapi/hapi'
import { applyToDefaults } from '@hapi/hoek'
import Joi from 'joi'

interface RatiPluginOptions {
  version?: string
  prefix?: string
  enabled?: boolean
}

const defaultOptions: RatiPluginOptions = {
  version: 'v1',
  prefix: 'api'
}

const optionsSchema = Joi.object({
  version: Joi.string().min(1).max(255).allow(''),
  prefix: Joi.string().min(1).max(255).allow(''),
  enabled: Joi.boolean().optional()
}).unknown(false)

const plugin: Plugin<RatiPluginOptions> = {
  name: 'rati',
  register: async function (server: Server, options: RatiPluginOptions = {}) {
    const { error, value } = optionsSchema.validate(options)

    if (error) {
      throw new Error(`Invalid plugin options: ${error.message}`)
    }

    const mergedOptions: RatiPluginOptions = applyToDefaults(defaultOptions, value)

    if (mergedOptions.enabled === false) {
      return
    }

    const parts: string[] = []

    if (mergedOptions.prefix) {
      parts.push(mergedOptions.prefix)
    }

    if (mergedOptions.version) {
      parts.push(mergedOptions.version)
    }

    const normalizedPrefix: string = parts.length ? '/' + parts.join('/') : ''

    let realm = server.realm as any
    while (realm.parent) {
      realm = realm.parent
    }

    const existing: string = realm.modifiers.route.prefix || ''
    const globalPrefix: string = normalizedPrefix || existing
    realm.modifiers.route.prefix = globalPrefix

    server.ext('onPreStart', () => {
      const routes: RequestRoute<ReqRefDefaults>[] = server.table()

      const stripGlobal = (path: string): string => {
        if (!globalPrefix) {
          return path
        }

        if (path.startsWith(globalPrefix)) {
          const trimmed: string = path.slice(globalPrefix.length)
          return trimmed.length ? trimmed : '/'
        }
        return path
      }

      const buildVersionedPath = (originalPath: string, prefix?: string, version?: string): string => {
        const segments: string[] = []

        if (prefix) {
          segments.push(prefix)
        }

        if (version) {
          segments.push(version)
        }

        const cleanPath: string = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath

        if (cleanPath) {
          segments.push(cleanPath)
        }

        return '/' + segments.join('/').replaceAll(/\/+/g, '/')
      }

      for (const route of routes) {
        const routePlugins = (route.settings && (route.settings as any).plugins) || {}
        const ratiConfig = routePlugins.rati

        if (ratiConfig === undefined) {
          continue
        }

        const originalPath: string = stripGlobal(route.path)

        if (ratiConfig === false || ratiConfig?.enabled === false) {
          server.route({ method: route.method, path: originalPath, handler: (route.settings as any).handler })
          continue
        }

        const hasPrefix: boolean = ratiConfig && Object.hasOwn(ratiConfig, 'prefix')
        const hasVersion: boolean = ratiConfig && Object.hasOwn(ratiConfig, 'version')

        const overridePrefix: string = hasPrefix ? ratiConfig.prefix : mergedOptions.prefix
        const overrideVersion: string = hasVersion ? ratiConfig.version : mergedOptions.version

        const aliasPath: string = buildVersionedPath(originalPath, overridePrefix, overrideVersion)

        if (aliasPath !== route.path) {
          server.route({ method: route.method, path: aliasPath, handler: (route.settings as any).handler })
        }
      }
    })
  }
}

export default plugin

export type { RatiPluginOptions }
