import { describe, expect, it, vi } from 'vitest'
import { watchModelActivity } from '../src/client/model-activity.ts'
import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'

const sid = (value: string): SessionId => value as unknown as SessionId

class FakeConversation {
  private listeners = new Set<() => void>()
  running = false

  setRunning(value: boolean): void {
    if (value === this.running) return
    this.running = value
    for (const listener of this.listeners) listener()
  }

  getSnapshot(): { running: boolean } {
    return { running: this.running }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}

class FakeList {
  private listeners = new Set<() => void>()
  current: SessionId | undefined = undefined

  setCurrent(value: SessionId | undefined): void {
    if (value === this.current) return
    this.current = value
    for (const listener of this.listeners) listener()
  }

  getSnapshot(): { current: SessionId | undefined } {
    return { current: this.current }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}

interface Harness {
  list: FakeList
  sessions: ISessions
  add: (id: SessionId, conversation: FakeConversation) => void
}

function makeHarness(): Harness {
  const list = new FakeList()
  const conversations = new Map<SessionId, FakeConversation>()
  const sessions = {
    list,
    binding(id: SessionId) {
      const conversation = conversations.get(id)
      return conversation === undefined ? undefined : { sessionId: id, session: conversation }
    },
  } as unknown as ISessions
  return {
    list,
    sessions,
    add: (id, conversation) => { conversations.set(id, conversation) },
  }
}

describe('watchModelActivity', () => {
  it('fires start and end only for observed running transitions', () => {
    const harness = makeHarness()
    const conversation = new FakeConversation()
    harness.add(sid('session-a'), conversation)
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const stop = watchModelActivity(harness.sessions, onStart, onEnd)

    harness.list.setCurrent(sid('session-a'))
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()

    conversation.setRunning(true)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onEnd).not.toHaveBeenCalled()

    conversation.setRunning(false)
    expect(onEnd).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not fire for the initial running state', () => {
    const harness = makeHarness()
    const conversation = new FakeConversation()
    conversation.setRunning(true)
    harness.add(sid('session-a'), conversation)
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const stop = watchModelActivity(harness.sessions, onStart, onEnd)

    harness.list.setCurrent(sid('session-a'))
    expect(onStart).not.toHaveBeenCalled()

    conversation.setRunning(false)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalledTimes(1)
    stop()
  })

  it('follows the current session and ignores the previous one', () => {
    const harness = makeHarness()
    const first = new FakeConversation()
    const second = new FakeConversation()
    harness.add(sid('session-a'), first)
    harness.add(sid('session-b'), second)
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const stop = watchModelActivity(harness.sessions, onStart, onEnd)

    harness.list.setCurrent(sid('session-a'))
    first.setRunning(true)
    expect(onStart).toHaveBeenCalledTimes(1)

    harness.list.setCurrent(sid('session-b'))
    first.setRunning(false)
    expect(onEnd).not.toHaveBeenCalled()

    second.setRunning(true)
    expect(onStart).toHaveBeenCalledTimes(2)
    stop()
  })
})
