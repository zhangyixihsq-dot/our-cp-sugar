import type { ISessions, SessionFace, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { latestAssistant, openSession, waitForAssistant } from './session-helpers.ts'

export type PetPhraseKind = 'click' | 'activity'

export type PetPhraseProvider = (kind: PetPhraseKind) => Promise<string>

/** Generates short in-character lines for clicks and activity events using one reused session. */
export function createPetPhraseProvider(
  sessions: ISessions,
  getPersonality: () => string,
  activityKind: 'start' | 'end',
): PetPhraseProvider {
  let sessionPromise: Promise<SessionFace> | undefined

  const ensureSession = async (): Promise<SessionFace> => {
    if (sessionPromise === undefined) {
      sessionPromise = createPhraseSession(sessions)
    }
    try {
      return await sessionPromise
    } catch (error) {
      sessionPromise = undefined
      throw error
    }
  }

  return async (kind: PetPhraseKind): Promise<string> => {
    const session = await ensureSession()
    const prompt = buildPhrasePrompt(kind, activityKind, getPersonality())
    const previous = latestAssistant(session)
    const result = await session.prompt([{ type: 'text', text: prompt }], 'queue')
    if (!result.ok) return ''
    return await waitForAssistant(session, previous)
  }
}

async function createPhraseSession(sessions: ISessions): Promise<SessionFace> {
  const service = sessions as ISessions & { create(): Promise<SessionId> }
  if (typeof service.create !== 'function') throw new Error('当前 DSH 会话服务不支持创建 session')
  const id = await service.create()
  const session = sessions.binding(id)?.session
  if (session === undefined) throw new Error('桌宠文案 session 未能建立绑定')
  await openSession(session)
  return session
}

function buildPhrasePrompt(kind: PetPhraseKind, activityKind: 'start' | 'end', personality: string): string {
  const persona = personality.trim() || '你是一个有个性的二次元角色，说话简短自然。'
  const format = '只输出一句台词本身，不要包含动作、表情、心理、旁白或解释，不要使用括号、星号。请随机换一种说法，避免重复。'
  if (kind === 'click') {
    return `${persona}\n你被主人轻轻戳了一下，请用符合你性格的一句话回应。${format}`
  }
  if (activityKind === 'start') {
    return `${persona}\n模型刚刚开始生成一段新内容，你注意到了什么，请用符合你性格的一句话打招呼或短评。${format}`
  }
  return `${persona}\n模型刚刚结束了一段内容，你有点想吐槽或回应，请用符合你性格的一句话回应。${format}`
}
