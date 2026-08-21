import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { BackgroundHandle } from './background-controller.ts'
import css from './custom-background.module.css'
import {
  clampCropState,
  coverCropState,
  cropRectFromState,
  cropWallpaper,
  wallpaperOutputSize,
  zoomCropState,
  type WallpaperCropState,
  type WallpaperImageSize,
} from './wallpaper-upload.ts'

export interface BackgroundSettingsInjected {
  background: BackgroundHandle
}

const CROP_PREVIEW_WIDTH = 560
const CROP_PREVIEW_HEIGHT = 315
const CROP_MAX_ZOOM = 6

interface DragState {
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

/** First-level DSH settings page for the custom wallpaper and its crop/color controls. */
export function BackgroundSettingsSection({ background }: BackgroundSettingsInjected) {
  const lightness = useSyncExternalStore(background.subscribe.bind(background), background.lightness.bind(background))
  const saturation = useSyncExternalStore(background.subscribe.bind(background), background.saturation.bind(background))
  const isCustom = useSyncExternalStore(background.subscribe.bind(background), background.isCustom.bind(background))
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<WallpaperImageSize | null>(null)
  const [crop, setCrop] = useState<WallpaperCropState | null>(null)

  const chinese = document.documentElement.lang.toLowerCase().startsWith('zh')
  const title = chinese ? '背景图' : 'Wallpaper'
  const uploadLabel = chinese ? '自定义背景图' : 'Custom wallpaper'
  const chooseLabel = busy ? (chinese ? '处理中…' : 'Processing…') : (chinese ? '选择图片' : 'Choose image')
  const resetLabel = chinese ? '恢复默认' : 'Reset'
  const lightnessLabel = chinese ? '背景变浅' : 'Lighten'
  const saturationLabel = chinese ? '图片饱和度' : 'Saturation'
  const coverScale = imageSize === null
    ? 1
    : Math.max(CROP_PREVIEW_WIDTH / imageSize.width, CROP_PREVIEW_HEIGHT / imageSize.height)
  const zoomValue = crop === null || imageSize === null ? 1 : crop.scale / coverScale

  useEffect(() => {
    if (pendingUrl === null) {
      setImageSize(null)
      setCrop(null)
      return
    }

    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const size = { width: image.naturalWidth, height: image.naturalHeight }
      setImageSize(size)
      setCrop(coverCropState(size, { width: CROP_PREVIEW_WIDTH, height: CROP_PREVIEW_HEIGHT }))
    }
    image.onerror = () => {
      if (cancelled) return
      setStatus(chinese ? '图片加载失败' : 'Failed to load image')
    }
    image.src = pendingUrl
    return () => { cancelled = true }
  }, [pendingUrl])

  const openModal = (file: File): void => {
    setPendingFile(file)
    setPendingUrl(URL.createObjectURL(file))
    setImageSize(null)
    setCrop(null)
  }

  const closeModal = (): void => {
    if (pendingUrl !== null) URL.revokeObjectURL(pendingUrl)
    setPendingFile(null)
    setPendingUrl(null)
    setImageSize(null)
    setCrop(null)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    setStatus('')
    openModal(file)
  }

  const handleConfirm = async (): Promise<void> => {
    if (pendingFile === null || crop === null || imageSize === null) return
    setBusy(true)
    try {
      const rect = cropRectFromState(imageSize, { width: CROP_PREVIEW_WIDTH, height: CROP_PREVIEW_HEIGHT }, crop)
      const outputSize = wallpaperOutputSize()
      const result = await cropWallpaper(pendingFile, rect, outputSize.width, outputSize.height)
      background.setImage(result.dataUrl)
      setStatus(chinese
        ? `已裁剪并调整为 ${result.width}×${result.height}`
        : `Cropped and resized to ${result.width}×${result.height}`)
      closeModal()
    } catch {
      setStatus(chinese ? '图片处理失败，请重试' : 'Image processing failed, please try again')
    } finally {
      setBusy(false)
    }
  }

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (crop === null) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: crop.offsetX,
      offsetY: crop.offsetY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current
    if (drag === null || crop === null || imageSize === null || drag.pointerId !== event.pointerId) return
    setCrop(clampCropState(imageSize, { width: CROP_PREVIEW_WIDTH, height: CROP_PREVIEW_HEIGHT }, {
      scale: crop.scale,
      offsetX: drag.offsetX + event.clientX - drag.startX,
      offsetY: drag.offsetY + event.clientY - drag.startY,
    }))
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const handleZoom = (value: number): void => {
    if (crop === null || imageSize === null) return
    setCrop(zoomCropState(imageSize, { width: CROP_PREVIEW_WIDTH, height: CROP_PREVIEW_HEIGHT }, crop, coverScale * value))
  }

