<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBackPress, onShow } from '@dcloudio/uni-app';
import { useDiary } from '../../stores/diary';
import type { PlantInput, EntryInput, TaskInput } from '../../domain/model';
import {
  notify,
  confirm,
  downloadFile,
  collectOrphanPhotos,
  pausePhotoCleanup,
} from '../../services/media';
import PlantList from '../../components/PlantList.vue';
import PlantDetail from '../../components/PlantDetail.vue';
import CareTasks from '../../components/CareTasks.vue';
import ProfilePage from '../../components/ProfilePage.vue';
import RecordForm from '../../components/RecordForm.vue';
import SharePoster from '../../components/SharePoster.vue';
import AppIcon from '../../components/AppIcon.vue';
import PhotoViewer from '../../components/PhotoViewer.vue';
import {
  account,
  accountConfigured,
  cloudBusy,
  hasCloudRecovery,
  CLOUD_RECOVERY_KEY,
  wechatLogin,
  logout,
  readCloud,
  uploadGarden,
  downloadGarden,
} from '../../services/account';
const diary = useDiary();
async function cloudAction(action: () => Promise<void>) {
  if (cloudBusy.value) return;
  cloudBusy.value = true;
  const resumeCleanup = pausePhotoCleanup();
  try {
    await action();
  } catch (e) {
    notify(e instanceof Error ? e.message : '网络连接失败，请稍后重试');
  } finally {
    uni.hideLoading();
    cloudBusy.value = false;
    resumeCleanup();
  }
}
function loginAccount() {
  return cloudAction(async () => {
    uni.showLoading({ title: '正在微信登录', mask: true });
    await wechatLogin();
    notify('已登录，本地记录尚未上传');
  });
}
function logoutAccount() {
  return cloudAction(async () => {
    if (
      await confirm(
        '退出账号',
        '本地植物记录会保留。其他人使用这台设备前，请先导出或处理本地数据。',
      )
    ) {
      await logout();
      notify('已退出登录');
    }
  });
}
function backupCloud() {
  return cloudAction(async () => {
    const snapshot = JSON.parse(diary.backup());
    const cloud = await readCloud();
    if (
      !(await confirm(
        '备份到账号',
        `将上传本机 ${snapshot.plants.length} 株植物及照片，替换账号现有的 ${cloud.state.plants.length} 株植物记录。此后本地修改仍需手动备份。`,
      ))
    )
      return;
    uni.showLoading({ title: '正在备份照片', mask: true });
    await uploadGarden(snapshot, cloud.revision);
    notify('账号备份完成');
  });
}
function restoreCloud() {
  return cloudAction(async () => {
    const cloud = await readCloud();
    if (
      !(await confirm(
        '从账号恢复',
        `账号内有 ${cloud.state.plants.length} 株植物。恢复会替换本机记录，当前本机记录将保留一份供撤销。`,
      ))
    )
      return;
    uni.showLoading({ title: '正在恢复照片', mask: true });
    const previous = diary.backup();
    const downloaded = await downloadGarden(cloud.state);
    try {
      uni.setStorageSync(CLOUD_RECOVERY_KEY, previous);
      hasCloudRecovery.value = true;
      diary.recover((s) => s.restore(downloaded.state));
    } catch (e) {
      await Promise.all(
        downloaded.saved.map((filePath) => uni.removeSavedFile({ filePath }).catch(() => {})),
      );
      throw e;
    }
    selected.value = '';
    notify('已恢复账号记录，可撤销本次恢复');
  });
}
function undoCloudRestore() {
  return cloudAction(async () => {
    if (
      !(await confirm(
        '撤销上次云恢复',
        '将用恢复前保留的本地记录替换当前本地记录，账号备份不受影响。',
      ))
    )
      return;
    const raw = uni.getStorageSync(CLOUD_RECOVERY_KEY);
    if (!raw) throw Error('没有可撤销的记录');
    diary.recover((s) => s.restore(JSON.parse(raw)));
    uni.removeStorageSync(CLOUD_RECOVERY_KEY);
    hasCloudRecovery.value = false;
    selected.value = '';
    notify('已恢复原本地记录');
  });
}
type Screen = 'plants' | 'detail' | 'care' | 'profile' | 'poster';
const screen = ref<Screen>('plants');
const modal = ref<'plant' | 'entry' | 'task' | null>(null);
const selected = ref('');
const editing = ref(false);
const photoPreview = ref<{ photos: string[]; start: number } | null>(null);
const posterRef = ref<InstanceType<typeof SharePoster> | null>(null);
function openPreview(photos: string[], start: number) {
  if (photos.length) photoPreview.value = { photos, start };
}
const currentPlant = computed(() => diary.state.plants.find((p) => p.id === selected.value));
const entries = computed(() =>
  diary.state.entries
    .filter((e) => e.plantId === selected.value)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date)),
);
const title = computed(() =>
  screen.value === 'detail' ? '成长日记' : screen.value === 'poster' ? '成长长图' : '植物日记',
);
const statusHeight = ref(0);
// #ifdef MP-WEIXIN
statusHeight.value = uni.getWindowInfo().statusBarHeight || 24;
// #endif
function navigate(to: Screen) {
  screen.value = to;
  uni.pageScrollTo({ scrollTop: 0, duration: 0 });
}
function closeForm() {
  modal.value = null;
  if (!diary.error) collectOrphanPhotos(() => diary.state, true);
}
function back() {
  if (posterRef.value?.closePreview()) return true;
  if (photoPreview.value) {
    photoPreview.value = null;
    return true;
  }
  if (modal.value) {
    closeForm();
    return true;
  }
  if (screen.value === 'poster') {
    navigate('detail');
    return true;
  }
  if (screen.value === 'detail') {
    navigate('plants');
    return true;
  }
  return false;
}
onBackPress(() => back());
onShow(() => {
  if (diary.error) notify(diary.error);
  else collectOrphanPhotos(() => diary.state);
});
function openPlant(id: string) {
  selected.value = id;
  navigate('detail');
}
function openForm(kind: 'plant' | 'entry' | 'task', edit = false) {
  if (kind !== 'plant' && !diary.state.plants.length) {
    notify('先添加一株植物，再记录成长或养护');
    return;
  }
  editing.value = edit;
  modal.value = kind;
}
function action(fn: () => void, message: string) {
  try {
    fn();
    if (!diary.error) collectOrphanPhotos(() => diary.state, modal.value === null);
    notify(message);
  } catch (e) {
    notify(e instanceof Error ? e.message : '保存失败，请检查存储空间');
  }
}
function savePlant(data: PlantInput) {
  action(() => {
    diary.run((s) =>
      editing.value && currentPlant.value
        ? s.updatePlant(currentPlant.value.id, data)
        : s.addPlant(data),
    );
    modal.value = null;
  }, '植物档案已保存');
}
function saveEntry(data: EntryInput) {
  action(() => {
    diary.run((s) => s.addEntry(data));
    modal.value = null;
    selected.value = data.plantId;
    navigate('detail');
  }, '成长记录已保存');
}
function saveTask(data: TaskInput) {
  action(() => {
    diary.run((s) => s.addTask(data));
    modal.value = null;
  }, '养护任务已添加');
}
let photoBackupNote = '请先导出备份。';
// #ifndef H5
photoBackupNote = '备份不包含照片文件，清理后无法通过备份恢复照片，请先另存相册。';
// #endif
async function removePlant() {
  if (!currentPlant.value) return;
  if (await confirm('删除植物', '这株植物的所有日记、相册和养护任务也会删除。' + photoBackupNote))
    action(() => {
      diary.run((s) => s.deletePlant(selected.value));
      modal.value = null;
      navigate('plants');
    }, '已删除植物');
}
async function removeEntry(id: string) {
  if (await confirm('删除这条记录', '删除后无法恢复。' + photoBackupNote))
    action(() => {
      diary.run((s) => s.deleteEntry(id));
    }, '记录已删除');
}
async function backup() {
  let json: string;
  try {
    json = diary.backup();
  } catch (e) {
    notify(String(e));
    return;
  }
  const backupName = diary.error ? 'SproutDiary-原始缓存.txt' : 'SproutDiary-备份.json';
  // #ifdef H5
  downloadFile(json, backupName, 'application/json');
  notify('备份已下载');
  // #endif
  // #ifndef H5
  if (
    !(await confirm(
      '导出文字与照片路径',
      '此备份不含照片文件。删除、清空或更换设备后无法靠它恢复照片，重要照片请先另存相册。',
    ))
  )
    return;
  await uni.setClipboardData({ data: json });
  notify('备份已复制，请粘贴到文件保存');
  // #endif
}
async function restore() {
  // #ifdef H5
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (await confirm('导入备份', '将替换当前设备的植物和记录，建议先导出现有备份。'))
        action(() => {
          diary.recover((s) => s.restore(data));
          selected.value = '';
        }, '备份已导入');
    } catch (e) {
      notify('导入失败，请选择有效的备份文件');
    }
  };
  input.click();
  // #endif
  // #ifndef H5
  const dialog = await uni.showModal({
    title: '导入备份',
    content: '',
    editable: true,
    placeholderText: '请粘贴之前导出的备份JSON',
    confirmText: '导入',
    confirmColor: '#3e6849',
  });
  if (dialog.confirm) {
    try {
      const data = JSON.parse(dialog.content || '');
      if (await confirm('替换当前数据', '导入将覆盖现有记录。' + photoBackupNote))
        action(() => {
          diary.recover((s) => s.restore(data));
          selected.value = '';
        }, '备份已导入');
    } catch (e) {
      notify('备份格式不正确');
    }
  }
  // #endif
}
async function clear() {
  if (
    await confirm(
      '清空本地数据',
      '所有植物、日记、任务和云恢复前的本地副本都会清空，账号备份不受影响。' + photoBackupNote,
    )
  )
    action(() => {
      diary.recover((s) => s.clear());
      uni.removeStorageSync(CLOUD_RECOVERY_KEY);
      hasCloudRecovery.value = false;
      selected.value = '';
    }, '本地数据已清空');
}
async function seed() {
  if (await confirm('恢复示例花园', '将用四株示例植物替换当前数据。' + photoBackupNote))
    action(() => {
      diary.recover((s) => s.seed());
      selected.value = '';
    }, '示例花园已恢复');
}
</script>
<template>
  <view class="app-shell">
    <view class="app-nav" :style="{ paddingTop: statusHeight + 'px' }">
      <view class="nav-row">
        <button
          v-if="screen === 'detail' || screen === 'poster'"
          class="nav-back"
          aria-label="返回"
          @click="back"
        >
          <AppIcon name="back" />
        </button>
        <text class="nav-title">{{ screen === 'detail' || screen === 'poster' ? title : '' }}</text>
        <!-- #ifdef H5 -->
        <view class="wechat-capsule">
          <AppIcon name="more" :size="42" />
          <view class="capsule-divider" />
          <AppIcon name="capsule" :size="38" />
        </view>
        <!-- #endif -->
      </view>
    </view>
    <view v-if="diary.error" class="error-banner">
      {{ diary.error }} 请保留原有缓存，暂勿清理。
    </view>
    <PlantList
      v-if="screen === 'plants'"
      :plants="diary.state.plants"
      @open="openPlant"
      @add="openForm('plant')"
    />
    <PlantDetail
      v-if="screen === 'detail' && currentPlant"
      :key="currentPlant.id"
      :plant="currentPlant"
      :entries="entries"
      @add="openForm('entry')"
      @edit="openForm('plant', true)"
      @share="navigate('poster')"
      @preview="openPreview"
      @delete-entry="removeEntry"
    />
    <CareTasks
      v-if="screen === 'care'"
      :plants="diary.state.plants"
      :tasks="diary.state.tasks"
      @add="openForm('task')"
      @complete="
        (id) =>
          action(() => {
            diary.run((s) => s.completeTask(id));
          }, '养护完成，已记入成长日记')
      "
      @postpone="
        (id) =>
          action(() => {
            diary.run((s) => s.postpone(id));
          }, '已推迟到下一天')
      "
      @skip="
        (id) =>
          action(() => {
            diary.run((s) => s.skip(id));
          }, '已跳过本次养护')
      "
    />
    <ProfilePage
      v-if="screen === 'profile'"
      :state="diary.state"
      :logged-in="Boolean(account)"
      :account-configured="accountConfigured"
      :cloud-busy="cloudBusy"
      :can-undo="hasCloudRecovery"
      @login="loginAccount"
      @logout="logoutAccount"
      @cloud-backup="backupCloud"
      @cloud-restore="restoreCloud"
      @undo-cloud="undoCloudRestore"
      @backup="backup"
      @restore="restore"
      @clear="clear"
      @seed="seed"
    />
    <SharePoster
      ref="posterRef"
      v-if="screen === 'poster' && currentPlant"
      :plant="currentPlant"
      :entries="entries"
    />
    <view v-if="['plants', 'care', 'profile'].includes(screen)" class="bottom-nav">
      <button :class="{ active: screen === 'plants' }" @click="navigate('plants')">
        <AppIcon name="leaf" :tone="screen === 'plants' ? 'green' : 'muted'" />
        <text>我的植物</text>
      </button>
      <button :class="{ active: screen === 'care' }" @click="navigate('care')">
        <AppIcon name="calendar" :tone="screen === 'care' ? 'green' : 'muted'" />
        <text>今日养护</text>
      </button>
      <button :class="{ active: screen === 'profile' }" @click="navigate('profile')">
        <AppIcon name="user" :tone="screen === 'profile' ? 'green' : 'muted'" />
        <text>我的</text>
      </button>
    </view>
    <RecordForm
      v-if="modal"
      :kind="modal"
      :plants="diary.state.plants"
      :plant="modal === 'entry' || (modal === 'plant' && editing) ? currentPlant : undefined"
      @close="closeForm"
      @plant="savePlant"
      @entry="saveEntry"
      @task="saveTask"
      @delete-plant="removePlant"
    />
    <PhotoViewer
      v-if="photoPreview"
      :photos="photoPreview.photos"
      :start="photoPreview.start"
      @close="photoPreview = null"
    />
  </view>
</template>
