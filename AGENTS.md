# AGENTS.md - our-cp-sugar

Standalone DSH Web GUI plugin project.

## 本包要点

- 这是纯浏览器插件：host 入口为空，所有行为由 `src/client/index.ts` 拥有并在 dispose 时回收。
- 背景图存放在 `assets/wallpaper.png`，构建时内嵌；源码不引用本机绝对路径或外部 URL。
- 样式必须作用于 `body[data-dsh-custom-background]` 之下，并保持皮肤中心 `--dsw-skin-scrim` 变量兼容。

## 提交前检查

```sh
pnpm typecheck
pnpm test
pnpm build
```
