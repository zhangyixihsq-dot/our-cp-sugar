const LIGHTNESS_STORAGE_KEY = 'dsh-custom-background.lightness'
const SATURATION_STORAGE_KEY = 'dsh-custom-background.saturation'

const SCRIM_LIGHT = 'linear-gradient(rgba(255, 255, 255, 0.04), rgba(248, 244, 252, 0.10))'
const SCRIM_DARK = 'linear-gradient(rgba(15, 11, 24, 0.48), rgba(11, 9, 20, 0.62))'
const USER_SCRIM = 'linear-gradient(rgba(20, 14, 28, var(--dsw-skin-scrim, 0)), rgba(20, 14, 28, var(--dsw-skin-scrim, 0)))'

const clampLightness = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)))

const clampSaturation = (value: number): number =>
  Math.max(100, Math.min(300, Math.round(value)))

function readLightness(): number {
  try {
    const stored = window.localStorage.getItem(LIGHTNESS_STORAGE_KEY)
    if (stored === null) return 0
    const value = Number(stored)
    return Number.isFinite(value) ? clampLightness(value) : 0
  } catch {
    return 0
  }
}

function readSaturation(): number {
  try {
    const stored = window.localStorage.getItem(SATURATION_STORAGE_KEY)
    if (stored === null) return 100
    const value = Number(stored)
    return Number.isFinite(value) ? clampSaturation(value) : 100
  } catch {
    return 100
  }
}

function styleLayer(element: HTMLDivElement, zIndex: number): void {
  element.style.position = 'fixed'
  element.style.inset = '0'
  element.style.zIndex = String(zIndex)
  element.style.pointerEvents = 'none'
  element.setAttribute('aria-hidden', 'true')
}

export interface BackgroundHandle {
  lightness(): number
  setLightness(value: number): void
  saturation(): number
  setSaturation(value: number): void
  subscribe(listener: () => void): () => void
}

/** Owns the wallpaper layers and the persisted lightening setting. */
export class BackgroundController implements BackgroundHandle {
  private readonly wallpaper = document.createElement('div')
  private readonly scrim = document.createElement('div')
  private readonly listeners = new Set<() => void>()
  private readonly themeObserver: MutationObserver
  private lightnessValue = readLightness()
  private saturationValue = readSaturation()

  constructor(art: string) {
    this.wallpaper.dataset.dshCustomBackgroundLayer = 'wallpaper'
    this.scrim.dataset.dshCustomBackgroundLayer = 'scrim'
    styleLayer(this.wallpaper, -3)
    styleLayer(this.scrim, -2)
    this.wallpaper.style.backgroundImage = `url(${art})`
    this.wallpaper.style.backgroundPosition = 'center center'
    this.wallpaper.style.backgroundSize = 'cover'
    this.wallpaper.style.backgroundRepeat = 'no-repeat'
    document.body.append(this.wallpaper, this.scrim)

    this.themeObserver = new MutationObserver(() => { this.renderScrim() })
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-ds-dark-theme'],
    })
    this.render()
  }

  lightness(): number {
    return this.lightnessValue
  }

  setLightness(value: number): void {
    const next = clampLightness(value)
    if (next === this.lightnessValue) return
    this.lightnessValue = next
    try {
      window.localStorage.setItem(LIGHTNESS_STORAGE_KEY, String(next))
    } catch {
      // Persistence is optional in restricted browser contexts.
    }
    this.renderScrim()
    this.notify()
  }

  saturation(): number {
    return this.saturationValue
  }

  setSaturation(value: number): void {
    const next = clampSaturation(value)
    if (next === this.saturationValue) return
    this.saturationValue = next
    try {
      window.localStorage.setItem(SATURATION_STORAGE_KEY, String(next))
    } catch {
      // Persistence is optional in restricted browser contexts.
    }
    this.renderWallpaper()
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  dispose(): void {
    this.themeObserver.disconnect()
    this.wallpaper.remove()
    this.scrim.remove()
    this.listeners.clear()
  }

  private render(): void {
    this.renderWallpaper()
    this.renderScrim()
  }

  private renderWallpaper(): void {
    this.wallpaper.style.filter = `saturate(${this.saturationValue}%)`
  }

  private renderScrim(): void {
    const themeScrim = document.body.hasAttribute('data-ds-dark-theme') ? SCRIM_DARK : SCRIM_LIGHT
    const opacity = Math.round(this.lightnessValue * 5.5) / 1000
    const adjustment = `linear-gradient(rgba(255, 255, 255, ${opacity}), rgba(255, 255, 255, ${opacity}))`
    this.scrim.style.backgroundImage = `${adjustment}, ${USER_SCRIM}, ${themeScrim}`
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
