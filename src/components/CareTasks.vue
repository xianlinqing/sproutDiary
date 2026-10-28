<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { Plant, Task } from '../domain/model';
import { today } from '../domain/model';
import { groupPendingTasks, type TaskGroup } from '../domain/task-groups';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
const props = defineProps<{ plants: Plant[]; tasks: Task[] }>();
defineEmits<{ add: []; complete: [id: string]; postpone: [id: string]; skip: [id: string] }>();
const tab = ref('pending');
const currentDate = ref(today());
let clock: ReturnType<typeof setInterval>;
onMounted(() => {
  clock = setInterval(() => (currentDate.value = today()), 60000);
});
onUnmounted(() => clearInterval(clock));
const pendingGroups = computed(() => groupPendingTasks(props.tasks, currentDate.value));
const groups = computed<TaskGroup[]>(() => {
  if (tab.value === 'pending') return pendingGroups.value;
  const tasks = props.tasks
    .filter((t) => t.status !== 'pending')
    .slice()
    .sort((a, b) => (b.completed || b.due).localeCompare(a.completed || a.due));
  return tasks.length ? [{ key: 'history', label: '养护记录', tasks }] : [];
});
const todayCount = computed(
  () => pendingGroups.value.find((g) => g.key === 'today')?.tasks.length || 0,
);
const overdueCount = computed(
  () => pendingGroups.value.find((g) => g.key === 'overdue')?.tasks.length || 0,
);
const findPlant = (id: string) => props.plants.find((p) => p.id === id)!;
const dateLabel = (d: string) =>
  d === currentDate.value
    ? '今天'
    : d < currentDate.value
      ? '已逾期 · ' + d.slice(5)
      : d.slice(5).replace('-', '月') + '日';
const dateText = computed(() =>
  new Date(currentDate.value + 'T12:00:00').toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
);
const hints: Record<string, string> = {
  浇水: '检查土壤后再浇水',
  施肥: '按植物状态和肥料说明调整用量',
  修剪: '修剪过密的侧枝，保留主要枝条',
  换盆: '选择合适大小的花盆，注意排水',
};
</script>
<template>
  <view class="page-pad care-page">
    <text class="page-title">今日养护</text>
    <text class="subtitle">{{ dateText }}</text>
    <view class="care-summary">
      <view>
        <text class="summary-title">今天有 {{ todayCount }} 项养护任务</text>
        <text class="summary-note">
          {{
            overdueCount
              ? `另有 ${overdueCount} 项已逾期，可按植物状态处理`
              : '按植物状态养护，之后的安排也能提前查看'
          }}
        </text>
      </view>
      <view class="summary-leaf"><AppIcon name="pot" tone="sage" /></view>
    </view>
    <view class="segment care-tabs">
      <button :class="{ active: tab === 'pending' }" @click="tab = 'pending'">
        待完成
        <text class="count-badge">{{ tasks.filter((t) => t.status === 'pending').length }}</text>
      </button>
      <button :class="{ active: tab === 'done' }" @click="tab = 'done'">已处理</button>
    </view>
    <view v-if="!groups.length" class="empty-state">
      <AppIcon name="leaf" tone="sage" />
      <text class="empty-title">
        {{ tab === 'pending' ? '今天也照顾得很好' : '还没有处理记录' }}
      </text>
      <text>
        {{
          tab === 'pending' ? '添加下一次养护，陪它慢慢长大。' : '完成养护后，会在这里留下记录。'
        }}
      </text>
    </view>
    <view
      v-for="group in groups"
      :key="group.key"
      class="task-group"
      :class="'task-group-' + group.key"
    >
      <view class="task-group-heading">
        <text>{{ group.label }}</text>
        <text class="task-group-count">{{ group.tasks.length }} 项</text>
      </view>
      <view v-for="task in group.tasks" :key="task.id" class="task-card">
        <view class="task-main">
          <view class="task-photo"><PlantPhoto :src="findPlant(task.plantId).cover" /></view>
          <view class="task-copy">
            <text class="plant-name">{{ findPlant(task.plantId).name }}</text>
            <view class="task-type">
              <AppIcon
                :size="32"
                :name="
                  task.type === '浇水' ? 'water' : task.type === '修剪' ? 'scissors' : 'fertilizer'
                "
              />
              <text>{{ task.type }}</text>
            </view>
            <text class="task-period">
              {{ task.repeat ? `每 ${task.repeat} 天一次` : '仅这一次' }}
            </text>
            <text class="task-hint">{{ hints[task.type] || '按植物实际状态安排养护' }}</text>
          </view>
        </view>
        <view class="task-bottom">
          <view class="task-date" :class="{ 'is-overdue': group.key === 'overdue' }">
            <AppIcon name="clock" tone="muted" :size="26" />
            {{
              task.status === 'done'
                ? '完成于 ' + (task.completed || task.due).slice(5).replace('-', '月') + '日'
                : dateLabel(task.due)
            }}
          </view>
          <view v-if="task.status === 'pending'" class="task-actions">
            <button class="quiet" @click="$emit('skip', task.id)">跳过</button>
            <button class="quiet" @click="$emit('postpone', task.id)">稍后</button>
            <wd-button
              variant="plain"
              size="small"
              custom-class="sprout-task-button"
              @click="$emit('complete', task.id)"
            >
              <view class="button-content">
                <AppIcon name="check" :size="26" />
                <text>完成</text>
              </view>
            </wd-button>
          </view>
          <text v-else class="done-label">{{ task.status === 'done' ? '已完成' : '已跳过' }}</text>
        </view>
      </view>
    </view>
    <view class="add-task">
      <wd-button
        block
        size="large"
        variant="soft"
        custom-class="sprout-button sprout-button-soft"
        @click="$emit('add')"
      >
        <view class="button-content">
          <AppIcon name="plus" :size="34" />
          <text>添加任务</text>
        </view>
      </wd-button>
    </view>
    <text class="page-footnote">养护随植物状态调整，不必每次都按时浇水</text>
  </view>
</template>
