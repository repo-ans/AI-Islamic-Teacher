import { DEMO_MODE } from '../env'
import { localRepo } from './local'
import { supabaseRepo } from './supabase'
import type { Repo } from './types'

export const repo: Repo = DEMO_MODE ? localRepo : supabaseRepo
export type { Repo, NewMissed } from './types'