  return (
    <section className={css.settingsSection} aria-labelledby="custom-background-settings-title">
      <header className={css.settingsHeader}>
        <h2 id="custom-background-settings-title" className={css.settingsTitle}>{title}</h2>
      </header>
      <div className={css.settingsControl}>
        <div className={css.uploadActions}>
          <span className={css.settingsLabel}>{uploadLabel}</span>
          <button type="button" className={css.uploadButton} disabled={busy} onClick={() => { fileRef.current?.click() }}>{chooseLabel}</button>
          {isCustom && <button type="button" className={css.uploadButton} disabled={busy} onClick={() => { background.resetImage(); setStatus('') }}>{resetLabel}</button>}
        </div>
        <input
          ref={fileRef}
          className={css.fileInput}
          type="file"
          accept="image/*"
          onChange={handleChange}
        />
        {status !== '' && <p className={css.uploadStatus} role="status">{status}</p>}
      </div>
      <div className={css.settingsControl}>
        <div className={css.settingsControlHead}>
          <label className={css.settingsLabel} htmlFor="custom-background-lightness">{lightnessLabel}</label>
          <output className={css.settingsValue} htmlFor="custom-background-lightness">{lightness}%</output>
        </div>
        <input
          id="custom-background-lightness"
          className={css.settingsRange}
          type="range"
          min="0"
          max="100"
          step="1"
          value={lightness}
          aria-valuetext={`${lightness}%`}
          onChange={(event) => { background.setLightness(Number(event.target.value)) }}
        />
        <div className={css.settingsRangeEnds} aria-hidden="true">
          <span>{chinese ? '原图' : 'Original'}</span>
          <span>{chinese ? '更浅' : 'Lighter'}</span>
        </div>
      </div>
      <div className={css.settingsControl}>
        <div className={css.settingsControlHead}>
          <label className={css.settingsLabel} htmlFor="custom-background-saturation">{saturationLabel}</label>
          <output className={css.settingsValue} htmlFor="custom-background-saturation">{saturation}%</output>
        </div>
        <input
          id="custom-background-saturation"
          className={css.settingsRange}
          type="range"
          min="100"
          max="300"
          step="5"
          value={saturation}
          aria-valuetext={`${saturation}%`}
          onChange={(event) => { background.setSaturation(Number(event.target.value)) }}
        />
        <div className={css.settingsRangeEnds} aria-hidden="true">
          <span>{chinese ? '当前效果' : 'Current'}</span>
          <span>{chinese ? '更鲜艳' : 'More vivid'}</span>
        </div>
      </div>

      {pendingUrl !== null && (
        <div className={css.cropOverlay} role="dialog" aria-modal="true" aria-label={chinese ? '裁剪背景图' : 'Crop wallpaper'}>
          <div className={css.cropDialog}>
            <div className={css.cropHeader}>
              <h3 className={css.cropTitle}>{chinese ? '调整裁剪范围' : 'Adjust crop'}</h3>
              <button type="button" className={css.uploadButton} disabled={busy} onClick={closeModal}>{chinese ? '取消' : 'Cancel'}</button>
            </div>
            {crop !== null && imageSize !== null
              ? (
                <div className={css.cropBody}>
                  <div
                    className={css.cropViewport}
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <img
                      className={css.cropImage}
                      src={pendingUrl}
                      alt=""
                      draggable={false}
                      style={{
                        width: `${imageSize.width * crop.scale}px`,
                        height: `${imageSize.height * crop.scale}px`,
                        left: `${crop.offsetX}px`,
                        top: `${crop.offsetY}px`,
                      }}
                    />
                    <div className={css.cropGrid} aria-hidden="true" />
                  </div>
                  <label className={css.cropZoom}>
                    <span className={css.settingsLabel}>{chinese ? '缩放' : 'Zoom'}</span>
                    <input
                      className={css.settingsRange}
                      type="range"
                      min="1"
                      max={CROP_MAX_ZOOM}
                      step="0.01"
                      value={zoomValue}
                      onChange={(event) => { handleZoom(Number(event.target.value)) }}
                    />
                  </label>
                  <p className={css.uploadStatus}>{chinese ? '拖动画面调整位置，缩放滑杆调整构图' : 'Drag to pan and use the slider to zoom'}</p>
                </div>
              )
              : <p className={css.uploadStatus}>{chinese ? '正在载入图片…' : 'Loading image…'}</p>}
            <div className={css.cropActions}>
              <button type="button" className={css.uploadButton} disabled={busy || crop === null} onClick={() => { void handleConfirm() }}>{chinese ? '确认裁剪' : 'Apply crop'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
