import type { Entry, Plant } from '../domain/model';
import { daysSince } from '../domain/model';
import { createPosterLayout, wrapPosterText, type PosterLayout } from '../domain/poster-layout';
declare const wx: {
  showShareImageMenu: (options: {
    path: string;
    fail: (error: { errMsg: string }) => void;
  }) => void;
};

export async function renderPoster(
  plant: Plant,
  entries: Entry[],
  component: unknown,
  plan: PosterLayout = createPosterLayout(entries),
): Promise<string> {
  const ctx = uni.createCanvasContext('growthCanvas', component);
  const { height } = plan;
  ctx.setFillStyle('#faf8ef');
  ctx.fillRect(0, 0, 750, height);
  ctx.setStrokeStyle('#d8ddcd');
  ctx.setLineWidth(2);
  ctx.strokeRect(22, 22, 706, height - 44);
  // 与页面使用同一个原创小芽，避免导出图形与预览图标不一致。
  const sprout = await uni.getImageInfo({ src: '/static/icons/leaf-sage.png' });
  // 微信 getImageInfo 可能返回 static/...，画布在组件内会按组件目录解析相对路径。
  const canvasPath = (path: string) => (path.startsWith('static/') ? '/' + path : path);
  ctx.drawImage(canvasPath(sprout.path), 331, 32, 88, 88);
  ctx.setFillStyle('#23472d');
  ctx.setFontSize(42);
  ctx.setTextAlign('center');
  ctx.fillText('一颗种子的成长', 375, 164);
  ctx.setFontSize(23);
  const caption =
    wrapPosterText(`${plant.name} · 成长 ${daysSince(plant.date)} 天`, 620, 23, 1)[0] || '';
  ctx.fillText(caption, 375, 210);
  ctx.setTextAlign('left');
  if (plan.rows.length) {
    ctx.setStrokeStyle('#8da17a');
    ctx.setLineWidth(2);
    ctx.beginPath();
    ctx.moveTo(70, plan.rows[0].y + 8);
    const last = plan.rows[plan.rows.length - 1];
    ctx.lineTo(70, last.y + last.height - 44);
    ctx.stroke();
  }
  for (const row of plan.rows) {
    const e = row.entry;
    const y = row.y;
    ctx.setFillStyle('#608654');
    ctx.beginPath();
    ctx.arc(70, y + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.setFillStyle('#426244');
    ctx.setFontSize(22);
    ctx.fillText(e.date.split('-').join(' / '), 100, y + 15);
    ctx.setFillStyle('#ffe1b9');
    ctx.fillRect(100, y + 32, Math.max(70, Array.from(row.stage).length * 22 + 28), 38);
    ctx.setFillStyle('#80502c');
    ctx.setFontSize(22);
    ctx.fillText(row.stage, 114, y + 59);
    ctx.setFillStyle('#23472d');
    ctx.setFontSize(26);
    row.titleLines.forEach((line, n) => ctx.fillText(line, 100, row.titleY + n * 36));
    ctx.setFillStyle('#657063');
    ctx.setFontSize(22);
    row.textLines.forEach((line, n) => ctx.fillText(line, 100, row.textY + n * 32));
    if (row.image) {
      const src = e.photos[0];
      const tile = src.startsWith('plant:');
      const image = await uni.getImageInfo({ src: tile ? '/static/plants.png' : src });
      const target = row.image;
      if (tile) {
        const offsets: Record<string, number[]> = {
          tomato: [0, 0],
          jasmine: [1, 0],
          mint: [0, 1],
          monstera: [1, 1],
        };
        const pos = offsets[src.slice(6)] || [1, 1];
        ctx.drawImage(
          canvasPath(image.path),
          (pos[0] * image.width) / 2,
          (pos[1] * image.height) / 2,
          image.width / 2,
          image.height / 2,
          target.x,
          target.y,
          target.width,
          target.height,
        );
      } else {
        const side = Math.min(image.width, image.height);
        ctx.drawImage(
          canvasPath(image.path),
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          target.x,
          target.y,
          target.width,
          target.height,
        );
      }
    }
  }
  ctx.setTextAlign('center');
  ctx.setFillStyle('#536b46');
  ctx.setFontSize(23);
  ctx.fillText('小小的种子，也能长出大大的惊喜。', 375, height - 60);
  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()));
  return new Promise<string>((resolve, reject) =>
    uni.canvasToTempFilePath(
      {
        canvasId: 'growthCanvas',
        width: 750,
        height,
        destWidth: 750,
        destHeight: height,
        fileType: 'png',
        quality: 1,
        success: (result) => resolve(result.tempFilePath),
        fail: reject,
      },
      component,
    ),
  );
}
export async function savePoster(path: string) {
  // #ifdef H5
  const blob = await (await fetch(path)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '植物成长日记.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  // #endif
  // #ifndef H5
  await uni.saveImageToPhotosAlbum({ filePath: path });
  // #endif
}
export async function sharePoster(path: string) {
  // #ifdef H5
  const blob = await (await fetch(path)).blob();
  const file = new File([blob], '植物成长日记.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }))
    await navigator.share({ files: [file], title: '我的植物成长日记' });
  else {
    await savePoster(path);
    uni.showModal({
      title: '长图已下载',
      content: '把下载的图片发送给朋友，就可以分享植物的成长故事。',
      showCancel: false,
    });
  }
  // #endif
  // #ifndef H5
  wx.showShareImageMenu({
    path,
    fail: (e) =>
      uni.showToast({
        title: e.errMsg.includes('cancel') ? '已取消分享' : '分享未完成，请先保存图片',
        icon: 'none',
      }),
  });
  // #endif
}
