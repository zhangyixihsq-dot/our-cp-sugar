export const PET_ACTIVITY_ENDPOINT = '/api/yixi-custom-pet/state'
export const PET_START_PHRASE = '桑多涅，你看这是什么？'
export const PET_END_PHRASE = '哈？这个你也要问我？'

export interface PetActivityState {
  sequence: number
  startedAt: number
  completedSequence: number
  completedAt: number
}

export function isPetActivityState(value: unknown): value is PetActivityState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<PetActivityState>
  return Number.isInteger(state.sequence)
    && (state.sequence ?? -1) >= 0
    && typeof state.startedAt === 'number'
    && Number.isFinite(state.startedAt)
    && Number.isInteger(state.completedSequence)
    && (state.completedSequence ?? -1) >= 0
    && (state.completedSequence ?? 0) <= (state.sequence ?? 0)
    && typeof state.completedAt === 'number'
    && Number.isFinite(state.completedAt)
}

export function recordPetActivity(state: PetActivityState, eventType: string, now = Date.now()): boolean {
  if (eventType === 'turn/start') {
    state.sequence += 1
    state.startedAt = now
    return true
  }
  if (eventType === 'turn/end' && state.completedSequence < state.sequence) {
    state.completedSequence = state.sequence
    state.completedAt = now
    return true
  }
  return false
}
