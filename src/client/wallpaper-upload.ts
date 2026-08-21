export const WALLPAPER_TARGET_WIDTH = 1920
export const WALLPAPER_TARGET_HEIGHT = 1080
export const WALLPAPER_MIME = 'image/jpeg'
export const WALLPAPER_QUALITY = 0.92

export interface WallpaperUploadResult {
  dataUrl: string
  width: number
  height: number
}

export interface WallpaperImageSize {
  width: number
  height: number
}

export interface WallpaperViewport extends WallpaperImageSize {}

export interface WallpaperCropState {
  scale: number
  offsetX: number
  offsetY: number
}

export interface WallpaperCropRect {
  x: number
  y: number
  width: number
  height: number
}

/** Output resolution scales with the display so Retina screens keep the wallpaper sharp. */
export function wallpaperOutputSize(): WallpaperImageSize {
  const pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const scale = Math.max(1, Math.min(2, pixelRatio))
  return {
    width: Math.round(WALLPAPER_TARGET_WIDTH * scale),
    height: Math.round(WALLPAPER_TARGET_HEIGHT * scale),
  }
}

/** Initial cover fit: the image fills the viewport and stays centered. */
export function coverCropState(image: WallpaperImageSize, viewport: WallpaperViewport): WallpaperCropState {
  const scale = Math.max(viewport.width / image.width, viewport.height / image.height)
  return {
    scale,
    offsetX: (viewport.width - image.width * scale) / 2,
    offsetY: (viewport.height - image.height * scale) / 2,
  }
}

/** Keeps the image covering the viewport and never leaves blank edges. */
export function clampCropState(image: WallpaperImageSize, viewport: WallpaperViewport, state: WallpaperCropState): WallpaperCropState {
  const scale = Math.max(viewport.width / image.width, viewport.height / image.height, state.scale)
  const imageWidth = image.width * scale
  const imageHeight = image.height * scale
  const minX = viewport.width - imageWidth
  const minY = viewport.height - imageHeight
  return {
    scale,
    offsetX: Math.min(0, Math.max(minX, state.offsetX)),
    offsetY: Math.min(0, Math.max(minY, state.offsetY)),
  }
}

/** Changes zoom while keeping the image point under the viewport center fixed. */
export function zoomCropState(image: WallpaperImageSize, viewport: WallpaperViewport, state: WallpaperCropState, nextScale: number): WallpaperCropState {
  const sourceCenterX = (viewport.width / 2 - state.offsetX) / state.scale
  const sourceCenterY = (viewport.height / 2 - state.offsetY) / state.scale
  return clampCropState(image, viewport, {
    scale: nextScale,
    offsetX: viewport.width / 2 - sourceCenterX * nextScale,
    offsetY: viewport.height / 2 - sourceCenterY * nextScale,
  })
}

/** Converts the visible viewport into source-image coordinates. */
export function cropRectFromState(image: WallpaperImageSize, viewport: WallpaperViewport, state: WallpaperCropState): WallpaperCropRect {
  const clamped = clampCropState(image, viewport, state)
  const x = (0 - clamped.offsetX) / clamped.scale
  const y = (0 - clamped.offsetY) / clamped.scale
  const width = viewport.width / clamped.scale
  const height = viewport.height / clamped.scale
  const safeX = Math.min(image.width, Math.max(0, x))
  const safeY = Math.min(image.height, Math.max(0, y))
  const safeWidth = Math.min(image.width - safeX, width)
  const safeHeight = Math.min(image.height - safeY, height)
  return { x: safeX, y: safeY, width: safeWidth, height: safeHeight }
}

/** Renders the selected source rectangle to the standard wallpaper dimensions. */
export async function cropWallpaper(
  file: File,
  rect: WallpaperCropRect,
  width: number = WALLPAPER_TARGET_WIDTH,
  height: number = WALLPAPER_TARGET_HEIGHT,
): Promise<WallpaperUploadResult> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('unable to read image dimensions')
    }

    const sourceX = Math.max(0, Math.min(image.naturalWidth, rect.x))
    const sourceY = Math.max(0, Math.min(image.naturalHeight, rect.y))
    const sourceWidth = Math.max(0, Math.min(image.naturalWidth - sourceX, rect.width))
    const sourceHeight = Math.max(0, Math.min(image.naturalHeight - sourceY, rect.height))
    if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error('invalid crop rectangle')

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas is unavailable')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)

    return {
      dataUrl: canvas.toDataURL(WALLPAPER_MIME, WALLPAPER_QUALITY),
      width,
      height,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { resolve(image) }
    image.onerror = () => { reject(new Error('image failed to load')) }
    image.src = src
  })
}
