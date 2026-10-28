<script setup lang="ts">
import { nextTick, ref } from 'vue';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
import { updatePhotoViewport, type PhotoViewportAction } from '../domain/photos';
const props = defineProps<{ photos: string[]; start: number }>();
defineEmits<{ close: [] }>();
const viewport = ref({
  index: Math.min(Math.max(0, props.start), props.photos.length - 1),
  scale: 1,
  requestedScale: 1,
  revision: 0,
});
function dispatch(action: PhotoViewportAction) {
  viewport.value = updatePhotoViewport(viewport.value, action);
}
function change(e: { detail: { current: number } }) {
  dispatch({ type: 'change', index: e.detail.current });
}
function scale(e: { detail: { scale: number } }, index: number) {
  dispatch({ type: 'scale', index, value: e.detail.scale });
}
async function enlarge() {
  // 先同步手势后的实际比例，再发出目标，确保重复目标也能触发原生属性更新。
  dispatch({ type: 'prepare-enlarge' });
  await nextTick();
  dispatch({ type: 'enlarge' });
}
</script>
<template>
  <view class="photo-viewer">
    <view class="viewer-toolbar">
      <text>{{ viewport.index + 1 }} / {{ photos.length }}</text>
      <button class="viewer-close" aria-label="关闭照片预览" @click="$emit('close')">
        <AppIcon name="close" tone="white" />
      </button>
    </view>
    <swiper class="viewer-swiper" :current="viewport.index" :duration="220" @change="change">
      <swiper-item v-for="(photo, i) in photos" :key="i">
        <movable-area class="viewer-area">
          <movable-view
            :key="`${i}-${viewport.revision}`"
            class="viewer-image"
            direction="all"
            scale
            :scale-min="1"
            :scale-max="4"
            :scale-value="viewport.index === i ? viewport.requestedScale : 1"
            @scale="scale($event, i)"
          >
            <PlantPhoto :src="photo" fit="contain" />
          </movable-view>
        </movable-area>
      </swiper-item>
    </swiper>
    <view class="viewer-footer">
      <text>左右滑动切换，双指放大查看</text>
      <view class="viewer-actions">
        <button @click="enlarge">放大</button>
        <button @click="dispatch({ type: 'reset' })">复原</button>
      </view>
    </view>
  </view>
</template>
<style scoped>
.photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 160;
  display: flex;
  flex-direction: column;
  background: #13251cf5;
  color: #f9faef;
  padding-top: env(safe-area-inset-top);
}
.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 36rpx;
  height: 108rpx;
  flex-shrink: 0;
  font-size: 28rpx;
}
.viewer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: #ffffff15;
}
.viewer-swiper {
  width: 100%;
  flex: 1;
  min-height: 0;
}
.viewer-area,
.viewer-image {
  width: 100%;
  height: 100%;
}
.viewer-footer {
  text-align: center;
  padding: 26rpx 30rpx calc(30rpx + env(safe-area-inset-bottom));
  font-size: 24rpx;
  color: #c1cfbb;
  flex-shrink: 0;
}
.viewer-actions {
  display: flex;
  justify-content: center;
  gap: 22rpx;
  margin-top: 20rpx;
}
.viewer-actions button {
  background: #ffffff14;
  border-radius: 30rpx;
  padding: 16rpx 38rpx;
  color: #f5f7ee;
  font-size: 25rpx;
}
@media (min-width: 600px) {
  .photo-viewer {
    max-width: 460px;
    left: 0;
    right: 0;
    margin: auto;
  }
}
</style>
