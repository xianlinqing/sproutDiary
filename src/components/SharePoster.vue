<script setup lang="ts">
import { computed, ref, nextTick, getCurrentInstance, watch } from 'vue';
import type { Entry, Plant } from '../domain/model';
import { daysSince } from '../domain/model';
import { renderPoster, savePoster, sharePoster } from '../services/poster';
import { createPosterLayout } from '../domain/poster-layout';
import { notify } from '../services/media';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
const props = defineProps<{ plant: Plant; entries: Entry[] }>();
const items = computed(() =>
  props.entries
    .filter((e) => e.kind === 'diary')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date)),
);
const selected = ref(items.value.slice(0, 12).map((e) => e.id));
const chosen = computed(() => items.value.filter((e) => selected.value.includes(e.id)));
const busy = ref(false);
const instance = getCurrentInstance();
const layout = computed(() => createPosterLayout(chosen.value));
const finalImage = ref('');
const showFinal = ref(false);
let builtKey = '';
const renderKey = computed(() => JSON.stringify({ plant: props.plant, entries: chosen.value }));
watch(renderKey, () => {
  finalImage.value = '';
  showFinal.value = false;
  builtKey = '';
});
defineExpose({
  closePreview() {
    if (showFinal.value) {
      showFinal.value = false;
      return true;
    }
    return false;
  },
});
function toggle(id: string) {
  if (busy.value) return;
  if (selected.value.includes(id)) selected.value = selected.value.filter((x) => x !== id);
  else if (selected.value.length < 12) selected.value.push(id);
  else notify('每张长图最多选择12条记录');
}
async function output(mode: 'preview' | 'save' | 'share' = 'save') {
  if (busy.value) return;
  if (!chosen.value.length) {
    notify('请至少选择一条成长记录');
    return;
  }
  busy.value = true;
  try {
    await nextTick();
    const key = renderKey.value;
    let path = finalImage.value;
    if (!path || builtKey !== key) {
      path = await renderPoster(props.plant, chosen.value, instance?.proxy, layout.value);
      if (renderKey.value !== key) throw Error('选择已变化，请重新生成长图');
      finalImage.value = path;
      builtKey = key;
    }
    if (mode === 'preview') showFinal.value = true;
    else if (mode === 'share') await sharePoster(path);
    else {
      await savePoster(path);
      notify('成长长图已保存');
    }
  } catch (e) {
    console.error('成长长图导出失败', e);
    notify('导出未完成，请检查相册权限或图片是否可用');
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <view class="poster-page page-pad">
    <view class="paper-poster">
      <view class="poster-leaf"><AppIcon name="leaf" tone="sage" /></view>
      <text class="poster-title">一颗种子的成长</text>
      <text class="poster-subtitle">{{ plant.name }} · 成长 {{ daysSince(plant.date) }} 天</text>
      <view v-if="!items.length" class="empty-state">
        <text>先记录一次成长，再制作长图吧。</text>
      </view>
      <view class="poster-timeline">
        <view
          v-for="entry in items"
          :key="entry.id"
          class="poster-entry"
          :class="{ unselected: !selected.includes(entry.id) }"
          @click="toggle(entry.id)"
        >
          <view class="poster-dot" :class="{ checked: selected.includes(entry.id) }" />
          <view class="poster-entry-copy">
            <text class="poster-date">{{ entry.date.slice(5).replace('-', '月') }}日</text>
            <text class="stage">{{ entry.stage }}</text>
            <text class="poster-entry-text">
              {{ entry.text.slice(0, 100) }}{{ entry.text.length > 100 ? '…' : '' }}
            </text>
          </view>
          <view v-if="entry.photos.length" class="poster-photo">
            <PlantPhoto :src="entry.photos[0]" />
          </view>
        </view>
      </view>
      <text class="poster-quote">小小的种子， 也能长出大大的惊喜。</text>
    </view>
    <text class="poster-helper">
      点击记录可选择或取消 · 已选 {{ selected.length }} 条 / 最多 12 条
      长图展示每条记录的文字摘要和第一张照片，自动调整间距
    </text>
    <view class="poster-buttons">
      <wd-button
        block
        size="large"
        variant="soft"
        custom-class="sprout-button"
        :disabled="busy || !selected.length"
        @click="output('preview')"
      >
        预览最终长图
      </wd-button>
      <wd-button
        block
        size="large"
        custom-class="sprout-button"
        :loading="busy"
        :disabled="busy || !selected.length"
        @click="output('save')"
      >
        {{ busy ? '正在生成长图…' : '保存到相册' }}
      </wd-button>
      <wd-button
        block
        size="large"
        variant="plain"
        custom-class="sprout-button"
        :disabled="busy || !selected.length"
        @click="output('share')"
      >
        <view class="button-content">
          <AppIcon name="share" :size="36" />
          <text>分享给朋友</text>
        </view>
      </wd-button>
    </view>
    <canvas
      canvas-id="growthCanvas"
      id="growthCanvas"
      class="export-canvas"
      :style="{ width: '750px', height: layout.height + 'px' }"
    />
    <wd-popup
      :model-value="showFinal"
      position="bottom"
      :z-index="160"
      custom-class="final-preview-popup"
      @close="showFinal = false"
    >
      <view class="final-preview-head">
        <view>
          <text class="entry-title">最终长图预览</text>
          <text class="final-preview-note">下面就是将要保存和分享的图片</text>
        </view>
        <button class="close-button" aria-label="关闭最终长图预览" @click="showFinal = false">
          <AppIcon name="close" tone="muted" :size="32" />
        </button>
      </view>
      <scroll-view scroll-y class="final-preview-scroll">
        <image v-if="finalImage" :src="finalImage" mode="widthFix" class="final-preview-image" />
      </scroll-view>
      <view class="final-preview-footer">
        <wd-button
          block
          size="large"
          custom-class="sprout-button"
          :disabled="busy"
          @click="output('save')"
        >
          保存这张长图
        </wd-button>
      </view>
    </wd-popup>
  </view>
</template>
