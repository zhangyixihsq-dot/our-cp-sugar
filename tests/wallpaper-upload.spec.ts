import { describe, expect, it } from 'vitest'
import {
  clampCropState,
  coverCropState,
  cropRectFromState,
  zoomCropState,
} from '../src/client/wallpaper-upload.ts'

const viewport = { width: 560, height: 315 }

describe('wallpaper crop math', () => {
  it('creates a centered cover fit', () => {
    const image = { width: 1000, height: 500 }
    const state = coverCropState(image, viewport)

    expect(state.scale).toBeCloseTo(0.63)
    expect(state.offsetX).toBeCloseTo((viewport.width - image.width * 0.63) / 2)
    expect(state.offsetY).toBeCloseTo((viewport.height - image.height * 0.63) / 2)

    const rect = cropRectFromState(image, viewport, state)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
  })

  it('keeps the source rectangle inside image bounds', () => {
    const image = { width: 2000, height: 1000 }
    const state = coverCropState(image, viewport)
    const rect = cropRectFromState(image, viewport, state)

    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(image.width + 0.001)
    expect(rect.y + rect.height).toBeLessThanOrEqual(image.height + 0.001)
  })

  it('zooms around the viewport center', () => {
    const image = { width: 2000, height: 1000 }
    const state = coverCropState(image, viewport)
    const zoomed = zoomCropState(image, viewport, state, state.scale * 2)

    expect(zoomed.scale).toBeCloseTo(state.scale * 2)
    const rect = cropRectFromState(image, viewport, zoomed)
    expect(rect.width).toBeCloseTo(viewport.width / zoomed.scale)
    expect(rect.height).toBeCloseTo(viewport.height / zoomed.scale)
  })

  it('never allows a scale below the cover minimum', () => {
    const image = { width: 2000, height: 1000 }
    const minimum = Math.max(viewport.width / image.width, viewport.height / image.height)
    const clamped = clampCropState(image, viewport, { scale: minimum / 2, offsetX: 100, offsetY: 100 })

    expect(clamped.scale).toBeCloseTo(minimum)
    expect(clamped.offsetX).toBeLessThanOrEqual(0)
    expect(clamped.offsetY).toBeLessThanOrEqual(0)
  })
})
