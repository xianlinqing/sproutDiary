# 植物日记 · Sprout Diary

微信小程序与浏览器共用一套 Vue 3 源码。界面采用奶油白、植物绿和照片卡片，通用控件使用 Wot UI 2.4.0。

## 本地预览

在当前目录执行：

```powershell
npm ci
npm run dev
```

浏览器打开 <http://127.0.0.1:5173/>。首次打开会显示四株示例植物，照片素材随项目提供。

## 微信开发者工具

```powershell
npm run build:mp-weixin
```

在微信开发者工具点击“导入”，选择 **`D:\project\wxapp\sproutDiary\dist\build\mp-weixin`**。当前为游客 AppID，本地模拟器预览不依赖服务器。请导入编译目录，而不是包含 Vue 源码的项目根目录。

持续开发时执行 `npm run dev:mp-weixin`，并改为导入 `dist\dev\mp-weixin`。接入正式 AppID 时修改 `src/manifest.json` 的 `mp-weixin.appid` 后重新构建。

开发者工具的 CLI 服务端口目前关闭，自动导入未执行；手动导入无需修改该设置。手机真机调试、相册授权及微信好友分享仍需在配置有效 AppID 后测试。

## 已有功能

- 新建、编辑、删除植物档案与封面照片。
- 拍照或从相册选择照片，填写日记并标记成长阶段；封面、时间线与相册保持照片比例，点击后可查看大图、滑动切换和缩放。
- 新建一次性或重复养护任务，待办按“已逾期、今天、之后”分组并显示周期；支持完成、推迟、跳过，完成后生成养护记录。
- 选择最多 12 条成长记录，根据文字和照片自动计算 PNG 长图高度；可先预览实际生成的图片，再保存或分享同一张图片。
- 本地存储、数据备份、损坏缓存恢复和微信未引用照片回收。

浏览器保存长图时下载 PNG；微信端保存到系统相册，分享调用微信图片分享菜单。两端数据各自独立，当前不提供云同步、好友在线主页或订阅消息提醒。

**微信端 JSON 备份只包含文字和照片路径，不包含照片文件。** 删除、清空、恢复示例会回收无引用的照片，之后重新导入 JSON 不能找回已经删除的照片。重要照片请另存系统相册。浏览器上传的照片以压缩图像数据保存，可随浏览器 JSON 备份导出。

## 技术栈与验证

uni-app Vue 3 发行版 + Vue 3.5 + TypeScript 5.9 + Pinia 4 + Wot UI 2.4 + SCSS。Vite 按 uni-app 插件要求固定为 5.2.8；具体版本以 `package-lock.json` 为准。

```powershell
npm test
npm run type-check
npm run build:mp-weixin
npm run build:h5
```

`src/styles/wot-theme.scss` 集中管理 Wot 品牌主题。`src/pages.json` 的 easycom 按需引入组件，`src/wot-components.d.ts` 注册实际使用的组件类型。输入框、文本域、按钮、底部弹层已经用于真实业务流程。

体验优化中的纯逻辑位于 `src/domain/photos.ts`、`task-groups.ts` 与 `poster-layout.ts`，分别覆盖照片几何裁剪、日期分组和自适应长图排版；对应测试可通过 `npm test` 一并运行。

## 原创图标

界面不使用 Emoji 或字符符号充当图标。17 个原创植物主题图标的路径设计位于 `scripts/build-icons.cjs`，SVG 源文件位于 `src/assets/icons`，微信与浏览器使用 `src/static/icons` 中的透明 PNG，避免依赖系统字体或外部图标服务。

`npm run icons:build` 重新生成四种配色的图标；`npm run icons:check` 验证产物与源设计一致。`node scripts/build-icons.cjs --preview` 在项目文档目录生成图标预览。通用入口为 `AppIcon`，通过 `name`、`tone` 和可选的 `size` 使用；表单清空控件通过 `SproutInput` 复用同一套原创图标。

设计、需求与实施文档位于 `D:\project\wxapp\文档`。原有根目录 `project.config.json` 为用户创建的配置，保留原状，未纳入本次提交。

## 自建后端与微信登录

后端代码位于 `D:\project\wxapp\sproutDiaryServer`，运行和部署方法见该目录 README。

小程序已使用 AppID `wxa2a5f23a2973420e`。复制 `.env.example` 到 `.env.local`，配置 `VITE_API_BASE_URL` 后重启开发服务或重新构建。开发默认地址 `http://127.0.0.1:3000` 仅供本机模拟器；线上必须使用合法 HTTPS 域名，并在微信后台配置 request、uploadFile、downloadFile 域名。

“我的”页新增微信登录、退出、手动备份到账号、从账号恢复及撤销上次恢复。登录不会自动上传记录；备份会在确认后替换账号备份，恢复会先下载照片并保留一份原本地记录。每次本地修改仍需手动备份，不是自动同步。

AppSecret 只配置在后端 `.env`，不能放在 `VITE_` 变量或前端代码中。H5 继续支持本地功能，不提供模拟微信身份。尚未配置 AppSecret 时不能完成真实微信登录。
