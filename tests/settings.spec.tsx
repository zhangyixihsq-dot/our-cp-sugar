// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { BackgroundSettingsSection } from '../src/client/BackgroundSettingsSection.tsx'
import { BackgroundController } from '../src/client/background-controller.ts'
import { DesktopPetController } from '../src/client/desk-pet-controller.ts'
import { PetSettingsSection } from '../src/client/PetSettingsSection.tsx'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let controller: BackgroundController | undefined
let pet: DesktopPetController | undefined

afterEach(() => {
  act(() => { root?.unmount() })
  controller?.dispose()
  pet?.dispose()
  root = undefined
  controller = undefined
  pet = undefined
  document.body.replaceChildren()
  window.localStorage.clear()
})

describe('background settings section', () => {
  it('updates lightness through the range input', () => {
    document.documentElement.lang = 'zh-CN'
    controller = new BackgroundController('data:image/png;base64,dGVzdA==')
    pet = new DesktopPetController('data:image/gif;base64,dGVzdA==', { autoStart: false })
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<BackgroundSettingsSection background={controller!} />)
    })

    const input = document.querySelector<HTMLInputElement>('#custom-background-lightness')
    expect(input).not.toBeNull()

    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(input, '25')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(controller.lightness()).toBe(25)
    expect(document.querySelector('output')?.textContent).toBe('25%')
    expect(window.localStorage.getItem('dsh-custom-background.lightness')).toBe('25')
    expect(document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="scrim"]')?.style.backgroundImage)
      .toContain('rgba(255, 255, 255')

    const saturationInput = document.querySelector<HTMLInputElement>('#custom-background-saturation')
    expect(saturationInput).not.toBeNull()

    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(saturationInput, '200')
      saturationInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(controller.saturation()).toBe(200)
    expect(document.querySelectorAll('output')[1]?.textContent).toBe('200%')
    expect(window.localStorage.getItem('dsh-custom-background.saturation')).toBe('200')
    expect(document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="wallpaper"]')?.style.filter)
      .toBe('saturate(200%)')

    act(() => {
      root?.render(<PetSettingsSection pets={[{ id: 'primary', pet: pet! }]} />)
    })
    const petToggle = document.querySelector<HTMLInputElement>('#custom-pet-visible-primary')
    expect(petToggle?.checked).toBe(true)
    act(() => {
      petToggle?.click()
    })
    expect(pet?.visible()).toBe(false)
    expect(pet?.subscribe).toBeTypeOf('function')
  })
})
