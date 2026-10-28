<script setup lang="ts">
import type { Plant } from '../domain/model';
import { daysSince } from '../domain/model';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
defineProps<{ plants: Plant[] }>();
defineEmits<{ open: [id: string]; add: [] }>();
</script>
<template>
  <view class="page-pad plant-list">
    <text class="page-title">我的植物</text>
    <text class="subtitle">每一片新叶，都值得记录</text>
    <view class="add-plant">
      <wd-button block size="large" custom-class="sprout-button" @click="$emit('add')">
        <view class="button-content">
          <AppIcon name="plus" tone="white" :size="36" />
          <text>添加植物</text>
        </view>
      </wd-button>
    </view>
    <view v-if="!plants.length" class="empty-state">
      <AppIcon name="leaf" tone="sage" />
      <text class="empty-title">让成长，从第一株植物开始</text>
      <text>添加一株植物，留下它的第一张照片。</text>
    </view>
    <view class="plant-grid">
      <button
        v-for="p in plants"
        :key="p.id"
        class="plant-card"
        :aria-label="`查看${p.name}成长日记`"
        @click="$emit('open', p.id)"
      >
        <view class="card-photo"><PlantPhoto :src="p.cover" /></view>
        <view class="card-info">
          <text class="plant-name">{{ p.name }}</text>
          <text class="plant-days">陪伴 {{ daysSince(p.date) }} 天</text>
          <view class="card-arrow"><AppIcon name="arrow" tone="muted" :size="24" /></view>
        </view>
      </button>
    </view>
    <text v-if="plants.length" class="page-footnote">慢慢长大，也是生活的小美好</text>
  </view>
</template>
