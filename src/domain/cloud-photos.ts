import type { DiaryState } from './model';
export function photoReferences(state: DiaryState): string[] {
  return [
    ...new Set([...state.plants.map((p) => p.cover), ...state.entries.flatMap((e) => e.photos)]),
  ];
}
export function mapStatePhotos(state: DiaryState, replacements: Map<string, string>): DiaryState {
  const replace = (src: string) => replacements.get(src) || src;
  return {
    ...state,
    plants: state.plants.map((p) => ({ ...p, cover: replace(p.cover) })),
    entries: state.entries.map((e) => ({ ...e, photos: e.photos.map(replace) })),
    tasks: state.tasks.map((t) => ({ ...t })),
  };
}
