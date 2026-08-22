// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopPetController } from '../src/client/desk-pet-controller.ts'
import { PET_END_PHRASE, PET_START_PHRASE, recordPetActivity, type PetActivityState } from '../src/pet-state.ts'

let controller: DesktopPetController | undefined

afterEach(() => {
  controller?.dispose()
  controller = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('desktop pet activity', () => {
  it('records model turn start and end boundaries', () => {
    const state: PetActivityState = { sequence: 0, startedAt: 0, completedSequence: 0, completedAt: 0 }

    expect(recordPetActivity(state, 'step/start', 10)).toBe(false)
    expect(state).toEqual({ sequence: 0, startedAt: 0, completedSequence: 0, completedAt: 0 })
    expect(recordPetActivity(state, 'turn/start', 20)).toBe(true)
    expect(state).toEqual({ sequence: 1, startedAt: 20, completedSequence: 0, completedAt: 0 })
    expect(recordPetActivity(state, 'turn/end', 30)).toBe(true)
    expect(state).toEqual({ sequence: 1, startedAt: 20, completedSequence: 1, completedAt: 30 })
    expect(recordPetActivity(state, 'turn/end', 40)).toBe(false)
  })

  it('shows the requested phrase once a new turn is observed', async () => {
    const state: PetActivityState = { sequence: 0, startedAt: 0, completedSequence: 0, completedAt: 0 }
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ...state }),
    }) as Response)

    controller = new DesktopPetController('data:image/gif;base64,dGVzdA==', {
      autoStart: false,
      fetcher,
      clickPhrase: '早上好，桑多涅～',
    })

    await controller.refresh()
    state.sequence = 1
    state.startedAt = Date.now()
    await controller.refresh()

    const root = document.querySelector<HTMLElement>('[data-dsh-custom-pet]')
    expect(root).not.toBeNull()
    expect(root?.hasAttribute('data-speaking')).toBe(true)
    expect(root?.textContent).toContain(PET_START_PHRASE)
    expect(root?.querySelector('img')?.src).toContain('data:image/gif;base64')

    root?.querySelector('img')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(root?.textContent).toContain('早上好，桑多涅～')
    expect(root?.getAttribute('aria-label')).toBe('哥伦比娅桌宠')

    controller.dispose()
    controller = undefined
    document.body.replaceChildren()
    state.completedSequence = 1
    state.completedAt = Date.now()
    controller = new DesktopPetController('data:image/gif;base64,dGVzdA==', {
      autoStart: false,
      fetcher,
      id: 'secondary',
      activityKind: 'end',
    })
    await controller.refresh()
    const secondaryRoot = document.querySelector<HTMLElement>('[data-pet-id="secondary"]')
    expect(secondaryRoot?.textContent).toContain(PET_END_PHRASE)

    controller.setSize(300)
    expect(controller.size()).toBe(300)
    expect(secondaryRoot?.style.width).toBe('300px')

    controller.dispose()
    controller = undefined
    expect(document.querySelector('[data-dsh-custom-pet]')).toBeNull()
  })

  it('replaces the pet image from a Blob and restores the default', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-pet')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true })

    controller = new DesktopPetController('data:image/gif;base64,dGVzdA==', { autoStart: false })
    const img = document.querySelector<HTMLImageElement>('[data-dsh-custom-pet] img')

    controller.setImage(new Blob(['gif'], { type: 'image/gif' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(img?.src).toBe('blob:mock-pet')
    expect(controller.isCustomImage()).toBe(true)
    expect(controller.imageSource()).toBe('blob:mock-pet')

    controller.resetImage()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-pet')
    expect(img?.src).toBe('data:image/gif;base64,dGVzdA==')
    expect(controller.isCustomImage()).toBe(false)
    expect(controller.imageSource()).toBe('data:image/gif;base64,dGVzdA==')
  })
})
