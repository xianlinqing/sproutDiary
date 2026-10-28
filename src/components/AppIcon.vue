<script setup lang="ts">
import { computed } from 'vue';
import type { IconName, IconTone } from '../design/icon-catalog';

const props = withDefaults(defineProps<{ name: IconName; tone?: IconTone; size?: number }>(), {
  tone: 'green',
});
const source = computed(() => `/static/icons/${props.name}-${props.tone}.png`);
</script>

<template>
  <view
    class="icon"
    :class="'icon-' + name"
    :style="size ? { width: size + 'rpx', height: size + 'rpx' } : undefined"
    aria-hidden="true"
  >
    <image class="icon-image" :src="source" mode="aspectFit" aria-hidden="true" />
  </view>
</template>

<style scoped>
.icon {
  width: 44rpx;
  height: 44rpx;
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}
.icon-image {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
