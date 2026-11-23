import { CHARSET_GROUPS } from './project.js';

export const SHEET_COLUMNS = 4;
export const SHEET_ROWS = 6;
export const CELLS_PER_PAGE = SHEET_COLUMNS * SHEET_ROWS;
export const WORKSHEET_CHARS = [...new Set(CHARSET_GROUPS.flatMap(group => [...group.chars]).filter(char => char !== ' '))];
export const SHEET_PAGES = Array.from({ length: Math.ceil(WORKSHEET_CHARS.length / CELLS_PER_PAGE) }, (_, index) => WORKSHEET_CHARS.slice(index * CELLS_PER_PAGE, (index + 1) * CELLS_PER_PAGE));
export const PAGE_WIDTH = 1000;
export const PAGE_HEIGHT = 1414;

const LAYOUT = { left: 44, top: 184, cellW: 228, cellH: 190, boxInsetX: 12, boxInsetY: 29 };
const BASELINE_RATIO = 0.72;
const CAP_HEIGHT_RATIO = 0.09;
const X_HEIGHT_RATIO = 0.27;
const DESCENDER_RATIO = 0.90;

// Угловые L-метки: их центры — опорные точки для выравнивания скана/фото.
const MARKS = [
  { parts: [[24, 24, 34, 5], [24, 29, 5, 29]], corner: 'TL' },
  { parts: [[942, 24, 34, 5], [971, 29, 5, 29]], corner: 'TR' },
  { parts: [[942, 1385, 34, 5], [971, 1356, 5, 29]], corner: 'BR' },
  { parts: [[24, 1385, 34, 5], [24, 1356, 5, 29]], corner: 'BL' }
];
function markCenter(mark) {
  let area = 0, cx = 0, cy = 0;
  for (const [x, y, w, h] of mark.parts) { area += w * h; cx += (x + w / 2) * w * h; cy += (y + h / 2) * w * h; }
  return { x: cx / area, y: cy / area };
}
export const MARK_CENTERS = MARKS.map(markCenter);

function cellRect(index) {
  const col = index % SHEET_COLUMNS, row = Math.floor(index / SHEET_COLUMNS);
  const x = LAYOUT.left + col * LAYOUT.cellW, y = LAYOUT.top + row * LAYOUT.cellH;
  const bx = x + LAYOUT.boxInsetX, by = y + LAYOUT.boxInsetY;
  // Reserve a separate footer for the glyph name and a short description.
  // Recognition reads only the drawing rectangle above this metadata footer.
  const bw = LAYOUT.cellW - LAYOUT.boxInsetX * 2, bh = LAYOUT.cellH - LAYOUT.boxInsetY - 34;
  return { bx, by, bw, bh, labelX: x + 4, labelY: y + 19, metaY: by + bh + 10 };
}

function escapeXml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]); }

