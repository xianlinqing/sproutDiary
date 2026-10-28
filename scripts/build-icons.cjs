const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

// 原创 32 × 32 图标：统一圆角笔触，图形本身表达植物养护用途。
const designs = {
  leaf: `<path d="M16 28c1-8-1-13-5-18M16 20c2-4 5-7 9-9" fill="none"/><path d="M13 17C5 17 4 10 5 5c7 0 12 4 8 12Z" fill="SOFT"/><path d="M18 17C16 9 23 5 28 5c1 7-3 13-10 12Z" fill="SOFT"/><path d="M8 9c3 2 5 5 6 8M24 9c-3 2-5 4-7 9" fill="none"/>`,
  calendar: `<rect x="5" y="7" width="22" height="22" rx="5" fill="PAPER"/><path d="M5 14h22M11 4v6M21 4v6" fill="none"/><path d="M10 19h2M10 24h2M16 19h2" fill="none"/><path d="M20 26c-1-5 2-7 5-7 0 4-1 7-5 7Z" fill="SOFT"/><path d="m19 28 4-6" fill="none"/>`,
  user: `<circle cx="15" cy="10" r="5" fill="PAPER"/><path d="M5 28v-2c0-6 4-10 10-10s10 4 10 10v2Z" fill="SOFT"/><path d="M21 21c0-5 4-6 7-5 0 4-2 6-7 5Z" fill="PAPER"/><path d="m21 22 4-4" fill="none"/>`,
  camera: `<path d="m10 9 2-4h8l2 4" fill="SOFT"/><rect x="3.5" y="9" width="25" height="19" rx="5" fill="PAPER"/><circle cx="16" cy="18.5" r="6" fill="SOFT"/><path d="M13 17c.5-1.5 2-2 3-2" fill="none"/><circle cx="25" cy="12.5" r=".8" fill="INK" stroke="none"/>`,
  water: `<path d="M8 13h14l-1.5 13c-4 2-7.5 2-11 0Z" fill="SOFT"/><path d="M22 14c9-6 10 10 0 8M8 17l-5-5 3-3 4 6M2.5 19v2M5 23v2" fill="none"/><path d="M14 23c-2-4 0-6 4-6 0 4-1 6-4 6Z" fill="PAPER"/><path d="m14 24 2-4" fill="none"/>`,
  scissors: `<path d="m13 18 9-13c3 6-1 10-6 15M18 18 10 5c-3 6 1 10 6 15" fill="PAPER"/><circle cx="9" cy="24" r="4.5" fill="SOFT"/><circle cx="23" cy="24" r="4.5" fill="SOFT"/><path d="m12 21 4-5 4 5" fill="none"/><circle cx="16" cy="16" r="1.4" fill="WARM"/>`,
  fertilizer: `<rect x="11" y="3" width="10" height="5" rx="1.5" fill="WARM"/><path d="M12 8v3l-4 4v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V15l-4-4V8" fill="PAPER"/><rect x="10" y="16" width="12" height="9" rx="2" fill="SOFT"/><path d="M16 24v-5m0 3c-4 0-4-3-4-3 4 0 4 3 4 3Zm0-1c4 0 4-3 4-3-4 0-4 3-4 3Z" fill="none"/>`,
  share: `<path d="M9 15H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-3" fill="SOFT"/><path d="M16 21V4m-6 6 6-6 6 6" fill="none"/><path d="M8 24h3" fill="none"/>`,
  clock: `<circle cx="16" cy="16" r="12" fill="PAPER"/><path d="M16 4a12 12 0 0 1 12 12H16Z" fill="SOFT" stroke="none"/><path d="M16 9v7l5 3M16 5v1M5 16h1M26 16h1M16 26v1" fill="none"/>`,
  plus: `<path d="M16 6v20M6 16h20" fill="none"/><path d="M24 9c0-4 3-5 5-5 0 3-1 5-5 5Z" fill="SOFT" stroke-width="1.2"/>`,
  back: `<path d="M21 5 10 16l11 11" fill="none"/>`,
  arrow: `<path d="m12 7 9 9-9 9" fill="none"/>`,
  check: `<path d="m6 16 7 7L27 8" fill="none"/>`,
  close: `<path d="m8 8 16 16M24 8 8 24" fill="none"/>`,
  more: `<ellipse cx="7" cy="16" rx="2" ry="2.5" fill="INK" stroke="none" transform="rotate(-12 7 16)"/><ellipse cx="16" cy="16" rx="2" ry="2.5" fill="INK" stroke="none"/><ellipse cx="25" cy="16" rx="2" ry="2.5" fill="INK" stroke="none" transform="rotate(12 25 16)"/>`,
  capsule: `<circle cx="16" cy="16" r="10" fill="none"/><circle cx="16" cy="16" r="3.5" fill="INK" stroke="none"/>`,
  pot: `<path d="m8 19 2 10h12l2-10" fill="WARM"/><rect x="6" y="16" width="20" height="4" rx="1.6" fill="PAPER"/><path d="M16 16V8M16 12C7 14 5 8 6 4c6 0 10 3 10 8Zm0-3c0-5 5-7 10-6 0 5-4 8-10 6Z" fill="SOFT"/><path d="M12 24h8" fill="none"/>`,
};

