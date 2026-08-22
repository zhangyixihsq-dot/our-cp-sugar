# our-cp-sugar

[English](README.md) | 中文

让二次元家产自动“产粮”的 DSH 桌面插件。

你负责嗑，家产负责营业；你负责围观，它们负责演。背景图、角色形象、性格 Prompt 都能自定义，按一下互动按钮，两位家产立刻用自己独立的小脑瓜开始互撩、拌嘴或走剧情。

> 纯浏览器插件：host 入口是空壳，真正干活的都在客户端 bundle 里。

## 它到底会干什么

### 片场布景（背景图）

- 内置 `assets/wallpaper.png`，铺满屏幕给家产当片场。
- 「背景变浅」滑杆（0–100%，默认 0%）负责拯救阅读困难户，给画面罩一层白纱，又不耽误你嗑。
- 「图片饱和度」滑杆（100–300%，默认 100%）负责让画面从“素颜滤镜”切到“满屏浓颜”。
- 支持自定义背景图上传：选图后能拖动取景、缩放构图，确认后按显示器分辨率重画（最高约 3840×2160），不满意一键恢复默认。
- 亮暗主题自动换遮罩，皮肤中心的 `--dsw-skin-scrim` 也给你让路。

### 两位家产（桌宠）

- 右下角常驻两位可拖动家产：
  - 哥伦比娅（`assets/desk-pet.png`）——冷静神秘担当
  - 桑多涅（`assets/desk-pet-2.gif`）——直率嘴硬、其实很在意你的担当
- 它们会偷看宿主模型干活：`/api/yixi-custom-pet/state` 里回合开始、回合结束，对应家产会冒个泡。
- 点一下还会说一句角色台词。
- 「桌宠」设置页里，每位家产都可以：
  - 开关显示
  - 100–360px 大小滑杆
  - 铅笔图标内联改名字
  - 换头像/GIF（存 IndexedDB，单张 ≤30MB，带预览和恢复默认）
  - 写性格 Prompt
- 显示、大小、位置、名字、性格统统本地记住，下次打开还在。

### 家产营业（互动产粮）

- 鼠标一悬停，家产头上就冒出「互动」按钮。
- 点谁谁先开口，主动权给到位。
- 两位各自开独立 session，用各自性格 Prompt 当人设底牌。
- 最多互相说 **10 轮**，只输出短句台词，不整动作、心理或旁白，中间还会停顿一下让你看清。
- 产出的粮（互动记录）本地保存，可在设置页展开、删除或一键清空。

## 装进电脑

```sh
cd our-cp-sugar
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

然后重启或硬刷新 DSH Web GUI：

- macOS：`Cmd + Shift + R`
- Windows/Linux：`Ctrl + Shift + R`

## 开发三连

```sh
pnpm typecheck
pnpm test
pnpm build
# 边改边看
pnpm watch
```

## 道具都藏哪了

- 背景变浅、饱和度、自定义背景 data URL：`localStorage`
- 家产显示、大小、位置、名字、性格：`localStorage`
- 互动记录：`localStorage`
- 家产图片/GIF：`IndexedDB`（`our-cp-sugar` / `pet-images`）

## 想换默认素材

直接替换 `assets/` 里的文件再重新构建：

- `assets/wallpaper.png`
- `assets/desk-pet.png`
- `assets/desk-pet-2.gif`

构建时会被内嵌进 `lib/client.js`。

## 项目结构

```text
src/index.ts                           host 端空入口
src/client/index.ts                     浏览器入口
src/client/background-controller.ts     片场布景与持久化
src/client/BackgroundSettingsSection.tsx
src/client/wallpaper-upload.ts          裁剪/缩放逻辑
src/client/desk-pet-controller.ts       家产渲染、拖动、设置、图片存储
src/client/pet-interaction.ts           家产自动营业的对话引擎
src/client/PetSettingsSection.tsx
src/pet-state.ts                        活动状态辅助
assets/
tests/
```

## 已知的“不能”

- 自定义背景存的是 data URL，太大可能撞上浏览器 `localStorage` 配额。
- 家产图片存 IndexedDB，单张上限 30MB；再大就不是头像，是电影了。
- 半透明界面依赖 DSH 主题 token 名。
- 家产互动需要浏览器端 DSH session runtime；连不上就暂时罢演，不影响主聊天。
- 内置图片仅供本地自用，不授权对外分发。

## 许可证

UNLICENSED。私人粮仓，仅供本地使用。
