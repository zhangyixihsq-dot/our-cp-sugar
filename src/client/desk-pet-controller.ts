import css from './custom-background.module.css'
import { isPetActivityState, PET_ACTIVITY_ENDPOINT, PET_END_PHRASE, PET_START_PHRASE } from '../pet-state.ts'

const DEFAULT_POLL_MS = 400
const BUBBLE_VISIBLE_MS = 4800
const RECENT_START_MS = 1600
const VISIBLE_STORAGE_KEY = 'dsh-custom-background.pet-visible'
const SIZE_STORAGE_PREFIX = 'dsh-custom-background.pet-size.'
const POSITION_STORAGE_PREFIX = 'dsh-custom-background.pet-position.'
const PERSONALITY_STORAGE_PREFIX = 'dsh-custom-background.pet-personality.'
const NAME_STORAGE_PREFIX = 'dsh-custom-background.pet-name.'
const IMAGE_DB_NAME = 'our-cp-sugar'
const IMAGE_DB_VERSION = 1
const IMAGE_STORE = 'pet-images'

export interface DesktopPetHandle {
  visible(): boolean
  setVisible(value: boolean): void
  size(): number
  setSize(value: number): void
  subscribe(listener: () => void): () => void
  onInteract(listener: () => void): () => void
  name(): string
  setName(value: string): void
  imageSource(): string
  isCustomImage(): boolean
  setImage(file: Blob): void
  resetImage(): void
  personality(): string
  setPersonality(value: string): void
  speak(text: string): void
}

export interface DesktopPetOptions {
  id?: string
  clickPhrase?: string
  activityKind?: 'start' | 'end'
  activityPhrase?: string
  defaultSize?: number
  defaultName?: string
  defaultPersonality?: string
  autoStart?: boolean
  fetcher?: typeof fetch
  pollMs?: number
}

/** Renders one animated pet, with independent visibility, size and position. */
export class DesktopPetController implements DesktopPetHandle {
  private readonly root = document.createElement('aside')
  private readonly bubble = document.createElement('div')
  private readonly image = document.createElement('img')
  private readonly interactButton = document.createElement('button')
  private readonly fetcher: typeof fetch
  private readonly pollMs: number
  private readonly id: string
  private readonly clickPhrase: string | undefined
  private readonly activityKind: 'start' | 'end'
  private readonly activityPhrase: string
  private readonly defaultArt: string
  private readonly listeners = new Set<() => void>()
  private readonly interactListeners = new Set<() => void>()
  private pollTimer: number | undefined
  private bubbleTimer: number | undefined
  private lastActivitySequence: number | undefined
  private visibleValue: boolean
  private sizeValue: number
  private nameValue: string
  private imageValue: string
  private imageCustom = false
  private imageObjectUrl: string | undefined
  private imageRevision = 0
  private personalityValue: string
  private drag: { startX: number; startY: number; right: number; bottom: number } | undefined
  private dragged = false
  private disposed = false

  constructor(art: string, options: DesktopPetOptions = {}) {
    this.defaultArt = art
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis)
    this.pollMs = options.pollMs ?? DEFAULT_POLL_MS
    this.id = options.id ?? 'primary'
    this.clickPhrase = options.clickPhrase
    this.activityKind = options.activityKind ?? 'start'
    this.activityPhrase = options.activityPhrase ?? (this.activityKind === 'end' ? PET_END_PHRASE : PET_START_PHRASE)
    this.visibleValue = readVisible(this.id)
    this.sizeValue = readSize(this.id, options.defaultSize ?? 220)
    this.nameValue = readName(this.id, options.defaultName ?? (this.id === 'secondary' ? '桑多涅' : '哥伦比娅'))
    this.imageValue = art
    this.personalityValue = readPersonality(this.id, options.defaultPersonality ?? '')

    this.root.className = css.petRoot
    this.root.dataset.dshCustomPet = ''
    this.root.dataset.petId = this.id
    this.root.setAttribute('aria-label', `${this.nameValue}桌宠`)
    this.root.hidden = !this.visibleValue
    this.root.style.width = `${this.sizeValue}px`
    this.restorePosition()

