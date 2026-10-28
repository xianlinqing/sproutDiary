export type PhotoFit = 'cover' | 'contain';
export interface PhotoRect {
  width: number;
  height: number;
  left: number;
  top: number;
}
export interface PhotoViewport {
  index: number;
  scale: number;
  requestedScale: number;
  revision: number;
}
export type PhotoViewportAction =
  | { type: 'scale'; index: number; value: number }
  | { type: 'change'; index: number }
  | { type: 'reset' }
  | { type: 'prepare-enlarge' }
  | { type: 'enlarge' };
export function updatePhotoViewport(
  state: PhotoViewport,
  action: PhotoViewportAction,
): PhotoViewport {
  if (action.type === 'prepare-enlarge') return { ...state, requestedScale: state.scale };
  if (action.type === 'scale') {
    if (action.index !== state.index || !Number.isFinite(action.value)) return state;
    const scale = Math.max(1, Math.min(4, action.value));
    return scale === state.scale ? state : { ...state, scale };
  }
  if (action.type === 'enlarge') {
    const scale = Math.min(4, state.scale + 1);
    return { ...state, scale, requestedScale: scale };
  }
  if (action.type === 'change' && action.index === state.index) return state;
  return {
    index: action.type === 'change' ? action.index : state.index,
    scale: 1,
    requestedScale: 1,
    revision: state.revision + 1,
  };
}
// 独立的方形窗口隔离拼图相邻照片，contain 模式的留白也不会露出其他格子。
export function spriteGeometry(
  width: number,
  height: number,
  col: number,
  row: number,
  fit: PhotoFit = 'cover',
) {
  const side = Math.max(0, fit === 'contain' ? Math.min(width, height) : Math.max(width, height));
  return {
    window: { width: side, height: side, left: (width - side) / 2, top: (height - side) / 2 },
    image: { width: side * 2, height: side * 2, left: -col * side, top: -row * side },
  };
}
