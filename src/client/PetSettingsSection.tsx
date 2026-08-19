import { useSyncExternalStore } from 'react'
import type { DesktopPetHandle } from './desk-pet-controller.ts'
import css from './custom-background.module.css'

export interface PetSettingsItem {
  id: string
  label: string
  pet: DesktopPetHandle
}

export interface PetSettingsInjected {
  pets: PetSettingsItem[]
}

function PetControl({ item, chinese }: { item: PetSettingsItem; chinese: boolean }) {
  const visible = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.visible.bind(item.pet))
  const size = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.size.bind(item.pet))
  return (
    <div className={css.petSettingsItem}>
      <h3 className={css.petSettingsName}>{item.label}</h3>
      <label className={css.settingsToggle} htmlFor={`custom-pet-visible-${item.id}`}>
        <input
          id={`custom-pet-visible-${item.id}`}
          type="checkbox"
          checked={visible}
          onChange={(event) => { item.pet.setVisible(event.target.checked) }}
        />
        <span>{chinese ? '显示桌宠' : 'Show desktop pet'}</span>
      </label>
      <div className={css.settingsControl}>
        <div className={css.settingsControlHead}>
          <label className={css.settingsLabel} htmlFor={`custom-pet-size-${item.id}`}>{chinese ? '桌宠大小' : 'Pet size'}</label>
          <output className={css.settingsValue} htmlFor={`custom-pet-size-${item.id}`}>{size}px</output>
        </div>
        <input
          id={`custom-pet-size-${item.id}`}
          className={css.settingsRange}
          type="range"
          min="100"
          max="360"
          step="10"
          value={size}
          aria-valuetext={`${size}px`}
          onChange={(event) => { item.pet.setSize(Number(event.target.value)) }}
        />
        <div className={css.settingsRangeEnds} aria-hidden="true">
          <span>100px</span>
          <span>360px</span>
        </div>
      </div>
    </div>
  )
}

/** First-level DSH settings page for both desktop pets. */
export function PetSettingsSection({ pets }: PetSettingsInjected) {
  const chinese = document.documentElement.lang.toLowerCase().startsWith('zh')
  return (
    <section className={css.settingsSection} aria-labelledby="custom-pet-settings-title">
      <header className={css.settingsHeader}>
        <h2 id="custom-pet-settings-title" className={css.settingsTitle}>{chinese ? '桌宠' : 'Desktop pet'}</h2>
      </header>
      <div className={css.petSettingsList}>
        {pets.map(item => <PetControl key={item.id} item={item} chinese={chinese} />)}
      </div>
    </section>
  )
}
