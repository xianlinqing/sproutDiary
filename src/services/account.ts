import { ref } from 'vue';
import { photoReferences, mapStatePhotos } from '../domain/cloud-photos';
import { validateState, type DiaryState } from '../domain/model';
import { retryThrottled } from '../domain/network-retry';

export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const accountConfigured = Boolean(apiBase);
const SESSION_KEY = 'sprout-account-v1';
export const CLOUD_RECOVERY_KEY = 'sprout-before-cloud-restore-v1';
interface Session {
  token: string;
  user: { id: string };
}
let cached: Session | null = null;
try {
  const value = uni.getStorageSync(SESSION_KEY);
  if (value && typeof value.token === 'string' && typeof value.user?.id === 'string')
    cached = value;
} catch {
  /* 本地功能仍可使用 */
}
export const account = ref<Session | null>(cached);
export const cloudBusy = ref(false);
export const hasCloudRecovery = ref(Boolean(uni.getStorageSync(CLOUD_RECOVERY_KEY)));
const clearSession = () => {
  account.value = null;
  uni.removeStorageSync(SESSION_KEY);
};
function baseCheck() {
  if (!apiBase) throw Error('尚未配置后端地址，请先设置 VITE_API_BASE_URL');
  if (!/^https:\/\//.test(apiBase) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(apiBase))
    throw Error('后端地址必须使用 HTTPS，本地调试可用127.0.0.1');
}
export async function api<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  data?: Record<string, unknown>,
): Promise<T> {
  baseCheck();
  const r = await uni.request({
    url: apiBase + path,
    method,
    data,
    timeout: 15000,
    header: {
      'Content-Type': 'application/json',
      ...(account.value ? { Authorization: 'Bearer ' + account.value.token } : {}),
    },
  });
  if (r.statusCode < 200 || r.statusCode >= 300) {
    if (r.statusCode === 401) clearSession();
    const body = r.data as { message?: string };
    throw Error(body?.message || '服务请求失败，请稍后重试');
  }
  return r.data as T;
}
export async function wechatLogin() {
  baseCheck();
  // #ifndef MP-WEIXIN
  throw Error('请在微信小程序中登录，浏览器继续使用本地模式');
  // #endif
  // #ifdef MP-WEIXIN
  const { code } = await uni.login({ provider: 'weixin' });
  const result = await api<Session>('/v1/auth/wechat', 'POST', { code });
  uni.setStorageSync(SESSION_KEY, result);
  account.value = result;
  // #endif
}
export async function logout() {
  if (account.value) await api('/v1/auth/logout', 'POST');
  clearSession();
}
export interface CloudGarden {
  state: DiaryState;
  revision: number;
}
export const readCloud = () => api<CloudGarden>('/v1/garden');
export async function uploadGarden(state: DiaryState, revision: number) {
  if (!account.value) throw Error('请先微信登录');
  const cacheKey = 'sprout-photo-map-v1:' + apiBase + ':' + account.value.user.id;
  let cache: Record<string, string> = {};
  try {
    const stored = uni.getStorageSync(cacheKey);
    if (stored && typeof stored === 'object') cache = stored;
  } catch {
    /* 无缓存时仍能上传 */
  }
  const mapped = new Map<string, string>();
  for (const src of photoReferences(state)) {
    if (src.startsWith('plant:') || src.startsWith('media:')) continue;
    if (typeof cache[src] === 'string' && /^media:[a-f0-9-]{36}$/.test(cache[src])) {
      mapped.set(src, cache[src]);
      continue;
    }
    const r = await uni.uploadFile({
      url: apiBase + '/v1/media',
      filePath: src,
      name: 'file',
      timeout: 30000,
      header: { Authorization: 'Bearer ' + account.value.token },
    });
    if (r.statusCode === 401) clearSession();
    if (r.statusCode === 429) throw Error('照片上传较多，请一分钟后重试，已上传的照片会接续使用');
    if (r.statusCode !== 201) throw Error('照片上传未完成，请重新登录或检查照片大小');
    const data = JSON.parse(r.data) as { ref: string };
    mapped.set(src, data.ref);
    cache[src] = data.ref;
    try {
      uni.setStorageSync(cacheKey, cache);
    } catch {
      /* 服务端内容去重，重传不会占用新额度 */
    }
  }
  return api<CloudGarden>('/v1/garden', 'PUT', { state: mapStatePhotos(state, mapped), revision });
}
export async function downloadGarden(state: DiaryState) {
  const mapped = new Map<string, string>(),
    saved: string[] = [];
  try {
    for (const src of photoReferences(state)) {
      if (!src.startsWith('media:')) continue;
      if (!account.value) throw Error('登录已失效');
      const token = account.value.token;
      const r = await retryThrottled(
        () =>
          uni.downloadFile({
            url: apiBase + '/v1/media/' + src.slice(6),
            header: { Authorization: 'Bearer ' + token },
            timeout: 30000,
          }),
        async () => {
          for (let seconds = 61; seconds > 0; seconds--) {
            if (seconds % 10 === 1) uni.showLoading({ title: `恢复稍候 ${seconds}秒`, mask: true });
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          uni.showLoading({ title: '正在恢复照片', mask: true });
        },
      );
      if (r.statusCode === 401) clearSession();
      if (r.statusCode !== 200) throw Error('照片下载未完成，原本地记录仍保留');
      const result = await uni.saveFile({ tempFilePath: r.tempFilePath });
      saved.push(result.savedFilePath);
      mapped.set(src, result.savedFilePath);
    }
    return { state: validateState(mapStatePhotos(state, mapped)), saved };
  } catch (e) {
    await Promise.all(saved.map((filePath) => uni.removeSavedFile({ filePath }).catch(() => {})));
    throw e;
  }
}
