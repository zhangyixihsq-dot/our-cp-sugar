# our-cp-sugar

English | [中文](README.zh.md)

`our-cp-sugar` is a DSH Web GUI plugin that applies a bundled wallpaper with theme-aware readability scrims, translucent application surfaces, and two animated desktop pets.

## What it does

- Loads through the standard DSH browser-plugin channel declared by `dsh.client.platform: web`.
- Covers the viewport with a fixed, centered wallpaper from `assets/wallpaper.png`, embedded into `lib/client.js` during build.
- Adds a persisted 0-100% lightening slider: 0% keeps the artwork unchanged and higher values make it lighter.
- Adds a persisted 100-300% saturation slider: 100% keeps the current artwork appearance and higher values make it more vivid.
- Displays the transparent animations from `assets/desk-pet.png` (哥伦比娅) and `assets/desk-pet-2.gif` (桑多涅) in the lower-right corner; each pet can be dragged and persists its position locally.
- Listens to the official DSH `session/event` stream: 哥伦比娅 says “桑多涅，你看这是什么？” when a model turn starts, and 桑多涅 says “哈？这个你也要问我？” when the model turn ends.
- Clicking 哥伦比娅 shows “早上好，桑多涅～”; clicking 桑多涅 shows “你要干嘛，哥伦比娅 ? !”.
- The settings panel provides an independent show/hide switch and 100-360px size slider for each pet. Both settings persist locally.
- Switches between light and dark readability scrims when `data-ds-dark-theme` changes.
- Honors the Skin Center `--dsw-skin-scrim` variable when that plugin is installed.
- Restores the previous body background and removes its scoped theme attribute when unloaded.

## Install

### Build and install locally

```sh
cd our-cp-sugar
pnpm install
pnpm build
dsh plugin --profile web add link:$(pwd)
```

Restart or refresh the DSH Web GUI after installation.

## Config

Wallpaper lightening defaults to 0%. Saturation defaults to 100% and can be increased to 300%. The DSH settings panel includes independent show/hide switches and size sliders for 哥伦比娅 and 桑多涅. To replace the image, overwrite `assets/wallpaper.png` and rebuild. Skin Center background opacity continues to work through `--dsw-skin-scrim`.

## Known limitations

- There is no file picker or URL field; changing the wallpaper asset requires rebuilding the package.
- The transparency layer relies on the current DSH theme-token names.
- The bundled image was supplied for private use and is not licensed for redistribution by this package.
- Pet activity is carried through the same-origin `/api/yixi-custom-pet/state` endpoint, so a page reload may add one polling interval of delay.

## License

UNLICENSED. This is a private local-use package.
