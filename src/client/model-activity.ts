import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** Watches the current chat session's `running` flag and reports turn start/end transitions. */
export function watchModelActivity(
  sessions: ISessions,
  onStart: () => void,
  onEnd: () => void,
): () => void {
  let subscribedId: SessionId | undefined
  let running = false
  let initialized = false
  let stopSession: (() => void) | undefined

  const stopWatching = (): void => {
    stopSession?.()
    stopSession = undefined
    subscribedId = undefined
    running = false
    initialized = false
  }

  const observe = (id: SessionId | undefined): void => {
    if (id === undefined) {
      if (subscribedId !== undefined) stopWatching()
      return
    }
    const binding = sessions.binding(id)
    if (binding === undefined) {
      if (subscribedId !== undefined) stopWatching()
      return
    }
    if (binding.sessionId === subscribedId) return

    stopWatching()
    subscribedId = binding.sessionId
    const session = binding.session

    const update = (): void => {
      const next = session.getSnapshot().running
      if (!initialized) {
        running = next
        initialized = true
        return
      }
      if (next === running) return
      const wasRunning = running
      running = next
      if (next && !wasRunning) onStart()
      else if (!next && wasRunning) onEnd()
    }

    update()
    stopSession = session.subscribe(update)
  }

  const refresh = (): void => { observe(sessions.list.getSnapshot().current) }
  const stopList = sessions.list.subscribe(refresh)
  refresh()

  return () => {
    stopList()
    stopWatching()
  }
}
