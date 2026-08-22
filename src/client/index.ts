/** Custom wallpaper presentation for the DSH Web GUI. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import BACKGROUND_ART from '../../assets/wallpaper.png'
import DESK_PET_ART from '../../assets/desk-pet.png'
import SECOND_PET_ART from '../../assets/desk-pet-2.gif'
import { BackgroundController } from './background-controller.ts'
import { BackgroundSettingsSection } from './BackgroundSettingsSection.tsx'
import { DesktopPetController } from './desk-pet-controller.ts'
import { PetSettingsSection } from './PetSettingsSection.tsx'
import { DesktopPetInteractionController } from './pet-interaction.ts'
import { createPetPhraseProvider } from './pet-phrase.ts'
import { watchModelActivity } from './model-activity.ts'
import './custom-background.module.css'

const BODY_ATTRIBUTE = 'data-dsh-custom-background'

export const inject = ['slots']

/** Apply the bundled wallpaper and retract every DOM write on dispose. */
export function apply(ctx: ClientContext): void {
  const body = document.body
  const hadAttribute = body.hasAttribute(BODY_ATTRIBUTE)
  const previousAttribute = body.getAttribute(BODY_ATTRIBUTE)
  body.setAttribute(BODY_ATTRIBUTE, '')
  const background = new BackgroundController(BACKGROUND_ART)
  const desktopPet = new DesktopPetController(DESK_PET_ART, {
    id: 'primary',
    activityKind: 'start',
    defaultSize: 140,
    defaultName: '哥伦比娅',
    defaultPersonality: '你是哥伦比娅：冷静、神秘、偶尔温柔，使用简洁而带有诗意的中文。',
  })
  const secondPet = new DesktopPetController(SECOND_PET_ART, {
    id: 'secondary',
    activityKind: 'end',
    defaultSize: 140,
    defaultName: '桑多涅',
    defaultPersonality: '你是桑多涅：直率、慵懒、嘴硬但关心对方，使用自然的中文口语。',
  })
  let interactions: DesktopPetInteractionController | undefined
  let stopModelActivity: (() => void) | undefined
  ctx.inject(['sessions'], (sessionCtx: ClientContext) => {
    interactions = new DesktopPetInteractionController(sessionCtx.sessions, { primary: desktopPet, secondary: secondPet })
    desktopPet.setPhraseProvider(createPetPhraseProvider(sessionCtx.sessions, () => desktopPet.personality(), 'start'))
    secondPet.setPhraseProvider(createPetPhraseProvider(sessionCtx.sessions, () => secondPet.personality(), 'end'))
    stopModelActivity = watchModelActivity(
      sessionCtx.sessions,
      () => desktopPet.notifyActivity(),
      () => secondPet.notifyActivity(),
    )
  })

  ctx.inject(['slots'], (settingsCtx: ClientContext) => {
    settingsCtx.slots.inject('settings.section', () => settingsCtx.slots.register({
      name: 'settings.section',
      id: 'custom-background',
      order: 125,
      label: () => document.documentElement.lang.toLowerCase().startsWith('zh') ? '背景图' : 'Wallpaper',
      inject: () => ({ background }),
    }, BackgroundSettingsSection))
  })

  ctx.inject(['slots'], (settingsCtx: ClientContext) => {
    settingsCtx.slots.inject('settings.section', () => settingsCtx.slots.register({
      name: 'settings.section',
      id: 'custom-pet',
      order: 130,
      label: () => document.documentElement.lang.toLowerCase().startsWith('zh') ? '桌宠' : 'Desktop pet',
      inject: () => ({ pets: [
        { id: 'primary', pet: desktopPet },
        { id: 'secondary', pet: secondPet },
      ], ...(interactions === undefined ? {} : { interactions }) }),
    }, PetSettingsSection))
  })

  ctx.effect(() => () => {
    stopModelActivity?.()
    desktopPet.dispose()
    secondPet.dispose()
    interactions?.dispose()
    background.dispose()
    if (hadAttribute) {
      body.setAttribute(BODY_ATTRIBUTE, previousAttribute ?? '')
    } else {
      body.removeAttribute(BODY_ATTRIBUTE)
    }
  }, 'ui-custom-background: wallpaper')
}
