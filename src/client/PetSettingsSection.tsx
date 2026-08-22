import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import type { DesktopPetHandle } from './desk-pet-controller.ts'
import css from './custom-background.module.css'
import type { PetInteractionManager } from './pet-interaction.ts'

const MAX_PET_IMAGE_BYTES = 30 * 1024 * 1024

export interface PetSettingsItem {
  id: string
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
  const name = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.name.bind(item.pet))
  const imageUrl = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.imageSource.bind(item.pet))
  const isCustomImage = useSyncExternalStore(item.pet.subscribe.bind(item.pet), item.pet.isCustomImage.bind(item.pet))
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageStatus, setImageStatus] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    if (file.size > MAX_PET_IMAGE_BYTES) {
      setImageStatus(chinese ? '图片不能超过 30MB' : 'Image must be under 30MB')
      return
    }
    item.pet.setImage(file)
    setImageStatus(chinese ? '已更新图片' : 'Image updated')
  }

  const startEditing = (): void => {
    setDraft(name)
    setEditing(true)
  }

  const commitName = (): void => {
    item.pet.setName(draft)
    setEditing(false)
  }

  const cancelName = (): void => {
    setDraft(name)
    setEditing(false)
  }

  return (
    <div className={css.petSettingsItem}>
      <div className={css.petNameRow}>
        {editing ? (
          <input
            className={css.petNameInput}
            value={draft}
            autoFocus
            aria-label={chinese ? '编辑宠物名称' : 'Edit pet name'}
            onChange={(event) => { setDraft(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); commitName() }
              else if (event.key === 'Escape') { cancelName() }
            }}
            onBlur={commitName}
          />
        ) : (
          <h3 className={css.petSettingsName}>{name}</h3>
        )}
        <button type="button" className={css.petNameEditButton} onClick={editing ? commitName : startEditing} aria-label={editing ? (chinese ? '保存名称' : 'Save name') : (chinese ? '编辑名称' : 'Edit name')}>{editing ? '✓' : '✎'}</button>
      </div>
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
      <div className={css.settingsControl}>
        <div className={css.petImageActions}>
          <img className={css.petPreview} src={imageUrl} alt={name} />
          <span className={css.settingsLabel}>{chinese ? '宠物图片' : 'Pet image'}</span>
          <button type="button" className={css.uploadButton} onClick={() => { fileRef.current?.click() }}>{chinese ? '更换图片' : 'Change image'}</button>
          {isCustomImage && <button type="button" className={css.uploadButton} onClick={() => { item.pet.resetImage(); setImageStatus('') }}>{chinese ? '恢复默认' : 'Reset'}</button>}
        </div>
        <input ref={fileRef} className={css.fileInput} type="file" accept="image/*" onChange={handleImageChange} />
        {imageStatus !== '' && <p className={css.uploadStatus} role="status">{imageStatus}</p>}
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
            <div className={css.recordTurns}>{record.turns.map((turn, index) => <p key={`${record.id}-${index}`}><strong>{turn.petName ?? (turn.pet === 'primary' ? '哥伦比娅' : '桑多涅')}</strong>：{turn.text}</p>)}</div>
            <button type="button" className={css.recordAction} onClick={() => { interactions.deleteRecord(record.id) }}>{chinese ? '删除' : 'Delete'}</button>
          </details>)}
        </div>}
      </section>}
    </section>
  )
}
