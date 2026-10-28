# 技术约定

使用 uni-app Vue 3 稳定发行版、Vue 3 Composition API、TypeScript、Pinia、Wot UI 2.4.0、SCSS。
依赖选用当前稳定且兼容的版本并锁定，Vite 遵循 uni-app 插件的 peerDependencies，避免强行升级造成编译不兼容。

源码位于 `src/`。`npm run dev` 提供浏览器预览，`npm run dev:mp-weixin` 持续生成微信开发者工具可导入的 `dist/dev/mp-weixin/`。生产构建分别为 `npm run build:h5` 与 `npm run build:mp-weixin`。

设计文档及实施计划位于 `D:\project\wxapp\文档`。

Wot UI 当前使用新的 npm 包名 `@wot-ui/ui`，不使用旧的 `wot-design-uni`。主题配置位于 `src/styles/wot-theme.scss`；页面布局、照片卡片、成长时间线保持定制实现，按钮、表单和底部弹层使用组件库。
