import PouchDB from 'pouchdb'
import { config } from './config.js'
import type { DatabaseDoc } from './types.js'

export const database = new PouchDB<DatabaseDoc>(config.pouchDbPath)
