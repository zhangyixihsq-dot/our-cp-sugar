import { useSyncExternalStore } from 'react'
import type { BackgroundHandle } from './background-controller.ts'
import css from './custom-background.module.css'

export interface BackgroundSettingsInjected {
  background: BackgroundHandle
}

/** First-level DSH settings page for wallpaper lightening. */
export function BackgroundSettingsSection({ background }: BackgroundSettingsInjected) {
  const lightness = useSyncExternalStore(background.subscribe.bind(background), background.lightness.bind(background))
  const saturation = useSyncExternalStore(background.subscribe.bind(background), background.saturation.bind(background))
  const chinese = document.documentElement.lang.toLowerCase().startsWith('zh')
  const title = chinese ? '背景图' : 'Wallpaper'
  const lightnessLabel = chinese ? '背景变浅' : 'Lighten'
  const saturationLabel = chinese ? '图片饱和度' : 'Saturation'

  return (
    <section className={css.settingsSection} aria-labelledby="custom-background-settings-title">
      <header className={css.settingsHeader}>
        <h2 id="custom-background-settings-title" className={css.settingsTitle}>{title}</h2>
      </header>
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
    </section>
  )
}
