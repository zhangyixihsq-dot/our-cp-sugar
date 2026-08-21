import { useSyncExternalStore } from 'react'
import type { DesktopPetHandle } from './desk-pet-controller.ts'
import css from './custom-background.module.css'
import type { PetInteractionManager } from './pet-interaction.ts'

export interface PetSettingsItem {
  id: string
  label: string
  pet: DesktopPetHandle
}

export interface PetSettingsInjected {
  pets: PetSettingsItem[]
  interactions?: PetInteractionManager
}

const EMPTY_RECORDS: readonly never[] = []
const NOOP_SUBSCRIBE = (_listener: () => void): (() => void) => () => {}

function PetControl({ item, chinese }: { item: PetSettingsItem; chinese: boolean }) {
  const visible = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.visible.bind(item.pet))
  const size = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.size.bind(item.pet))
  const personality = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.personality.bind(item.pet))
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
      <label className={css.settingsControl} htmlFor={`custom-pet-personality-${item.id}`}>
        <span className={css.settingsLabel}>{chinese ? '性格 Prompt' : 'Personality prompt'}</span>
        <textarea
          id={`custom-pet-personality-${item.id}`}
          className={css.personalityInput}
          value={personality}
          placeholder={chinese ? '描述桌宠的性格与说话方式' : 'Describe the pet personality and voice'}
          rows={4}
          onChange={(event) => { item.pet.setPersonality(event.target.value) }}
        />
      </label>
    </div>
  )
}

/** First-level DSH settings page for both desktop pets. */
export function PetSettingsSection({ pets, interactions }: PetSettingsInjected) {
  const chinese = document.documentElement.lang.toLowerCase().startsWith('zh')
  const records = useSyncExternalStore(interactions?.subscribe.bind(interactions) ?? NOOP_SUBSCRIBE, interactions?.records.bind(interactions) ?? (() => EMPTY_RECORDS))
  return (
    <section className={css.settingsSection} aria-labelledby="custom-pet-settings-title">
      <header className={css.settingsHeader}>
        <h2 id="custom-pet-settings-title" className={css.settingsTitle}>{chinese ? '桌宠' : 'Desktop pet'}</h2>
      </header>
      <div className={css.petSettingsList}>
        {pets.map(item => <PetControl key={item.id} item={item} chinese={chinese} />)}
      </div>
      {interactions !== undefined && <section className={css.interactionRecords} aria-labelledby="custom-pet-records-title">
        <div className={css.settingsControlHead}>
          <h3 id="custom-pet-records-title" className={css.petSettingsName}>{chinese ? '互动记录' : 'Interaction records'}</h3>
          {records.length > 0 && <button type="button" className={css.recordAction} onClick={() => { interactions.clearRecords() }}>{chinese ? '清空' : 'Clear'}</button>}
        </div>
        {records.length === 0 ? <p className={css.recordEmpty}>{chinese ? '还没有互动记录' : 'No interactions yet'}</p> : <div className={css.recordList}>
          {records.map(record => <details key={record.id} className={css.recordItem}>
            <summary>{new Date(record.createdAt).toLocaleString()} · {record.turns.length} {chinese ? '轮' : 'turns'}</summary>
            <div className={css.recordTurns}>{record.turns.map((turn, index) => <p key={`${record.id}-${index}`}><strong>{turn.pet === 'primary' ? '哥伦比娅' : '桑多涅'}</strong>：{turn.text}</p>)}</div>
            <button type="button" className={css.recordAction} onClick={() => { interactions.deleteRecord(record.id) }}>{chinese ? '删除' : 'Delete'}</button>
          </details>)}
        </div>}
      </section>}
    </section>
  )
}
