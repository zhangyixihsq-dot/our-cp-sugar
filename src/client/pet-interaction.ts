import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { DesktopPetHandle } from './desk-pet-controller.ts'
import { latestAssistant, openSession, waitForAssistant } from './session-helpers.ts'

const RECORDS_KEY = 'dsh-custom-background.pet-interactions'
const MAX_ROUNDS = 10
const READ_PAUSE_MS = 2600

export interface PetInteractionRecord {
  id: string
  createdAt: number
  turns: readonly { pet: string; petName?: string; text: string }[]
}

export interface PetInteractionManager {
  records(): readonly PetInteractionRecord[]
  deleteRecord(id: string): void
  clearRecords(): void
  subscribe(listener: () => void): () => void
}

type PetId = 'primary' | 'secondary'

interface PetPair { primary: DesktopPetHandle; secondary: DesktopPetHandle }

/** Coordinates two independent host sessions and keeps a local transcript index. */
export class DesktopPetInteractionController implements PetInteractionManager {
  private readonly listeners = new Set<() => void>()
  private readonly pair: PetPair
  private readonly sessions: ISessions
  private recordsValue: readonly PetInteractionRecord[]
  private readonly stopInteractPrimary: () => void
  private readonly stopInteractSecondary: () => void
  private busy = false
  private disposed = false

  constructor(sessions: ISessions, pair: PetPair) {
    this.sessions = sessions
    this.pair = pair
    this.recordsValue = readRecords()
    this.stopInteractPrimary = pair.primary.onInteract(() => { void this.startInteraction('primary') })
    this.stopInteractSecondary = pair.secondary.onInteract(() => { void this.startInteraction('secondary') })
  }

  records(): readonly PetInteractionRecord[] { return this.recordsValue }

  deleteRecord(id: string): void {
    const next = this.recordsValue.filter(record => record.id !== id)
    if (next.length === this.recordsValue.length) return
    this.recordsValue = next
    this.persist()
    this.notify()
  }

  clearRecords(): void {
    if (this.recordsValue.length === 0) return
    this.recordsValue = []
    this.persist()
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  dispose(): void {
    this.disposed = true
    this.stopInteractPrimary()
    this.stopInteractSecondary()
    this.listeners.clear()
  }

  private async startInteraction(initiator: PetId): Promise<void> {
    if (this.busy || this.disposed) return
    this.busy = true
    const turns: { pet: string; petName?: string; text: string }[] = []
    try {
      const sessionService = this.sessions as ISessions & { create(): Promise<SessionId> }
      if (typeof sessionService.create !== 'function') {
        throw new Error('当前 DSH 会话服务不支持创建 session')
      }
      const primaryId = await sessionService.create()
      const secondaryId = await sessionService.create()
      const primary = this.sessions.binding(primaryId)?.session
      const secondary = this.sessions.binding(secondaryId)?.session
      if (primary === undefined || secondary === undefined) {
        throw new Error('桌宠 session 未能建立绑定')
      }
      await openSession(primary)
      await openSession(secondary)

      let next = initiator
      let context = '请和另一位桌宠进行一段简短、自然的对话。只输出一句对话台词本身，不要包含动作、表情、心理或旁白描述，不要使用括号、星号或解释。'
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const pet = next === 'primary' ? this.pair.primary : this.pair.secondary
        const session = next === 'primary' ? primary : secondary
        const prompt = `${pet.personality() || '保持友善、简洁并符合你的角色。'}\n${context}`
        const previous = latestAssistant(session)
        const result = await session.prompt([{ type: 'text', text: prompt }], 'queue')
        if (!result.ok) break
        const text = await waitForAssistant(session, previous)
        if (!text) break
        turns.push({ pet: next, petName: pet.name(), text })
        pet.speak(text)
        await wait(READ_PAUSE_MS)
        context = `对方刚才说：“${text}”\n请只回复一句对话台词，不要描述动作或心情。`
        next = next === 'primary' ? 'secondary' : 'primary'
      }

      if (turns.length > 0) {
        const record: PetInteractionRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), turns }
        this.recordsValue = [record, ...this.recordsValue].slice(0, 20)
        this.persist()
        this.notify()
      }
    } catch (error) {
      console.error('[our-cp-sugar] 桌宠互动失败', error)
      this.pair[initiator].speak(document.documentElement.lang.toLowerCase().startsWith('zh') ? '互动暂时不可用' : 'Interaction unavailable')
    } finally {
      this.busy = false
    }
  }

  private persist(): void {
    try { window.localStorage.setItem(RECORDS_KEY, JSON.stringify(this.recordsValue)) } catch { /* optional */ }
  }

  private notify(): void { for (const listener of this.listeners) listener() }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => { window.setTimeout(resolve, ms) })
}

function readRecords(): readonly PetInteractionRecord[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECORDS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecord).slice(0, 20)
  } catch { return [] }
}

function isRecord(value: unknown): value is PetInteractionRecord {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<PetInteractionRecord>
  return typeof item.id === 'string' && typeof item.createdAt === 'number' && Array.isArray(item.turns)
    && item.turns.every(turn => {
      if (typeof turn !== 'object' || turn === null) return false
      const current = turn as { pet?: unknown; petName?: unknown; text?: unknown }
      return typeof current.pet === 'string' && typeof current.text === 'string' && (current.petName === undefined || typeof current.petName === 'string')
    })
}
