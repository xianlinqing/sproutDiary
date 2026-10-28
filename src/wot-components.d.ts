import type WdButton from '@wot-ui/ui/components/wd-button/wd-button.vue';
import type WdInput from '@wot-ui/ui/components/wd-input/wd-input.vue';
import type WdTextarea from '@wot-ui/ui/components/wd-textarea/wd-textarea.vue';
import type WdPopup from '@wot-ui/ui/components/wd-popup/wd-popup.vue';

// 仅注册实际使用的组件类型，避免检查与本项目无关的视频、条码等平台组件。
declare module 'vue' {
  export interface GlobalComponents {
    WdButton: typeof WdButton;
    WdInput: typeof WdInput;
    WdTextarea: typeof WdTextarea;
    WdPopup: typeof WdPopup;
  }
}
