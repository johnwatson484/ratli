import { Server, type Plugin, type ReqRefDefaults, type RequestRoute } from '@hapi/hapi'
import { applyToDefaults } from '@hapi/hoek'
import Joi from 'joi'

interface RatiPluginOptions {
}

const defaultOptions: RatiPluginOptions = {
}

const optionsSchema = Joi.object({
}).unknown(false)

const plugin: Plugin<RatiPluginOptions> = {
  name: 'rati',
  register: async function (server: Server, options: RatiPluginOptions = {}) {
    const { error, value } = optionsSchema.validate(options)

    if (error) {
      throw new Error(`Invalid plugin options: ${error.message}`)
    }

    const mergedOptions: RatiPluginOptions = applyToDefaults(defaultOptions, value)

    // TODO
  }
}

export default plugin

export type { RatiPluginOptions }