const palettes = {
  green: { INK: '#3d684c', SOFT: '#e1ead7', PAPER: '#faf8ee', WARM: '#ccb28b' },
  muted: { INK: '#7e8879', SOFT: '#e9ede2', PAPER: '#faf8f2', WARM: '#c8bea4' },
  sage: { INK: '#7b9268', SOFT: '#e7edda', PAPER: '#faf8ee', WARM: '#cbb58a' },
  white: { INK: '#ffffff', SOFT: '#ffffff30', PAPER: '#ffffff12', WARM: '#ffffff65' },
};
const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
let generated = 0;
function output(file, data) {
  const target = path.join(root, file);
  if (check) {
    const actual = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const matches = actual && (typeof data === 'string'
      ? actual.toString('utf8').replace(/\r\n/g, '\n') === data.replace(/\r\n/g, '\n')
      : actual.equals(Buffer.from(data)));
    if (!matches) {
      throw Error(`图标产物与源设计不一致：${file}`);
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }
}
for (const [name, body] of Object.entries(designs)) {
  for (const [tone, colors] of Object.entries(palettes)) {
    const content = body.replace(/INK|SOFT|PAPER|WARM/g, key => colors[key]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="${colors.INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>\n`;
    if (tone === 'green') output(`src/assets/icons/${name}.svg`, svg);
    const png = new Resvg(svg, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: 96 } }).render().asPng();
    output(`src/static/icons/${name}-${tone}.png`, png);
    generated++;
  }
}
output('src/design/icon-catalog.ts', `// 由 scripts/build-icons.cjs 生成，修改图形请编辑该脚本。\nexport const iconNames = ${JSON.stringify(Object.keys(designs))} as const;\nexport type IconName = typeof iconNames[number];\nexport type IconTone = 'green' | 'muted' | 'sage' | 'white';\n`);
console.log(`${check ? '已验证' : '已生成'} ${Object.keys(designs).length} 个原创 SVG 图标及 ${generated} 个透明 PNG 版本。`);

if (process.argv.includes('--preview')) {
  const labels = {leaf:'嫩芽',calendar:'叶片日历',user:'花园主人',camera:'成长相机',water:'小水壶',scissors:'园艺剪',fertilizer:'营养瓶',share:'分享成长',clock:'养护时光',plus:'添加',back:'返回',arrow:'进入',check:'完成',close:'关闭',more:'更多',capsule:'小程序入口',pot:'阳台盆栽'};
  const tiles = Object.entries(designs).map(([name, body], i) => {
    const x = 40 + (i % 6) * 160; const y = 136 + Math.floor(i / 6) * 150;
    const colors = palettes.green;
    const icon = body.replace(/INK|SOFT|PAPER|WARM/g, key => colors[key]);
    return `<rect x="${x}" y="${y}" width="144" height="128" rx="20" fill="#fffdf7"/><svg x="${x+40}" y="${y+15}" width="64" height="64" viewBox="0 0 32 32" fill="none" stroke="${colors.INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><text x="${x+72}" y="${y+106}" text-anchor="middle" font-size="18" fill="#5b7055">${labels[name]}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="610"><rect width="1040" height="610" fill="#f4f3e9"/><g font-family="Microsoft YaHei"><text x="44" y="60" font-size="32" font-weight="600" fill="#2f513a">植物日记 · 原创图标</text><text x="46" y="96" font-size="18" fill="#85917a">圆角线稿 / 鼠尾草绿 / 暖米色点缀</text>${tiles}</g></svg>`;
  const dir = path.resolve(root, '..', '文档');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SproutDiary-原创图标预览.svg'), svg);
  const fontFile = 'C:/Windows/Fonts/msyh.ttc';
  fs.writeFileSync(path.join(dir, 'SproutDiary-原创图标预览.png'), new Resvg(svg,{font:{loadSystemFonts:!fs.existsSync(fontFile),fontFiles:fs.existsSync(fontFile)?[fontFile]:[],defaultFontFamily:'Microsoft YaHei'}}).render().asPng());
  console.log('图标预览已保存到项目文档目录。');
}
