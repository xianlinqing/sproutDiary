<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Plant, Entry } from '../domain/model';
import { daysSince } from '../domain/model';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
const props = defineProps<{ plant: Plant; entries: Entry[] }>();
const emit = defineEmits<{
  add: [];
  edit: [];
  share: [];
  deleteEntry: [id: string];
  preview: [photos: string[], start: number];
}>();
const tab = ref('成长记录');
const photos = computed(() =>
  props.entries.flatMap((e) => e.photos.map((src) => ({ src, date: e.date, id: e.id }))),
);
const shortDate = (d: string) => `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日`;
</script>
<template>
  <view class="detail">
    <view
      class="detail-hero"
      role="button"
      aria-label="查看植物封面大图"
      @click="emit('preview', [plant.cover], 0)"
    >
      <PlantPhoto :src="plant.cover" />
      <view class="hero-shade" />
      <view class="hero-preview-hint">
        <AppIcon name="camera" tone="white" :size="26" />
        <text>查看大图</text>
      </view>
      <view class="hero-copy">
        <text class="hero-title">{{ plant.name }}</text>
        <text class="hero-days">陪伴的第 {{ daysSince(plant.date) }} 天</text>
        <text class="hero-note">从一颗种子，到现在的模样 每一天都有新的惊喜。</text>
      </view>
    </view>
    <view class="detail-body">
      <view class="segment detail-tabs">
        <button
          v-for="t in ['成长记录', '植物档案', '相册']"
          :key="t"
          :class="{ active: tab === t }"
          @click="tab = t"
        >
          {{ t }}
        </button>
      </view>
      <view v-if="tab === '成长记录'" class="timeline">
        <view v-for="entry in entries" :key="entry.id" class="timeline-entry">
          <view class="timeline-dot" />
          <view class="entry-meta">
            <text>{{ shortDate(entry.date) }}</text>
            <text class="stage" :class="{ care: entry.kind === 'care' }">{{ entry.stage }}</text>
          </view>
          <text class="entry-title">{{ entry.title || entry.stage }}</text>
          <text class="entry-text">{{ entry.text }}</text>
          <view v-if="entry.photos.length" class="entry-photos">
            <view
              v-for="(photo, i) in entry.photos"
              :key="i"
              class="entry-photo"
              @click="emit('preview', entry.photos, i)"
            >
              <PlantPhoto :src="photo" />
            </view>
          </view>
          <button class="delete-entry" @click="$emit('deleteEntry', entry.id)">删除记录</button>
        </view>
        <view v-if="!entries.length" class="empty-state">
          <text class="empty-title">它的故事，等你来记录</text>
          <text>拍张照片，写下今天的小变化。</text>
        </view>
      </view>
      <view v-if="tab === '植物档案'" class="plant-profile">
        <view class="info-row">
          <text>植物昵称</text>
          <text>{{ plant.name }}</text>
        </view>
        <view class="info-row">
          <text>植物品种</text>
          <text>{{ plant.species || '尚未填写' }}</text>
        </view>
        <view class="info-row">
          <text>种植日期</text>
          <text>{{ plant.date }}</text>
        </view>
        <view class="info-row">
          <text>摆放位置</text>
          <text>{{ plant.location || '尚未填写' }}</text>
        </view>
        <button class="secondary" @click="$emit('edit')">编辑植物档案</button>
      </view>
      <view v-if="tab === '相册'" class="album-grid">
        <view v-for="(photo, i) in photos" :key="i" class="album-item">
          <view
            class="album-photo"
            role="button"
            :aria-label="`查看第${i + 1}张成长照片`"
            @click="
              emit(
                'preview',
                photos.map((p) => p.src),
                i,
              )
            "
          >
            <PlantPhoto :src="photo.src" />
          </view>
          <text>{{ shortDate(photo.date) }}</text>
        </view>
        <text v-if="!photos.length" class="subtitle">还没有照片，记录第一张成长照片吧。</text>
      </view>
      <button class="secondary share-diary" @click="$emit('share')">
        <AppIcon name="share" />
        制作成长长图
      </button>
    </view>
    <button class="camera-fab" @click="$emit('add')">
      <AppIcon name="camera" tone="white" />
      <text>拍照记录</text>
    </button>
  </view>
</template>