    this.bubble.className = css.petBubble
    this.bubble.setAttribute('aria-live', 'polite')
    this.image.className = css.petImage
    this.image.src = this.imageValue
    this.image.alt = ''
    this.image.draggable = false
    this.image.setAttribute('aria-hidden', 'true')
    this.interactButton.className = css.petInteractButton
    this.interactButton.type = 'button'
    this.interactButton.textContent = document.documentElement.lang.toLowerCase().startsWith('zh') ? '互动' : 'Chat'
    this.interactButton.hidden = true
    this.root.append(this.bubble, this.image, this.interactButton)
    document.body.appendChild(this.root)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.image.addEventListener('pointerdown', this.onPointerDown)
    this.image.addEventListener('pointermove', this.onPointerMove)
    this.image.addEventListener('pointerup', this.onPointerUp)
    this.image.addEventListener('pointercancel', this.onPointerUp)
    this.image.addEventListener('click', this.onClick)
    this.root.addEventListener('mouseenter', this.onMouseEnter)
    this.root.addEventListener('mouseleave', this.onMouseLeave)
    this.interactButton.addEventListener('click', this.onInteractClick)
    void this.loadCustomImage()
    if (options.autoStart !== false) this.start()
  }

  start(): void {
    if (this.disposed || this.pollTimer !== undefined) return
    void this.refresh()
    this.pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void this.refresh()
    }, this.pollMs)
  }

  async refresh(): Promise<void> {
    if (this.disposed) return
    try {
      const response = await this.fetcher(PET_ACTIVITY_ENDPOINT, { cache: 'no-store' })
      if (!response.ok) return
      const state: unknown = await response.json()
      if (!isPetActivityState(state)) return
      const activitySequence = this.activityKind === 'end' ? state.completedSequence : state.sequence
      const activityAt = this.activityKind === 'end' ? state.completedAt : state.startedAt
      if (this.lastActivitySequence === undefined) {
        this.lastActivitySequence = activitySequence
        if (activitySequence > 0 && Date.now() - activityAt <= RECENT_START_MS) this.showBubble(this.activityPhrase)
        return
      }
      if (activitySequence === this.lastActivitySequence) return
      const movedForward = activitySequence > this.lastActivitySequence
      this.lastActivitySequence = activitySequence
      if (movedForward) this.showBubble(this.activityPhrase)
    } catch {
      // The host route may be unavailable briefly while the profile reloads.
    }
  }

  visible(): boolean { return this.visibleValue }

  setVisible(value: boolean): void {
    if (value === this.visibleValue) return
    this.visibleValue = value
    this.root.hidden = !value
    if (!value) {
      this.root.removeAttribute('data-speaking')
      this.bubble.textContent = ''
      if (this.bubbleTimer !== undefined) window.clearTimeout(this.bubbleTimer)
      this.bubbleTimer = undefined
    }
    try { window.localStorage.setItem(VISIBLE_STORAGE_KEY + '.' + this.id, String(value)) } catch { /* optional */ }
    this.notify()
  }

  size(): number { return this.sizeValue }

  setSize(value: number): void {
    const next = Math.max(100, Math.min(360, Math.round(value)))
    if (next === this.sizeValue) return
    this.sizeValue = next
    this.root.style.width = `${next}px`
    try { window.localStorage.setItem(SIZE_STORAGE_PREFIX + this.id, String(next)) } catch { /* optional */ }
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  onInteract(listener: () => void): () => void {
    this.interactListeners.add(listener)
    return () => { this.interactListeners.delete(listener) }
  }

  name(): string { return this.nameValue }

  setName(value: string): void {
    const next = value.trim().slice(0, 40) || (this.id === 'secondary' ? '桑多涅' : '哥伦比娅')
    if (next === this.nameValue) return
    this.nameValue = next
    this.root.setAttribute('aria-label', `${next}桌宠`)
    try { window.localStorage.setItem(NAME_STORAGE_PREFIX + this.id, next) } catch { /* optional */ }
    this.notify()
  }

  imageSource(): string { return this.imageValue }

  isCustomImage(): boolean { return this.imageCustom }

  setImage(file: Blob): void {
    if (this.disposed) return
    const nextUrl = URL.createObjectURL(file)
    if (this.imageObjectUrl !== undefined) URL.revokeObjectURL(this.imageObjectUrl)
    this.imageObjectUrl = nextUrl
    this.imageValue = nextUrl
    this.imageCustom = true
    this.imageRevision += 1
    this.image.src = nextUrl
    void saveImageBlob(this.id, file)
    this.notify()
  }

  resetImage(): void {
    if (!this.imageCustom) return
    if (this.imageObjectUrl !== undefined) {
      URL.revokeObjectURL(this.imageObjectUrl)
      this.imageObjectUrl = undefined
    }
    this.imageCustom = false
    this.imageRevision += 1
    this.imageValue = this.defaultArt
    this.image.src = this.defaultArt
    void deleteImageBlob(this.id)
    this.notify()
  }

  private async loadCustomImage(): Promise<void> {
    const revision = this.imageRevision
    const blob = await loadImageBlob(this.id)
    if (this.disposed || blob === undefined || revision !== this.imageRevision) return
    const nextUrl = URL.createObjectURL(blob)
    this.imageObjectUrl = nextUrl
    this.imageValue = nextUrl
    this.imageCustom = true
    this.image.src = nextUrl
    this.notify()
  }

  personality(): string { return this.personalityValue }

  setPersonality(value: string): void {
    const next = value.trim().slice(0, 4000)
    if (next === this.personalityValue) return
    this.personalityValue = next
    try { window.localStorage.setItem(PERSONALITY_STORAGE_PREFIX + this.id, next) } catch { /* optional */ }
    this.notify()
  }

  speak(text: string): void { this.showBubble(text) }

  dispose(): void {
    this.disposed = true
    if (this.imageObjectUrl !== undefined) URL.revokeObjectURL(this.imageObjectUrl)
    this.imageObjectUrl = undefined
    if (this.pollTimer !== undefined) window.clearInterval(this.pollTimer)
    if (this.bubbleTimer !== undefined) window.clearTimeout(this.bubbleTimer)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.image.removeEventListener('pointerdown', this.onPointerDown)
    this.image.removeEventListener('pointermove', this.onPointerMove)
    this.image.removeEventListener('pointerup', this.onPointerUp)
    this.image.removeEventListener('pointercancel', this.onPointerUp)
    this.image.removeEventListener('click', this.onClick)
    this.root.removeEventListener('mouseenter', this.onMouseEnter)
    this.root.removeEventListener('mouseleave', this.onMouseLeave)
    this.interactButton.removeEventListener('click', this.onInteractClick)
    this.listeners.clear()
    this.interactListeners.clear()
    this.root.remove()
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') void this.refresh()
  }

  private readonly onMouseEnter = (): void => {
    if (this.disposed || !this.visibleValue || this.drag !== undefined) return
    this.interactButton.hidden = false
  }

  private readonly onMouseLeave = (): void => {
    this.interactButton.hidden = true
  }

  private readonly onInteractClick = (): void => {
    if (this.disposed) return
    if (this.interactListeners.size === 0) {
      console.warn('[our-cp-sugar] 桌宠互动服务尚未就绪')
      this.showBubble(document.documentElement.lang.toLowerCase().startsWith('zh') ? '互动服务尚未就绪' : 'Interaction is not ready')
      return
    }
    for (const listener of this.interactListeners) listener()
  }

  private showBubble(text: string): void {
    if (!this.visibleValue) return
    if (this.bubbleTimer !== undefined) window.clearTimeout(this.bubbleTimer)
    this.root.removeAttribute('data-speaking')
    this.bubble.textContent = text
    void this.bubble.offsetWidth
    this.root.dataset.speaking = ''
    this.bubbleTimer = window.setTimeout(() => {
      this.root.removeAttribute('data-speaking')
      this.bubble.textContent = ''
      this.bubbleTimer = undefined
    }, BUBBLE_VISIBLE_MS)
  }

  private restorePosition(): void {
    try {
      const stored = window.localStorage.getItem(POSITION_STORAGE_PREFIX + this.id)
      if (stored === null) return
      const value: unknown = JSON.parse(stored)
      if (typeof value !== 'object' || value === null) return
      const position = value as { right?: unknown; bottom?: unknown }
      if (typeof position.right === 'number' && typeof position.bottom === 'number') {
        this.root.style.right = `${Math.max(8, position.right)}px`
        this.root.style.bottom = `${Math.max(8, position.bottom)}px`
      }
    } catch { /* ignore malformed storage */ }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.disposed || !this.visibleValue) return
    this.interactButton.hidden = true
    event.preventDefault()
    this.image.setPointerCapture?.(event.pointerId)
    const rect = this.root.getBoundingClientRect()
    this.drag = { startX: event.clientX, startY: event.clientY, right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom }
    this.dragged = false
    this.root.dataset.dragging = ''
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (drag === undefined) return
    if (Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4) this.dragged = true
    const maxRight = Math.max(8, window.innerWidth - this.root.offsetWidth - 8)
    const maxBottom = Math.max(8, window.innerHeight - this.root.offsetHeight - 8)
    const right = Math.min(maxRight, Math.max(8, drag.right - (event.clientX - drag.startX)))
    const bottom = Math.min(maxBottom, Math.max(8, drag.bottom - (event.clientY - drag.startY)))
    this.root.style.right = `${Math.round(right)}px`
    this.root.style.bottom = `${Math.round(bottom)}px`
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag
    if (drag === undefined) return
    this.drag = undefined
    this.root.removeAttribute('data-dragging')
    this.image.releasePointerCapture?.(event.pointerId)
    const right = Number.parseFloat(this.root.style.right)
    const bottom = Number.parseFloat(this.root.style.bottom)
    if (Number.isFinite(right) && Number.isFinite(bottom)) {
      try { window.localStorage.setItem(POSITION_STORAGE_PREFIX + this.id, JSON.stringify({ right, bottom })) } catch { /* optional */ }
    }
  }

  private readonly onClick = (): void => {
    if (this.dragged) { this.dragged = false; return }
    if (this.clickPhrase !== undefined) this.showBubble(this.clickPhrase)
  }

  private notify(): void { for (const listener of this.listeners) listener() }
}

