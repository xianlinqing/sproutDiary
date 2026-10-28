import { orphanPhotoPaths, type DiaryState } from '../domain/model';
const drafts = new Set<string>();
let draftSession = 0;
let cleanupQueue = Promise.resolve();
let cleanupPauses = 0;
export function pausePhotoCleanup() {
  cleanupPauses++;
  return () => {
    cleanupPauses = Math.max(0, cleanupPauses - 1);
  };
}
export function collectOrphanPhotos(getState: () => DiaryState, discardDrafts = false) {
  // #ifndef H5
  if (discardDrafts) {
    draftSession++;
    drafts.clear();
  }
  cleanupQueue = cleanupQueue
    .then(async () => {
      if (cleanupPauses) return;
      const saved = await uni.getSavedFileList();
      if (cleanupPauses) return;
      const protectedPhotos: string[] = [];
      try {
        const raw = uni.getStorageSync('sprout-before-cloud-restore-v1');
        if (raw) {
          const s = JSON.parse(raw) as DiaryState;
          protectedPhotos.push(
            ...s.plants.map((p) => p.cover),
            ...s.entries.flatMap((e) => e.photos),
          );
        }
      } catch {
        /* 损坏备份不参与清理 */
      }
      const orphaned = orphanPhotoPaths(
        getState(),
        saved.fileList.map((file) => file.filePath),
        [...drafts, ...protectedPhotos],
      );
      await Promise.all(orphaned.map((filePath) => uni.removeSavedFile({ filePath })));
    })
    .catch((e) => {
      console.warn('未引用照片清理未完成，将在下次打开时重试', e);
    });
  // #endif
}
export async function choosePhotos(count = 1): Promise<string[]> {
  const session = draftSession;
  const result = await uni.chooseImage({
    count,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
  });
  const paths = result.tempFilePaths as string[];
  return Promise.all(
    paths.map(async (path) => {
      // #ifdef H5
      const blob = await (await fetch(path)).blob();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error('照片读取失败'));
        reader.readAsDataURL(blob);
      });
      return await new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(Error('照片处理失败'));
            return;
          }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        image.onerror = () => reject(Error('暂不支持这种图片格式'));
        image.src = data;
      });
      // #endif
      // #ifndef H5
      const compressed = await uni.compressImage({ src: path, quality: 75 });
      const saved = await uni.saveFile({ tempFilePath: compressed.tempFilePath });
      if (session !== draftSession) {
        await uni.removeSavedFile({ filePath: saved.savedFilePath });
        throw { errMsg: 'cancel' };
      }
      drafts.add(saved.savedFilePath);
      return saved.savedFilePath;
      // #endif
    }),
  );
}
export function notify(message: string) {
  uni.showToast({ title: message, icon: 'none', duration: 2400 });
}
export async function confirm(title: string, content: string) {
  const result = await uni.showModal({
    title,
    content,
    confirmText: '确认',
    confirmColor: '#3e6849',
  });
  return result.confirm;
}
export function downloadFile(data: BlobPart, name: string, type: string) {
  // #ifdef H5
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  // #endif
}
