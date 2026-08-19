// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { BackgroundController } from '../src/client/background-controller.ts'
import { apply } from '../src/client/index.ts'

let fiber: Fiber | undefined

async function mount(): Promise<Fiber> {
  const next = new Context().plugin({ apply })
  await next.await()
  return next
}

async function tick(): Promise<void> {
  await new Promise((resolve) => { setTimeout(resolve, 0) })
}

afterEach(async () => {
  await fiber?.dispose()
  fiber = undefined
  document.body.removeAttribute('data-dsh-custom-background')
  document.body.removeAttribute('data-ds-dark-theme')
  document.body.style.cssText = ''
  window.localStorage.clear()
  document.querySelectorAll('[data-dsh-custom-background-layer]').forEach(element => { element.remove() })
  document.querySelectorAll('[data-dsh-custom-pet]').forEach(element => { element.remove() })
})

describe('custom-background browser plugin', () => {
  it('applies the bundled full-viewport wallpaper', async () => {
    fiber = await mount()

    expect(document.body.hasAttribute('data-dsh-custom-background')).toBe(true)
    const wallpaper = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="wallpaper"]')
    const scrim = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="scrim"]')

    expect(wallpaper?.style.backgroundImage).not.toBe('')
    expect(wallpaper?.style.backgroundSize).toBe('cover')
    expect(wallpaper?.style.position).toBe('fixed')
    expect(wallpaper?.style.filter).toBe('saturate(100%)')
    expect(scrim?.style.backgroundImage).toContain('var(--dsw-skin-scrim, 0)')
    expect(document.querySelector('[data-dsh-custom-pet] img')).not.toBeNull()
  })

  it('updates the readability scrim when the base theme changes', async () => {
    fiber = await mount()
    const scrim = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="scrim"]')
    const light = scrim?.style.backgroundImage

    document.body.setAttribute('data-ds-dark-theme', '')
    await tick()
    const dark = scrim?.style.backgroundImage

    expect(light).toContain('rgba(255, 255, 255, 0.04)')
    expect(dark).toContain('rgba(15, 11, 24, 0.48)')
  })

  it('restores the prior backdrop on dispose', async () => {
    document.body.style.setProperty('background-image', 'url("https://example.test/prior.png")')
    fiber = await mount()

    await fiber.dispose()
    fiber = undefined

    expect(document.body.hasAttribute('data-dsh-custom-background')).toBe(false)
    expect(document.body.style.getPropertyValue('background-image')).toContain('prior.png')
    expect(document.querySelector('[data-dsh-custom-background-layer]')).toBeNull()
    expect(document.querySelector('[data-dsh-custom-pet]')).toBeNull()
  })

  it('defaults to 0% and persists lighter background shading', () => {
    const controller = new BackgroundController('data:image/png;base64,dGVzdA==')
    const wallpaper = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="wallpaper"]')
    const scrim = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="scrim"]')

    expect(controller.lightness()).toBe(0)
    expect(wallpaper?.style.filter).toBe('saturate(100%)')

    controller.setLightness(100)

    expect(controller.lightness()).toBe(100)
    expect(wallpaper?.style.filter).toBe('saturate(100%)')
    expect(scrim?.style.backgroundImage).toContain('rgba(255, 255, 255, 0.55)')
    expect(window.localStorage.getItem('dsh-custom-background.lightness')).toBe('100')
    controller.dispose()

    const restored = new BackgroundController('data:image/png;base64,dGVzdA==')
    expect(restored.lightness()).toBe(100)
    restored.dispose()
  })

  it('adjusts and persists wallpaper saturation', () => {
    const controller = new BackgroundController('data:image/png;base64,dGVzdA==')
    const wallpaper = document.querySelector<HTMLElement>('[data-dsh-custom-background-layer="wallpaper"]')

    expect(controller.saturation()).toBe(100)
    controller.setSaturation(300)

    expect(controller.saturation()).toBe(300)
    expect(wallpaper?.style.filter).toBe('saturate(300%)')
    expect(window.localStorage.getItem('dsh-custom-background.saturation')).toBe('300')
    controller.dispose()

    const restored = new BackgroundController('data:image/png;base64,dGVzdA==')
    expect(restored.saturation()).toBe(300)
    restored.dispose()
  })
})