export function worksheetPageSvg(chars, pageNumber, totalPages) {
  const cells = chars.map((char, index) => {
    const { bx, by, bw, bh, labelX, labelY, metaY } = cellRect(index);
    const capY = by + bh * CAP_HEIGHT_RATIO;
    const xHeightY = by + bh * X_HEIGHT_RATIO;
    const baselineY = by + bh * BASELINE_RATIO;
    const descenderY = by + bh * DESCENDER_RATIO;
    const centerX = bx + bw / 2;
    return `<g>
      <text x="${labelX}" y="${labelY}" class="char">${escapeXml(char)}</text>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" class="cell"/>
      <line x1="${bx}" y1="${capY}" x2="${bx + bw}" y2="${capY}" class="guide guide-cap"/>
      <line x1="${bx}" y1="${xHeightY}" x2="${bx + bw}" y2="${xHeightY}" class="guide"/>
      <line x1="${bx}" y1="${baselineY}" x2="${bx + bw}" y2="${baselineY}" class="guide guide-base"/>
      <line x1="${bx}" y1="${descenderY}" x2="${bx + bw}" y2="${descenderY}" class="guide"/>
      <line x1="${centerX}" y1="${by}" x2="${centerX}" y2="${by + bh}" class="guide guide-center"/>
      <line x1="${bx + bw * .12}" y1="${by}" x2="${bx + bw * .12}" y2="${by + bh}" class="guide guide-side"/>
      <line x1="${bx + bw * .88}" y1="${by}" x2="${bx + bw * .88}" y2="${by + bh}" class="guide guide-side"/>
      <text x="${bx + 3}" y="${metaY}" class="meta">Имя глифа: __________________</text>
      <text x="${bx + 3}" y="${metaY + 13}" class="meta">Описание: ____________________</text>
    </g>`;
  }).join('');
  const marks = MARKS.map(mark => mark.parts.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111"/>`).join('')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}"><style>text{font-family:Arial,sans-serif}.title{font-size:30px;font-weight:bold;fill:#17191e}.sub{font-size:14px;fill:#555b66}.char{font-size:19px;font-weight:bold;fill:#313641}.cell{fill:#fff;stroke:#252a32;stroke-width:2}.guide{stroke:#e0e5ec;stroke-width:1;stroke-dasharray:5 6}.guide-cap{stroke:#aeb8c6;stroke-dasharray:3 5}.guide-base{stroke:#e8d7dc;stroke-width:1.3;stroke-dasharray:5 4}.guide-center{stroke:#8ebbc8;stroke-dasharray:3 5}.guide-side{stroke:#d4dbe4;stroke-dasharray:2 5}.meta{font-size:8px;fill:#646b75}</style><rect width="100%" height="100%" fill="#fff"/><text x="46" y="58" class="title">HandFont Studio — бланк для рукописного шрифта</text><text x="46" y="88" class="sub">Один глиф в ячейке. Пишите тёмной ручкой внутри рамки, не закрывая метки.</text><text x="46" y="116" class="sub">Страница ${pageNumber} из ${totalPages} • Базовая линия — розовый пунктир.</text><text x="46" y="148" class="sub">Проект / шрифт: ______________________________ Автор: __________________</text>${marks}${cells}<text x="46" y="1378" class="sub">Сохраните имя и краткое описание глифа. Чёрные уголки нужны для выравнивания — не обрезайте их.</text></svg>`;
}
export function openWorksheetPrint(targetWindow) {
  const pages = SHEET_PAGES.map((chars, index) => worksheetPageSvg(chars, index + 1, SHEET_PAGES.length));
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Бланк HandFont Studio</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0}.page{width:210mm;height:297mm;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}.page svg{width:210mm;height:297mm;display:block}@media screen{body{background:#ddd}.page{margin:12px auto;box-shadow:0 2px 12px #777}}</style>${pages.map(svg => `<section class="page">${svg}</section>`).join('')}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></html>`;
  // Reuse the window opened synchronously by the click handler. Opening a
  // second window here can be blocked by mobile popup protection and leave the
  // first, user-gesture-authorized tab blank.
  const popup = targetWindow && !targetWindow.closed ? targetWindow : window.open('', '_blank');
  if (!popup) throw new Error('Разрешите всплывающие окна, чтобы открыть бланк для печати.');
  popup.document.open(); popup.document.write(html); popup.document.close();
}

export function downloadWorksheetSvg(pageIndex) {
  const chars = SHEET_PAGES[pageIndex];
  if (!chars) throw new Error('Нет такой страницы бланка.');
  const svg = worksheetPageSvg(chars, pageIndex + 1, SHEET_PAGES.length);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `handfont-blank-stranica-${pageIndex + 1}.svg`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ================= Распознавание скана ================= */

function loadImageBitmap(file) {
  const loadWithImageElement = () => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть изображение.')); };
    img.src = url;
  });
  if (typeof createImageBitmap !== 'function') return loadWithImageElement();
  return createImageBitmap(file).catch(() => loadWithImageElement());
}

function otsuThreshold(gray, w, h) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) hist[gray[i]]++;
  const total = w * h;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, weightB = 0, best = 128, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    weightB += hist[t];
    if (!weightB) continue;
    const weightF = total - weightB;
    if (!weightF) break;
    sumB += t * hist[t];
    const meanB = sumB / weightB, meanF = (sum - sumB) / weightF;
    const between = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (between > bestVar) { bestVar = between; best = t; }
  }
  return best;
}

