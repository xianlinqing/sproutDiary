<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { Plant, PlantInput, EntryInput, TaskInput } from '../domain/model';
import { today } from '../domain/model';
import { choosePhotos, notify } from '../services/media';
import PlantPhoto from './PlantPhoto.vue';
import AppIcon from './AppIcon.vue';
import SproutInput from './SproutInput.vue';
const props = defineProps<{ kind: 'plant' | 'entry' | 'task'; plants: Plant[]; plant?: Plant }>();
const emit = defineEmits<{
  close: [];
  plant: [data: PlantInput];
  entry: [data: EntryInput];
  task: [data: TaskInput];
  deletePlant: [];
}>();
const form = reactive({
  name: props.plant?.name || '',
  species: props.plant?.species || '',
  location: props.plant?.location || '',
  date: props.kind === 'plant' ? props.plant?.date || today() : today(),
  cover: props.plant?.cover || 'plant:monstera',
  plantId: props.plant?.id || props.plants[0]?.id || '',
  title: '',
  text: '',
  photos: [] as string[],
  stage: '日常',
  type: '浇水',
  repeat: 0,
});
const stages = ['日常', '播种', '发芽', '长叶', '开花', '结果'];
const types = ['浇水', '施肥', '修剪', '换盆'];
const busy = ref(false);
const plantIndex = ref(
  Math.max(
    0,
    props.plants.findIndex((p) => p.id === form.plantId),
  ),
);
function selectPlant(e: { detail: { value: string | number } }) {
  plantIndex.value = Number(e.detail.value);
  form.plantId = props.plants[plantIndex.value].id;
}
async function photo() {
  if (busy.value) return;
  busy.value = true;
  try {
    const paths = await choosePhotos(props.kind === 'plant' ? 1 : 6 - form.photos.length);
    if (props.kind === 'plant') form.cover = paths[0];
    else form.photos.push(...paths);
  } catch (e) {
    const message = String((e as { errMsg?: string }).errMsg || e);
    if (!message.includes('cancel')) notify(message);
  } finally {
    busy.value = false;
  }
}
function save() {
  if (busy.value) return;
  if (props.kind === 'plant')
    emit('plant', {
      name: form.name,
      species: form.species,
      location: form.location,
      date: form.date,
      cover: form.cover,
    });
  if (props.kind === 'entry')
    emit('entry', {
      plantId: form.plantId,
      date: form.date,
      title: form.title,
      text: form.text,
      photos: form.photos,
      stage: form.stage,
    });
  if (props.kind === 'task')
    emit('task', {
      plantId: form.plantId,
      due: form.date,
      type: form.type,
      repeat: Number(form.repeat),
    });
}
</script>
<template>
  <wd-popup
    :model-value="true"
    position="bottom"
    :z-index="100"
    :duration="180"
    custom-class="sprout-popup"
    modal-style="background:rgba(27,44,36,0.4)"
    @close="$emit('close')"
  >
    <view class="form-sheet">
      <view class="sheet-head">
        <text class="sheet-title">
          {{
            kind === 'plant'
              ? plant
                ? '编辑植物档案'
                : '添加植物'
              : kind === 'entry'
                ? '记录今天的成长'
                : '添加养护任务'
          }}
        </text>
        <button class="close-button" aria-label="关闭" @click="$emit('close')">
          <AppIcon name="close" tone="muted" :size="32" />
        </button>
      </view>
      <scroll-view scroll-y class="form-scroll">
        <view class="form-fields">
          <template v-if="kind === 'plant'">
            <button class="cover-picker" @click="photo">
              <PlantPhoto :src="form.cover" />
              <view class="cover-label">
                <AppIcon name="camera" tone="white" />
                {{ busy ? '正在保存照片…' : '更换封面照片' }}
              </view>
            </button>
            <text class="field-label">植物昵称 *</text>
            <SproutInput v-model="form.name" :maxlength="30" placeholder="例如：阳台的小番茄" />
            <text class="field-label">植物品种</text>
            <SproutInput v-model="form.species" :maxlength="40" placeholder="例如：樱桃番茄" />
            <text class="field-label">摆放位置</text>
            <SproutInput v-model="form.location" :maxlength="40" placeholder="例如：南向阳台" />
          </template>
          <template v-else>
            <text class="field-label">选择植物 *</text>
            <picker :range="plants" range-key="name" :value="plantIndex" @change="selectPlant">
              <view class="field picker-field">
                {{ plants[plantIndex]?.name || '请先添加一株植物' }}
                <AppIcon name="arrow" tone="muted" />
              </view>
            </picker>
          </template>
          <text class="field-label">
            {{ kind === 'plant' ? '种植日期' : kind === 'entry' ? '记录日期' : '养护日期' }} *
          </text>
          <picker
            mode="date"
            :value="form.date"
            :end="kind === 'task' ? '2099-12-31' : today()"
            :start="kind === 'entry' ? plants[plantIndex]?.date : '2000-01-01'"
            @change="form.date = String($event.detail.value)"
          >
            <view class="field picker-field">
              {{ form.date }}
              <AppIcon name="calendar" tone="muted" />
            </view>
          </picker>
          <template v-if="kind === 'entry'">
            <text class="field-label">成长阶段</text>
            <view class="stage-options">
              <button
                v-for="stage in stages"
                :key="stage"
                class="stage-choice"
                :class="{ selected: form.stage === stage }"
                @click="form.stage = stage"
              >
                {{ stage }}
              </button>
            </view>
            <text class="field-label">今天的小变化</text>
            <SproutInput v-model="form.title" :maxlength="60" placeholder="给今天的记录起个名字" />
            <wd-textarea
              v-model="form.text"
              custom-class="sprout-textarea"
              :maxlength="1000"
              show-word-limit
              placeholder="新叶、花苞，或只是今天的阳光……"
            />
            <view class="photo-picker-grid">
              <view v-for="(src, i) in form.photos" :key="i" class="chosen-photo">
                <PlantPhoto :src="src" />
                <button
                  class="remove-photo"
                  :aria-label="`移除第${i + 1}张照片`"
                  @click="form.photos.splice(i, 1)"
                >
                  <AppIcon name="close" tone="muted" :size="24" />
                </button>
              </view>
              <button v-if="form.photos.length < 6" class="choose-photo" @click="photo">
                <AppIcon name="camera" tone="sage" />
                <text>{{ busy ? '处理中…' : '添加照片' }}</text>
                <text>{{ form.photos.length }} / 6</text>
              </button>
            </view>
          </template>
          <template v-if="kind === 'task'">
            <text class="field-label">养护类型</text>
            <view class="stage-options">
              <button
                v-for="type in types"
                :key="type"
                class="stage-choice"
                :class="{ selected: form.type === type }"
                @click="form.type = type"
              >
                {{ type }}
              </button>
            </view>
            <text class="field-label">重复间隔（天）</text>
            <SproutInput v-model="form.repeat" type="number" placeholder="0 表示仅这一次" />
            <text class="helper">0 表示仅这一次；完成或跳过后，从当天起计算下次日期。</text>
            <text v-if="form.type === '浇水'" class="helper">
              浇水前先检查土壤，根据植物状态决定是否需要浇水。
            </text>
          </template>
          <text class="local-note">照片与记录仅保存在当前设备，重要照片请同时保存在系统相册。</text>
          <button
            v-if="kind === 'plant' && plant"
            class="danger-link"
            @click="$emit('deletePlant')"
          >
            删除这株植物及其记录
          </button>
        </view>
      </scroll-view>
      <view class="sheet-footer">
        <wd-button
          block
          size="large"
          custom-class="sprout-button"
          :loading="busy"
          :disabled="busy || (kind !== 'plant' && !plants.length)"
          @click="save"
        >
          {{
            busy
              ? '正在处理照片…'
              : '保存' + (kind === 'plant' ? '档案' : kind === 'entry' ? '记录' : '任务')
          }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