function readVisible(id: string): boolean {
  try {
    const value = window.localStorage.getItem(VISIBLE_STORAGE_KEY + '.' + id)
    return value === null ? true : value !== 'false'
  } catch { return true }
}

function readSize(id: string, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(SIZE_STORAGE_PREFIX + id)
    const value = stored === null ? fallback : Number(stored)
    return Number.isFinite(value) ? Math.max(100, Math.min(360, Math.round(value))) : fallback
  } catch { return fallback }
}

function readPersonality(id: string, fallback: string): string {
  try { return window.localStorage.getItem(PERSONALITY_STORAGE_PREFIX + id) ?? fallback } catch { return fallback }
}

function readName(id: string, fallback: string): string {
  try { return window.localStorage.getItem(NAME_STORAGE_PREFIX + id) ?? fallback } catch { return fallback }
}

function openImageDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

async function loadImageBlob(id: string): Promise<Blob | undefined> {
  const db = await openImageDatabase().catch(() => undefined)
  if (db === undefined) return undefined
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, 'readonly')
      const request = transaction.objectStore(IMAGE_STORE).get(id)
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB get failed'))
    })
  } catch {
    return undefined
  } finally {
    db.close()
  }
}

async function saveImageBlob(id: string, blob: Blob): Promise<void> {
  const db = await openImageDatabase().catch(() => undefined)
  if (db === undefined) return
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, 'readwrite')
      transaction.objectStore(IMAGE_STORE).put(blob, id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB put failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB put aborted'))
    })
  } catch {
    // Image persistence is optional and must not break the live preview.
  } finally {
    db.close()
  }
}

async function deleteImageBlob(id: string): Promise<void> {
  const db = await openImageDatabase().catch(() => undefined)
  if (db === undefined) return
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, 'readwrite')
      transaction.objectStore(IMAGE_STORE).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB delete aborted'))
    })
  } catch {
    // Image persistence is optional.
  } finally {
    db.close()
  }
}