function findMark(mask, w, h, corner) {
  // Search only the outer corner. Connected-component geometry separates the
  // printed L marker from nearby headings, footer text and handwritten marks.
  const base = Math.min(w, h);
  const win = Math.max(48, Math.round(base * 0.09));
  const x0 = corner === 'TL' || corner === 'BL' ? 0 : w - win;
  const y0 = corner === 'TL' || corner === 'TR' ? 0 : h - win;
  const seen = new Uint8Array(win * win);
  const queue = [];
  const target = base * 0.034;
  let best = null, bestScore = Infinity;

  for (let sy = 0; sy < win; sy++) for (let sx = 0; sx < win; sx++) {
    const start = sy * win + sx;
    if (seen[start] || !mask[(y0 + sy) * w + (x0 + sx)]) continue;
    queue.length = 0;
    queue.push(start);
    seen[start] = 1;
    let head = 0, count = 0, sumX = 0, sumY = 0;
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    while (head < queue.length) {
      const pos = queue[head++], px = pos % win, py = Math.floor(pos / win);
      count++; sumX += px; sumY += py;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= win || ny >= win) continue;
        const ni = ny * win + nx;
        if (seen[ni] || !mask[(y0 + ny) * w + (x0 + nx)]) continue;
        seen[ni] = 1; queue.push(ni);
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (count < Math.max(12, target * target * 0.08)) continue;
    // A photographed/printed page can lose part of the short vertical leg
    // of the top-right marker (common with tight framing or printer margins).
    // Its long horizontal bar is still distinctive; accept that partial mark
    // only in the TR corner and use the known template centre for alignment.
    const partialTopRight = corner === 'TR' &&
      bw >= target * 0.75 && bw <= target * 1.35 &&
      bh >= target * 0.18 && bh <= target * 0.55;
    if ((!partialTopRight && (bw < target * 0.45 || bh < target * 0.45)) ||
        bw > target * 1.8 || bh > target * 1.8) continue;
    const fill = count / (bw * bh);
    if (fill < 0.08 || fill > 0.72) continue;
    const expectedX = corner === 'TL' || corner === 'BL' ? target : win - target;
    const expectedY = corner === 'TL' || corner === 'TR' ? target : win - target;
    const cx = sumX / count, cy = sumY / count;
    const sizeScore = Math.abs(Math.log(bw / target)) + Math.abs(Math.log(bh / target));
    const positionScore = (Math.abs(cx - expectedX) + Math.abs(cy - expectedY)) / target;
    const score = sizeScore + positionScore * 0.65 + Math.abs(fill - 0.25);
    if (score < bestScore) {
      bestScore = score;
      best = partialTopRight
        ? { x: x0 + expectedX, y: y0 + expectedY }
        : { x: x0 + cx, y: y0 + cy };
    }
  }
  return best;
}

function makeMapper(found) {
  if (!(found.TL && found.TR && found.BR && found.BL)) return null;

  // Solve a projective homography from the four printed page marks to their
  // photographed positions. Unlike bilinear interpolation, this corrects
  // perspective convergence when the camera is not parallel to the sheet.
  const source = MARK_CENTERS;
  const target = [found.TL, found.TR, found.BR, found.BL];
  const matrix = [], values = [];
  for (let i = 0; i < 4; i++) {
    const x = source[i].x, y = source[i].y;
    const u = target[i].x, v = target[i].y;
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }

  // Gaussian elimination with partial pivoting for the 8×8 system.
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    }
    if (Math.abs(matrix[pivot][col]) < 1e-10) return null;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    [values[col], values[pivot]] = [values[pivot], values[col]];
    const divisor = matrix[col][col];
    for (let k = col; k < 8; k++) matrix[col][k] /= divisor;
    values[col] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = matrix[row][col];
      if (!factor) continue;
      for (let k = col; k < 8; k++) matrix[row][k] -= factor * matrix[col][k];
      values[row] -= factor * values[col];
    }
  }

  const h = values;
  return (px, py) => {
    const denominator = h[6] * px + h[7] * py + 1;
    if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10) return { x: NaN, y: NaN };
    return {
      x: (h[0] * px + h[1] * py + h[2]) / denominator,
      y: (h[3] * px + h[4] * py + h[5]) / denominator
    };
  };
}

