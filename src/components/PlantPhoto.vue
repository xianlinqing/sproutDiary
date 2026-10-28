<script setup lang="ts">
import { computed, ref, getCurrentInstance, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { spriteGeometry, type PhotoFit, type PhotoRect } from '../domain/photos';
import AppIcon from './AppIcon.vue';
const props = withDefaults(defineProps<{ src: string; fit?: PhotoFit }>(), { fit: 'cover' });
const positions: Record<string, number[]> = {
  tomato: [0, 0],
  jasmine: [1, 0],
  mint: [0, 1],
  monstera: [1, 1],
};
const tile = computed(() =>
  props.src?.startsWith('plant:') ? positions[props.src.slice(6)] || positions.monstera : null,
);
const frame = ref({ width: 0, height: 0 });
const failed = ref(false);
const instance = getCurrentInstance();
let mounted = false;
const geometry = computed(() =>
  spriteGeometry(
    frame.value.width,
    frame.value.height,
    tile.value?.[0] || 0,
    tile.value?.[1] || 0,
    props.fit,
  ),
);
const style = (r: PhotoRect) => ({
  width: r.width + 'px',
  height: r.height + 'px',
  left: r.left + 'px',
  top: r.top + 'px',
});
async function measure() {
  await nextTick();
  if (!mounted || !tile.value) return;
  uni
    .createSelectorQuery()
    .in(instance?.proxy)
    .select('.plant-photo')
    .boundingClientRect((result) => {
      const box = Array.isArray(result) ? result[0] : result;
      if (box && mounted) frame.value = { width: box.width || 0, height: box.height || 0 };
    })
    .exec();
}
onMounted(() => {
  mounted = true;
  measure();
  uni.onWindowResize(measure);
});
onUnmounted(() => {
  mounted = false;
  uni.offWindowResize(measure);
});
watch(
  () => [props.src, props.fit],
  () => {
    failed.value = false;
    measure();
  },
);
</script>
<template>
  <view class="plant-photo" :class="{ 'photo-contain': fit === 'contain' }">
    <view v-if="failed" class="photo-error">
      <AppIcon name="leaf" tone="sage" />
      <text>照片暂时无法显示</text>
    </view>
    <view v-else-if="tile" class="sprite-window" :style="style(geometry.window)">
      <image
        class="sprite-photo"
        src="/static/plants.png"
        :style="style(geometry.image)"
        mode="scaleToFill"
        @error="failed = true"
      />
    </view>
    <image
      v-else
      :src="src"
      class="full-photo"
      :mode="fit === 'contain' ? 'aspectFit' : 'aspectFill'"
      @error="failed = true"
    />
  </view>
</template>
<style scoped>
.plant-photo {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #e7eadc;
}
.photo-contain {
  background: transparent;
}
.sprite-window {
  position: absolute;
  overflow: hidden;
}
.sprite-photo {
  position: absolute;
  max-width: none;
}
.full-photo {
  width: 100%;
  height: 100%;
  display: block;
}
.photo-error {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: #7c8e70;
  font-size: 23rpx;
  padding: 12rpx;
  text-align: center;
}
</style>
