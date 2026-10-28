import type { Entry } from './model';
function textWidth(text: string, fontSize: number) {
  return Array.from(text).reduce(
    (n, c) =>
      n +
      fontSize *
        (/[MW@#%]/.test(c)
          ? 0.95
          : /[ilI.,:;!'| ]/.test(c)
            ? 0.34
            : /[\x00-\xff]/.test(c)
              ? 0.65
              : 1),
    0,
  );
}
export function wrapPosterText(
  text: string,
  width: number,
  fontSize: number,
  maxLines = 8,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()) {
    if (char === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    if (line && textWidth(line + char, fontSize) > width) {
      lines.push(line);
      line = '';
    }
    line += char;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const shortened = lines.slice(0, maxLines);
  let last = shortened[maxLines - 1];
  while (last && textWidth(last + '…', fontSize) > width)
    last = Array.from(last).slice(0, -1).join('');
  shortened[maxLines - 1] = last + '…';
  return shortened;
}
export interface PosterRow {
  entry: Entry;
  y: number;
  height: number;
  titleLines: string[];
  textLines: string[];
  titleY: number;
  textY: number;
  stage: string;
  image?: { x: number; y: number; width: number; height: number };
}
export interface PosterLayout {
  width: number;
  height: number;
  rows: PosterRow[];
}
export function createPosterLayout(entries: readonly Entry[]): PosterLayout {
  let cursor = 270;
  const rows = entries.map((entry) => {
    const hasPhoto = entry.photos.length > 0;
    const width = hasPhoto ? 300 : 570;
    const titleLines = wrapPosterText(entry.title || entry.stage, width, 26, 2);
    const chars = Array.from(entry.text);
    const excerpt = chars.slice(0, 160).join('') + (chars.length > 160 ? '…' : '');
    const textLines = wrapPosterText(excerpt, width, 22, 8);
    const titleY = cursor + 104;
    const textY = titleY + Math.max(0, titleLines.length - 1) * 36 + 42;
    const textBottom = textLines.length
      ? textY + (textLines.length - 1) * 32 + 8
      : titleY + Math.max(0, titleLines.length - 1) * 36 + 10;
    const image = hasPhoto ? { x: 440, y: cursor + 32, width: 230, height: 230 } : undefined;
    const bottom = Math.max(textBottom, image ? image.y + image.height : 0);
    const height = Math.ceil(bottom - cursor + 44);
    const stage =
      Array.from(entry.stage).slice(0, 8).join('') +
      (Array.from(entry.stage).length > 8 ? '…' : '');
    const row = { entry, y: cursor, height, titleLines, textLines, titleY, textY, stage, image };
    cursor += height;
    return row;
  });
  return { width: 750, height: Math.max(380, cursor + 110), rows };
}