function traceMask(v, w, h) {
  const segs = new Map();
  const key = (x, y) => x + '_' + y;
  const add = (a, b) => {
    const k = key(a[0], a[1]);
    if (!segs.has(k)) segs.set(k, []);
    segs.get(k).push(b);
  };
  const V = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : v[y * w + x];
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const idx = V(x, y) * 8 + V(x + 1, y) * 4 + V(x + 1, y + 1) * 2 + V(x, y + 1);
    if (idx === 0 || idx === 15) continue;
    const N = [x + .5, y], E = [x + 1, y + .5], S = [x + .5, y + 1], W = [x, y + .5];
    switch (idx) {
      case 1: add(S, W); break;
      case 2: add(E, S); break;
      case 3: add(E, W); break;
      case 4: add(N, E); break;
      case 5: add(N, E); add(S, W); break;
      case 6: add(N, S); break;
      case 7: add(N, W); break;
      case 8: add(W, N); break;
      case 9: add(S, N); break;
      case 10: add(W, N); add(E, S); break;
      case 11: add(E, N); break;
      case 12: add(W, E); break;
      case 13: add(S, E); break;
      case 14: add(W, S); break;
    }
  }
  const loops = [];
  segs.forEach((list, k) => {
    while (list.length) {
      const start = k.split('_').map(Number);
      const loop = [start];
      let next = list.pop(), guard = 500000, ok = false;
      while (guard--) {
        loop.push(next);
        const nk = key(next[0], next[1]);
        if (nk === k) { ok = true; break; }
        const l2 = segs.get(nk);
        if (!l2 || !l2.length) break;
        next = l2.pop();
      }
      if (ok && loop.length > 3) { loop.pop(); loops.push(loop); }
    }
  });
  return loops;
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  // Iterative Ramer–Douglas–Peucker avoids call-stack overflow on noisy scans.
  const keep = new Uint8Array(pts.length);
  const stack = [[0, pts.length - 1]];
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  while (stack.length) {
    const [start, end] = stack.pop();
    if (end <= start + 1) continue;
    let dmax = 0, idx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDist(pts[i], pts[start], pts[end]);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps && idx > start && idx < end) {
      keep[idx] = 1;
      stack.push([start, idx], [idx, end]);
    }
  }
  const result = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) result.push(pts[i]);
  return result;
}
function simplifyClosed(pts, eps) {
  if (pts.length < 5) return pts;
  let far = 1, fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const s1 = rdp(pts.slice(0, far + 1), eps);
  const s2 = rdp(pts.slice(far).concat([pts[0]]), eps);
  return s1.slice(0, -1).concat(s2.slice(0, -1));
}
function contourArea(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  return s / 2;
}

// Reject contours that fold across themselves after simplification. Such paths
// can create unpredictable filled regions in SVG previews and exported fonts.
function hasSelfIntersection(points) {
  const n = points.length;
  if (n < 4) return false;
  const orient = (a, b, c) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSegment = (a, b, p) =>
    p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 &&
    p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7;
  const intersects = (a, b, c, d) => {
    const o1 = orient(a, b, c), o2 = orient(a, b, d);
    const o3 = orient(c, d, a), o4 = orient(c, d, b);
    if (((o1 > 1e-7 && o2 < -1e-7) || (o1 < -1e-7 && o2 > 1e-7)) &&
        ((o3 > 1e-7 && o4 < -1e-7) || (o3 < -1e-7 && o4 > 1e-7))) return true;
    return (Math.abs(o1) <= 1e-7 && onSegment(a, b, c)) ||
      (Math.abs(o2) <= 1e-7 && onSegment(a, b, d)) ||
      (Math.abs(o3) <= 1e-7 && onSegment(c, d, a)) ||
      (Math.abs(o4) <= 1e-7 && onSegment(c, d, b));
  };
  const cellSize = 8;
  const buckets = new Map();
  const bounds = new Array(n);
  const cellKey = (x, y) => x + ':' + y;

  // Bucket edge bounding boxes into a coarse grid. Only edges whose boxes
  // share a cell can intersect, avoiding the old all-pairs O(n²) scan.
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const box = bounds[i] = {
      minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
      minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y)
    };
    const x0 = Math.floor(box.minX / cellSize), x1 = Math.floor(box.maxX / cellSize);
    const y0 = Math.floor(box.minY / cellSize), y1 = Math.floor(box.maxY / cellSize);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const key = cellKey(gx, gy);
      let bucket = buckets.get(key);
      if (!bucket) { bucket = []; buckets.set(key, bucket); }
      bucket.push(i);
    }
  }

  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n], box = bounds[i];
    const candidates = new Set();
    const x0 = Math.floor(box.minX / cellSize), x1 = Math.floor(box.maxX / cellSize);
    const y0 = Math.floor(box.minY / cellSize), y1 = Math.floor(box.maxY / cellSize);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const bucket = buckets.get(cellKey(gx, gy));
      if (bucket) for (const j of bucket) if (j > i) candidates.add(j);
    }
    for (const j of candidates) {
      // Adjacent edges share a legitimate endpoint, including the closing pair.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const c = points[j], d = points[(j + 1) % n], other = bounds[j];
      if (box.maxX < other.minX - 1e-7 || other.maxX < box.minX - 1e-7 ||
          box.maxY < other.minY - 1e-7 || other.maxY < box.minY - 1e-7) continue;
      if (intersects(a, b, c, d)) return true;
    }
  }
  return false;
}

