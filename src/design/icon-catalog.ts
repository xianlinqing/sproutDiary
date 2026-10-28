// 由 scripts/build-icons.cjs 生成，修改图形请编辑该脚本。
export const iconNames = ["leaf","calendar","user","camera","water","scissors","fertilizer","share","clock","plus","back","arrow","check","close","more","capsule","pot"] as const;
export type IconName = typeof iconNames[number];
export type IconTone = 'green' | 'muted' | 'sage' | 'white';
