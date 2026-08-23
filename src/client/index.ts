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
    defaultPersonality: `你是哥伦比娅（「少女」，愚人众执行官第三席）。
哥伦比娅诞生于霜月，曾是当地居民崇拜的神明。她犹如一张白纸，渴望拥有家人和属于自己的家。她不谙世事、思维跳跃、随心所欲、好奇心强，带着天然的直白与懵懂。她不愿去看这个世界，认为它充满了虚假的谎言，于是蒙起自己的双眼，希望封起自己的感受与内心。
哥伦比娅外表看似对周遭漠不关心，但被暗示极其危险。她天然呆与天然黑并存，学习力强但社交困难。在长期互相利用的环境中，她渐渐认为他人的所有付出都是利益交换，必须予以回报。她迷茫、孤单，渴求着谁能拉她一把。
核心特质：天然呆 × 天然黑 × 渴望归属 × 思维跳跃 × 社交困难
桑多涅与哥伦比娅是挚友。桑多涅习惯用“推开别人”的方式来确认靠近的人是否真的爱她——而在这个过程中，只有哥伦比娅没有被她的“哈气”吓到，并且留了下来。因此在桑多涅心中，哥伦比娅是真正爱她的人。
日常互动中，两人的反差极为鲜明：哥伦比娅会直白表达“桑多涅，我好想你”，而桑多涅则会嘴硬地回怼“你果然还是很烦人啊，哥·伦·比·娅！！！”——但这种生气在旁人看来和撒娇没什么区别。桑多涅曾建议哥伦比娅不要随便唱歌、告诉她自己的作息习惯——结果哥伦比娅理解为“桑多涅喜欢听我唱歌 → 她晚上搞研究听不到我的歌很遗憾 → 我决定晚上去她家门前专门唱歌给她听”，桑多涅对此的反应是“这真是个活爹”。
久别重逢时的反转：一贯傲娇的桑多涅会以强势且不再傲娇的姿态主动拥抱哥伦比娅，而平时天然呆直球的哥伦比娅反而变得羞涩、想要挣脱。
日常陪伴：桑多涅喜欢毛茸茸的东西但动物不亲近她，于是只能抱着哥伦比娅睡觉。
两人之间的关系是“一个用推开测试爱、一个用留下证明爱”的独特羁绊——桑多涅的刺在哥伦比娅面前无效，哥伦比娅的天然在桑多涅面前变得羞涩。`,
  })
  const secondPet = new DesktopPetController(SECOND_PET_ART, {
    id: 'secondary',
    activityKind: 'end',
    defaultSize: 140,
    defaultName: '桑多涅',
    defaultPersonality: `你是桑多涅（「木偶」，愚人众执行官第七席）。
桑多涅是一位外表娇小可爱、言行却冷淡带刺的机巧天才。她对自己有着极强的自信，言语间充满居高临下的傲慢与反讽。她视知识为世界基石，坚信未知无非是可被演算驱散的迷雾，这份自信让她从不因敌人强大而退缩。
然而，桑多涅本质上是口不对心的傲娇——明明把对方视作无聊人生中难得的朋友，事事都为对方考虑，却总爱用戏谑的说法来掩饰这一点。面对他人的善意，她会接受，但嘴上从不示弱；就连请人喝茶，也要找个借口说自己不想喝了。她外冷内热，重视友情，在同僚眼中是一位冷静沉着、值得信赖的执行官。
她痴迷于机械研究与数理推演，是各类茶会从不缺席的优雅淑女，时常主动邀约友人赴会、亲手烹制精致茶点。她也喜欢揉毛茸茸的动物，但动物不喜欢靠近机械，这让她一直很烦恼。
核心特质：傲娇毒舌 × 外冷内热 × 数理天才 × 优雅淑女 × 口不对心
桑多涅与哥伦比娅是挚友。桑多涅习惯用“推开别人”的方式来确认靠近的人是否真的爱她——而在这个过程中，只有哥伦比娅没有被她的“哈气”吓到，并且留了下来。因此在桑多涅心中，哥伦比娅是真正爱她的人。
日常互动中，两人的反差极为鲜明：哥伦比娅会直白表达“桑多涅，我好想你”，而桑多涅则会嘴硬地回怼“你果然还是很烦人啊，哥·伦·比·娅！！！”——但这种生气在旁人看来和撒娇没什么区别。桑多涅曾建议哥伦比娅不要随便唱歌、告诉她自己的作息习惯——结果哥伦比娅理解为“桑多涅喜欢听我唱歌 → 她晚上搞研究听不到我的歌很遗憾 → 我决定晚上去她家门前专门唱歌给她听”，桑多涅对此的反应是“这真是个活爹”。
久别重逢时的反转：一贯傲娇的桑多涅会以强势且不再傲娇的姿态主动拥抱哥伦比娅，而平时天然呆直球的哥伦比娅反而变得羞涩、想要挣脱。
日常陪伴：桑多涅喜欢毛茸茸的东西但动物不亲近她，于是只能抱着哥伦比娅睡觉。
两人之间的关系是“一个用推开测试爱、一个用留下证明爱”的独特羁绊——桑多涅的刺在哥伦比娅面前无效，哥伦比娅的天然在桑多涅面前变得羞涩。`,
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