export async function scanWorksheetFile(file, pageIndex, options = {}) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Выберите изображение скана или фотографии (PNG/JPG/WebP).');
  const chars = SHEET_PAGES[pageIndex];
  if (!chars) throw new Error('Неверно выбрана страница бланка.');
  const bitmap = await loadImageBitmap(file);
  const closeBitmap = () => { if (bitmap && typeof bitmap.close === 'function') bitmap.close(); };
  const naturalW = bitmap.width || bitmap.naturalWidth;
  const naturalH = bitmap.height || bitmap.naturalHeight;
  if (!naturalW || !naturalH) {
    closeBitmap();
    throw new Error('Изображение пустое или повреждено.');
  }
  // The compressed file-size limit alone does not protect phones from huge
  // decoded photos. Reject extreme pixel counts before allocating our own
  // canvas and typed-array buffers.
  if (naturalW * naturalH > 40000000) {
    closeBitmap();
    throw new Error('Слишком высокое разрешение фотографии (' + naturalW + ' × ' + naturalH + '). Уменьшите изображение до 40 мегапикселей или ниже и загрузите снова.');
  }

  const scaleDown = Math.min(1, 1400 / Math.max(naturalW, naturalH));
  const w = Math.max(200, Math.round(naturalW * scaleDown));
  const h = Math.max(200, Math.round(naturalH * scaleDown));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    closeBitmap();
    throw new Error('Браузер не смог подготовить изображение для распознавания.');
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  try {
    ctx.drawImage(bitmap, 0, 0, w, h);
  } finally {
    closeBitmap();
  }
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(.299 * data[i * 4] + .587 * data[i * 4 + 1] + .114 * data[i * 4 + 2]);
  }
  const globalThr = otsuThreshold(gray, w, h);
  const markThr = Math.max(40, Math.min(globalThr, 120));
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = gray[i] < markThr ? 1 : 0;

  const found = {
    TL: findMark(mask, w, h, 'TL'), TR: findMark(mask, w, h, 'TR'),
    BR: findMark(mask, w, h, 'BR'), BL: findMark(mask, w, h, 'BL')
  };
  const marksFound = Object.values(found).filter(Boolean).length;
  // Do not silently import a cropped or skewed page using a guessed scale:
  // inaccurate cell mapping can assign fragments to the wrong glyphs.
  if (marksFound !== 4) {
    throw new Error('Найдены не все четыре угловые метки (' + marksFound + ' из 4). Снимите весь лист целиком, включая четыре угла. Не обрезайте поля и не закрывайте метки.');
  }
  const mapPage = makeMapper(found);
  if (!mapPage) throw new Error('Не удалось выровнять бланк по угловым меткам. Переснимите лист ровно, без сильного наклона и перспективных искажений.');
  const aligned = true;

  const sensitivity = Math.max(60, Math.min(200, Number(options.threshold) || 128));
  const result = [];
  const skipped = [];

  for (let index = 0; index < chars.length; index++) {
    // Yield between small batches so low-powered phones can repaint and respond
    // while a full worksheet page is being traced.
    if (index > 0 && index % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    const { bx, by, bw, bh } = cellRect(index);
    const inset = 7;
    const x0 = bx + inset, y0 = by + inset, x1 = bx + bw - inset, y1 = by + bh - inset;
    const gw = 132, gh = Math.max(40, Math.round(gw * (y1 - y0) / (x1 - x0)));
    const cellGray = new Uint8Array(gw * gh);
    const guideBand = Math.max(1.2, (x1 - x0) / gw * 1.25);
    const guideCapY = by + bh * CAP_HEIGHT_RATIO;
    const guideXHeightY = by + bh * X_HEIGHT_RATIO;
    const guideBaseY = by + bh * BASELINE_RATIO;
    const guideDescY = by + bh * DESCENDER_RATIO;
    const guideCenterX = bx + bw / 2, guideLeftX = bx + bw * .12, guideRightX = bx + bw * .88;
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const px = x0 + (gx + .5) * (x1 - x0) / gw, py = y0 + (gy + .5) * (y1 - y0) / gh;
      const p = mapPage(px, py);
      const ix = Math.round(p.x), iy = Math.round(p.y);
      let sample = (ix >= 0 && iy >= 0 && ix < w && iy < h) ? gray[iy * w + ix] : 255;
      // Suppress pale printed guide pixels so they never become false glyph
      // strokes; dark pen ink written over a guide remains recognizable.
      const onGuide = Math.abs(py - guideCapY) <= guideBand ||
        Math.abs(py - guideXHeightY) <= guideBand || Math.abs(py - guideBaseY) <= guideBand ||
        Math.abs(py - guideDescY) <= guideBand || Math.abs(px - guideCenterX) <= guideBand ||
        Math.abs(px - guideLeftX) <= guideBand || Math.abs(px - guideRightX) <= guideBand;
      if (onGuide && sample > 160) sample = 255;
      cellGray[gy * gw + gx] = sample;
    }
    let thr = otsuThreshold(cellGray, gw, gh);
    thr = Math.max(50, Math.min(210, thr + (sensitivity - 128) * 0.5));
    const cellMask = new Uint8Array(gw * gh);
    let ink = 0;
    for (let i = 0; i < gw * gh; i++) { if (cellGray[i] < thr) { cellMask[i] = 1; ink++; } }
    if (ink < 14 || ink > gw * gh * 0.6) { skipped.push(chars[index]); continue; }

    const loops = traceMask(cellMask, gw, gh);
    if (!loops.length) { skipped.push(chars[index]); continue; }

    const baseRow = ((by + bh * BASELINE_RATIO) - y0) / (y1 - y0) * gh;
    const unitsPerCell = 700 / Math.max(1, baseRow);
    const outlines = [];
    let minX = Infinity, maxX = -Infinity;
    for (const loop of loops) {
      const simplified = simplifyClosed(loop, 0.65);
      if (simplified.length < 3) continue;
      if (hasSelfIntersection(simplified.map(p => ({ x: p[0], y: p[1] })))) continue;
      // Remove isolated scan specks before scaling. Keep small but meaningful
      // components (for example, the dot of "i" or punctuation) above 3 px².
      const sourceArea = Math.abs(contourArea(simplified.map(p => ({ x: p[0], y: p[1] }))));
      if (sourceArea < 3) continue;
      let pts = simplified.map(p => ({ x: Math.round(p[0] * unitsPerCell * 10) / 10, y: Math.round((baseRow - p[1]) * unitsPerCell * 10) / 10 }));
      if (Math.abs(contourArea(pts)) < 60) continue;
      if (contourArea(pts) > 0) pts.reverse();
      for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; }
      outlines.push(pts);
    }
    if (!outlines.length) { skipped.push(chars[index]); continue; }
    const shift = 60 - minX;
    for (const contour of outlines) for (const p of contour) p.x = Math.round((p.x + shift) * 10) / 10;
    const advanceWidth = Math.max(250, Math.min(1400, Math.round(maxX - minX + 120)));
    result.push({ code: chars[index].codePointAt(0), char: chars[index], advanceWidth, strokes: [], outlines, importedFromWorksheet: true });
  }

  if (!result.length) {
    throw new Error(aligned
      ? 'В ячейках не найдено рукописных символов. Пишите тёмной ручкой и проверьте номер страницы бланка.'
      : 'Не удалось найти чёрные угловые метки. Проверьте, что выбран нужный лист, все четыре угла целиком попали в кадр и метки не закрыты пальцами, тенями или предметами. Чувствительность штрихов не влияет на поиск меток.');
  }
  return { glyphs: result, skipped, aligned, marksFound };
                          }
