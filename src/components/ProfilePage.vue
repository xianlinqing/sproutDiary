<script setup lang="ts">
import type { DiaryState } from '../domain/model';
import AppIcon from './AppIcon.vue';
defineProps<{
  state: DiaryState;
  loggedIn?: boolean;
  accountConfigured?: boolean;
  cloudBusy?: boolean;
  canUndo?: boolean;
}>();
defineEmits<{
  backup: [];
  restore: [];
  clear: [];
  seed: [];
  login: [];
  logout: [];
  cloudBackup: [];
  cloudRestore: [];
  undoCloud: [];
}>();
</script>
<template>
  <view class="page-pad profile-page">
    <text class="page-title">我的</text>
    <text class="subtitle">和植物一起，慢慢生长</text>
    <view class="profile-greeting">
      <AppIcon name="leaf" tone="sage" />
      <text>收藏每一次新生</text>
      <text class="summary-note">Sprout Diary · 植物日记</text>
    </view>
    <view class="stats-row">
      <view>
        <text>{{ state.plants.length }}</text>
        <text>株植物</text>
      </view>
      <view>
        <text>{{ state.entries.filter((e) => e.kind === 'diary').length }}</text>
        <text>篇日记</text>
      </view>
      <view>
        <text>{{ state.tasks.filter((t) => t.status === 'done').length }}</text>
        <text>次养护</text>
      </view>
    </view>
    <view class="account-section">
      <view class="account-heading">
        <AppIcon name="user" tone="sage" />
        <text>{{ loggedIn ? '已登录微信账号' : '登录，备份我的花园' }}</text>
      </view>
      <text class="account-note">
        {{
          accountConfigured
            ? '植物与照片在你确认备份后上传，账号恢复可带回本机。'
            : '后端地址配置后可使用微信登录。本地记录功能已可正常使用。'
        }}
      </text>
      <button
        v-if="!loggedIn"
        class="soft account-login"
        hover-class="settings-pressed"
        :disabled="cloudBusy"
        @click="$emit('login')"
      >
        微信登录
      </button>
      <view v-else class="account-actions">
        <button hover-class="settings-pressed" :disabled="cloudBusy" @click="$emit('cloudBackup')">
          备份到账号
        </button>
        <button hover-class="settings-pressed" :disabled="cloudBusy" @click="$emit('cloudRestore')">
          从账号恢复
        </button>
        <button class="account-logout" :disabled="cloudBusy" @click="$emit('logout')">退出</button>
      </view>
      <button v-if="canUndo" class="account-undo" :disabled="cloudBusy" @click="$emit('undoCloud')">
        撤销上次云恢复
      </button>
      <text v-if="loggedIn" class="account-note">
        当前为手动备份，不会自动同步。退出账号会保留本机记录。
      </text>
    </view>
    <view class="settings-list">
      <button hover-class="settings-pressed" @click="$emit('backup')">
        <text>导出数据备份</text>
        <AppIcon name="arrow" tone="muted" />
      </button>
      <button hover-class="settings-pressed" @click="$emit('restore')">
        <text>导入数据备份</text>
        <AppIcon name="arrow" tone="muted" />
      </button>
      <button hover-class="settings-pressed" @click="$emit('seed')">
        <text>恢复示例花园</text>
        <AppIcon name="arrow" tone="muted" />
      </button>
      <button class="danger" hover-class="settings-pressed" @click="$emit('clear')">
        <text>清空当前设备数据</text>
        <AppIcon name="arrow" tone="muted" />
      </button>
    </view>
    <view class="privacy-note">
      <text class="entry-title">你的花园，由你保管</text>
      <text>
        未登录时记录保存在当前设备，浏览器与微信小程序分别保存。登录后，只有你确认备份时才上传到账号。清理缓存或卸载前，请先备份。
      </text>
      <text>
        微信小程序备份只包含文字和照片路径，不包含照片文件。删除记录、清空数据或恢复示例后，原照片文件会被回收，导入备份也无法找回。重要照片请先另存系统相册。
      </text>
    </view>
  </view>
</template>
<style scoped>
.account-section {
  margin: 0 0 32rpx;
  padding: 28rpx;
  background: #edf0e3;
  border-radius: 24rpx;
}
.account-heading {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 29rpx;
  font-weight: 600;
}
.account-note {
  display: block;
  font-size: 23rpx;
  color: #76816d;
  line-height: 1.7;
  margin-top: 12rpx;
}
.account-login {
  margin-top: 22rpx;
  min-height: 76rpx;
  font-size: 27rpx;
  background: #dfe8d3;
}
.account-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 22rpx;
}
.account-actions button {
  padding: 16rpx 18rpx;
  border: 1rpx solid #c3d0b6;
  border-radius: 24rpx;
  font-size: 25rpx;
  color: #365b3c;
}
.account-actions .account-logout {
  border: 0;
  margin-left: auto;
  color: #838b78;
  padding: 16rpx 4rpx;
  font-size: 23rpx;
}
.account-undo {
  margin-top: 18rpx;
  font-size: 24rpx;
  text-align: left;
  color: #4f7049;
  padding: 10rpx 0;
}
.settings-list button {
  transition: background-color 120ms ease;
}
.settings-list .settings-pressed {
  background-color: #edf1e4;
  border-radius: 16rpx;
}
.settings-list .danger.settings-pressed {
  background-color: #f6ece5;
}
@media (prefers-reduced-motion: reduce) {
  .settings-list button {
    transition: none;
  }
}
</style>
