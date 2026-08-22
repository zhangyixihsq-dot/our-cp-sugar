import type { SessionFace } from '@deepseek-ai/dsh-client-runtime/client'

type OpenableSessionFace = SessionFace & { open(): Promise<void> }

export async function openSession(session: SessionFace): Promise<void> {
  const openable = session as OpenableSessionFace
  if (typeof openable.open === 'function') await openable.open()
}

export function latestAssistant(session: SessionFace): string {
  const node = [...session.getSnapshot().nodes].reverse().find(item => item.kind === 'assistant')
  if (node === undefined || node.kind !== 'assistant') return ''
  return node.blocks.filter(block => block.kind === 'text').map(block => block.text).join('').trim()
}

export async function waitForAssistant(session: SessionFace, previous: string, timeoutMs = 120000): Promise<string> {
  const existing = latestAssistant(session)
  if (!session.getSnapshot().running && existing !== '' && existing !== previous) return existing

  return await new Promise(resolve => {
    let settled = false
    const finish = (value: string): void => {
      if (settled) return
      settled = true
      stop()
      resolve(value)
    }
    const stop = session.subscribe(() => {
      const snapshot = session.getSnapshot()
      const latest = latestAssistant(session)
      if (!snapshot.running && latest !== '' && latest !== previous) finish(latest)
    })
    window.setTimeout(() => {
      const latest = latestAssistant(session)
      finish(latest === previous ? '' : latest)
    }, timeoutMs)
  })
}
