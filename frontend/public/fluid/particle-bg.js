
// DeepSeek Harness Replica - 图案粒子层（叠加在 WebGL 液态金属流体之上）
// 粒子组成一个抽象的科技图案，指针经过时只推开"指针大小"的一小片，离开后柔和复位

(function () {
  'use strict';

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const config = {
    /* —— 图案：把文字/SVG path 栅格化成点阵，粒子数 = 采样点数 —— */
    patternScale: 0.28,   // 字号 = min(画布宽,高) * 该系数
    patternCX: 0.755,     // 图案中心（画布比例）。右侧 y<419 是终端卡片上方的空档
    patternCY: 0.30,
    sampleStep: 3,        // 栅格采样步长(px)，越小越密
    maxParticles: 2800,   // 上限，超出则等距抽样，保证小屏性能
    jitter: 0.7,          // 点位抖动，避免点阵过于死板
    patternInterval: 6000, // 图案轮换周期(ms)

    /* —— 形变：切换图案时先向外炸开(burst)，再柔和聚拢(gather)，最后恢复常态 ——
       直接把粒子推到新目标只有 ~13 帧(0.2s)就到位，肉眼就是"瞬间跳变"。
       burst 阶段把刚度压到接近 0、衰减放慢(D 提高到 0.92)，粒子靠惯性真的飞散出去；
       gather 阶段用一个更软的刚度(S=0.28 < S_crit=0.5895，仍过阻尼，Δ=+0.234)
       慢慢收拢，约 19 帧(0.32s)到位；两阶段合计 ~1.5s，节奏才看得清。 */
    burstMs: 700,             // 炸开持续时长
    gatherMs: 800,            // 聚拢持续时长
    burstSpeed: 5.5,          // 炸开初速度(px/帧)
    burstDamping: 0.92,       // 炸开阶段速度衰减系数，越大飞得越远
    burstReturnSpeed: 0.015,  // 炸开阶段刚度，≈0 表示几乎不往回拉
    burstMaxSpeed: 6.5,       // 炸开阶段限速，比常态放宽
    gatherReturnSpeed: 0.28,  // 聚拢阶段刚度（更软 = 更缓）

    /* —— 指针交互：位移式推开（改目标点，不给速度），过阻尼收敛，不弹不振荡 ——
       归位是一个离散二阶系统：v' = D*(v + S*(target-x))，x' = x + v'
       误差矩阵 [[1-D*S, D], [-D*S, D]]，判别式 Δ = (1-D*S+D)² - 4D
         Δ > 0  → 两根都是实数，单调衰减（过阻尼，不会弹）
         Δ < 0  → 共轭复根，来回振荡（欠阻尼，就是"抖"）
       ⚠ 别只看"阻尼系数大"：D=0.88/S=0.22 反而 Δ<0，|λ|=0.938 衰减极慢、
         振荡周期 13.9 帧，收敛要 72 帧，肉眼就是持续抖动。
       临界刚度 S_crit = (1 + D - 2√D) / D，取值要明显小于它才安全。
       当前 D=0.32 时 S_crit=0.5895，取 S=0.50 → Δ=+0.0656，|λ|=0.708，13 帧收敛。 */
    mouseRadius: 22,     // 影响半径(px)，比指针稍大一点点即可
    pushStrength: 0.55,  // 推出强度：0.55×22 ≈ 12px 最大位移，洞不会过大
    returnSpeed: 0.50,   // 刚度（S），配合下面的 D 落在过阻尼区
    damping: 0.32,       // 阻尼（D）。改这两个值前先算 Δ，见上面注释
    maxSpeed: 5,         // 过阻尼不会过冲，限速可以放宽，免得削掉响应速度

    /* 流体拖曳已注释掉；这两个参数保留，如需恢复可用 */
    flowDragRadius: 110,
    flowDrag: 0.0,

    baseRadius: 0.60,
    glowScale: 3.0,      // 光晕相对粒子半径的倍率（点阵密，光晕要收小才不糊成一片）
    connectionDistance: 46,
    connectionOpacity: 0.0,  // 连线关掉：洞附近的白线会让"AI"字形显得乱
    idleTimeout: 2400,   // 指针静止多久后效果淡出(ms)
  };

  /* ---------------- 可轮换的图案 ----------------
     AI 字样 + data.js 里烘焙的各厂商官方 SVG path（window.TJG_SVGS）。
     厂商 SVG 的 viewBox 有 256 系列与 24 系列两种，rasterizePath 会统一
     按 max(vw,vh) 缩放到同一显示尺寸，避免大小不一。 */
  const patternList = [{ type: 'text', text: 'AI', label: 'AI' }];
  (function collectVendorPatterns() {
    const svgs = window.TJG_SVGS;
    if (!svgs) return;
    ['openai', 'claude', 'gemini', 'grok', 'deepseek', 'minimax', 'moonshot', 'nvidia', 'zhipu']
      .forEach((k) => {
        const s = svgs[k];
        if (s && s.path) {
          patternList.push({
            type: 'path', vendor: k, label: s.label || k,
            path: s.path, viewBox: s.viewBox || [0, 0, 24, 24],
          });
        }
      });
  })();

  let width = 0, height = 0, dpr = 1;
  let particles = [];
  let targets = [];
  let patternIndex = 0;
  let morphPhase = 'idle';   // 'idle' | 'burst' | 'gather'
  let morphTimer = null;
  let animationId = 0;
  let time = 0, lastNow = 0;

  const mouse = { x: -9999, y: -9999, active: false };
  let mouseOn = 0;
  let idleTimer = null;

  /* ---------------- 预渲染光晕精灵（比每帧画径向渐变快一个数量级） ----------------
     纯白：不掺任何蓝，配合 lighter 叠加也不会偏色。 */
  const glowSprite = (function () {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.16, 'rgba(255,255,255,0.90)');
    grd.addColorStop(0.38, 'rgba(255,255,255,0.26)');
    grd.addColorStop(0.72, 'rgba(255,255,255,0.05)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    return c;
  })();

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* 画布现在由 CSS(inset:0) 撑到首屏容器大小，按实际盒模型取尺寸，
       避免 100vw 与 innerWidth 在出现滚动条时不一致。 */
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width) || window.innerWidth;
    height = Math.round(rect.height) || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initTargets();
    initParticles();
  }

  /* ---------------- 文字栅格化：把 "AI" 画进离屏画布，再按步长采样不透明像素 ---------------- */
  function rasterizeText(text, fontPx, step) {
    const font = '700 ' + Math.round(fontPx) + 'px Outfit, MiSans, ' +
                 '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const off = document.createElement('canvas');
    let g = off.getContext('2d');
    g.font = font;
    const w = Math.max(8, Math.ceil(g.measureText(text).width) + 12);
    const h = Math.max(8, Math.ceil(fontPx * 1.4));

    off.width = w;
    off.height = h;
    g = off.getContext('2d');        // 改画布尺寸会重置上下文状态，字体要重设
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(text, w / 2, h / 2);

    const data = g.getImageData(0, 0, w, h).data;

    /* 先采样，同时记下墨迹包围盒。
       textBaseline='middle' 是相对 em 框居中的，大写字母实际偏上，
       直接用画布中心当原点会让图案比 patternCX/CY 高出十几个像素。 */
    const raw = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 128) {
          raw.push(x, y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!raw.length) return [];

    const ox = (minX + maxX) / 2;   // 按墨迹真实中心对齐
    const oy = (minY + maxY) / 2;
    const pts = [];
    for (let i = 0; i < raw.length; i += 2) pts.push({ x: raw[i] - ox, y: raw[i + 1] - oy });
    return pts;
  }

  /* ---------------- SVG path 栅格化（与文字同样的采样接口） ----------------
     厂商 SVG 的 viewBox 尺寸不一（256 系列 / 24 系列），统一按 max(vw,vh)
     缩放到 targetPx，保证各图标视觉大小接近文字图案。 */
  function rasterizePath(pathData, viewBox, step, targetPx) {
    if (typeof Path2D === 'undefined') return [];
    const vw = viewBox[2] || 24;
    const vh = viewBox[3] || 24;
    const scale = targetPx / Math.max(vw, vh);
    const pad = 3;
    const cw = Math.max(8, Math.ceil(vw * scale) + pad * 2);
    const ch = Math.max(8, Math.ceil(vh * scale) + pad * 2);

    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const g = off.getContext('2d');
    let p;
    try { p = new Path2D(pathData); } catch (e) { return []; }
    g.save();
    g.translate(pad, pad);
    g.scale(scale, scale);
    g.fillStyle = '#fff';
    g.fill(p);
    g.restore();

    const data = g.getImageData(0, 0, cw, ch).data;
    const raw = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < ch; y += step) {
      for (let x = 0; x < cw; x += step) {
        if (data[(y * cw + x) * 4 + 3] > 128) {
          raw.push(x, y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!raw.length) return [];

    const ox = (minX + maxX) / 2;   // 与文字一致：按墨迹真实中心对齐
    const oy = (minY + maxY) / 2;
    const pts = [];
    for (let i = 0; i < raw.length; i += 2) pts.push({ x: raw[i] - ox, y: raw[i + 1] - oy });
    return pts;
  }

  /* ---------------- 取某个图案的采样点 ---------------- */
  /* ---------------- 图案中心：优先落在右侧终端卡片上方的空白带 ----------------
     粒子压在卡片上会被玻璃背景透出来显得脏，也会被卡片裁掉一半。
     这里读卡片实际位置，把图案放到它上方那条空白带的中心并水平对齐卡片；
     上方空间不够（窄屏竖排、或卡片几乎顶到头）就退回默认比例。 */
  function patternCenter(size) {
    const narrow = width < 1024;
    const fallback = {
      cx: width * (narrow ? 0.5 : config.patternCX),
      cy: height * config.patternCY,
      scale: 1,
    };
    const card = document.querySelector('.hero-code');
    const heroEl = document.querySelector('.hero');
    if (!card || !heroEl || narrow) return fallback;

    const cRect = canvas.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const hRect = heroEl.getBoundingClientRect();
    const cardTop = r.top - cRect.top;                  // 卡片上沿（画布坐标）
    /* 空白带上沿 = hero 内容区顶部（padding-top 之后），不是画布顶端，
       否则图案会被顶到 header 底下。 */
    const contentTop = (hRect.top - cRect.top) +
                       (parseFloat(getComputedStyle(heroEl).paddingTop) || 0);
    const cardCX = r.left - cRect.left + r.width / 2;   // 卡片水平中心
    const band = cardTop - contentTop;                  // 空白带高度

    if (band < 80) return fallback;                     // 窄到放不下，退回默认

    let scale = 1;
    if (band < size * 1.12) scale = Math.max(0.5, band / (size * 1.12));

    return { cx: cardCX, cy: contentTop + band / 2, scale };
  }

  function samplePattern(idx) {
    const pat = patternList[idx] || patternList[0];
    const base = Math.min(width, height) * config.patternScale;
    const c = patternCenter(base);
    const fontPx = base * c.scale;
    let pts;
    if (pat.type === 'path') {
      pts = rasterizePath(pat.path, pat.viewBox, config.sampleStep, fontPx);
    } else {
      pts = rasterizeText(pat.text, fontPx, config.sampleStep);
    }
    /* 硬约束：粒子不得压到终端卡片（首次打开 AI 字样最明显）。
       不管上面走的是空白带路径还是比例回退路径，最后统一夹紧：
       最低点若越过「卡片上沿 - 12px 气口」，以图案中心为锚整体缩放；
       中心本身太低就再上移兜底。 */
    const cardEl = document.querySelector('.hero-code');
    if (cardEl && pts.length && width >= 1024) {
      const cRect = canvas.getBoundingClientRect();
      const maxY = cardEl.getBoundingClientRect().top - cRect.top - 12;
      const lowest = Math.max.apply(null, pts.map((p) => p.y));
      let cyAdj = c.cy;
      if (cyAdj + lowest > maxY) {
        const k = Math.max(0.4, (maxY - cyAdj) / lowest);
        if (k < 1) pts = pts.map((p) => ({ x: p.x * k, y: p.y * k }));
        const newLowest = lowest * k;
        if (cyAdj + newLowest > maxY) cyAdj = maxY - newLowest;
      }
      return { pts, cx: c.cx, cy: cyAdj };
    }
    return { pts, cx: c.cx, cy: c.cy };
  }

  /* ---------------- 点数归一化：始终凑满 maxParticles ----------------
     多则等距抽样（不是随机截断，避免图案某一侧被削掉）；
     少则循环补齐并加抖动，避免多点重叠成一坨。 */
  function normalizePoints(pts, n) {
    if (!pts.length) return [];
    if (pts.length > n) {
      const keep = [];
      const stride = pts.length / n;
      for (let i = 0; i < n; i++) keep.push(pts[Math.floor(i * stride)]);
      return keep;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i % pts.length];
      const dup = Math.floor(i / pts.length);
      const spread = dup * 1.2;      // 每轮复制额外散开一点，形成厚度而非重叠
      const ang = (i * 2.399963);    // 黄金角，散布均匀
      out.push({
        x: p.x + Math.cos(ang) * spread * 0.5,
        y: p.y + Math.sin(ang) * spread * 0.5,
      });
    }
    return out;
  }

  /* ---------------- 构建 targets ---------------- */
  function buildTargets(idx) {
    const s = samplePattern(idx);
    const pts = normalizePoints(s.pts, config.maxParticles);
    const j = config.jitter;
    return pts.map((p) => ({
      cx: s.cx, cy: s.cy,
      dx: p.x + (Math.random() - 0.5) * j,
      dy: p.y + (Math.random() - 0.5) * j,
      type: 'glyph',
    }));
  }

  function initTargets() {
    targets = buildTargets(patternIndex);
  }

  /* ---------------- 切换图案：极角排序配对 + 轻微打散 ----------------
     直接按下标重新分配会让 2800 颗粒子大面积交叉乱飞，看起来像炸开而不是重组。
     做法：把旧/新 targets 都按「相对图案中心的极角」排序，再按名次配对，
     粒子基本沿径向/旋转方向移动，轨迹短且有序；切换瞬间再给一点随机速度，
     让重组过程有"打散再聚拢"的呼吸感。 */
  function angleOrder(arr) {
    return arr
      .map((t, i) => ({ i, a: Math.atan2(t.dy, t.dx), r: Math.hypot(t.dx, t.dy) }))
      .sort((p, q) => (p.a - q.a) || (p.r - q.r))
      .map((e) => e.i);
  }

  function switchPattern(nextIdx) {
    if (!particles.length) { patternIndex = nextIdx; initTargets(); return; }
    const oldTargets = targets;
    const newTargets = buildTargets(nextIdx);
    patternIndex = nextIdx;

    const oldOrder = angleOrder(oldTargets);
    const newOrder = angleOrder(newTargets);
    for (let k = 0; k < oldOrder.length && k < newOrder.length; k++) {
      particles[oldOrder[k]].target = newTargets[newOrder[k]];
    }
    /* 多出来的粒子（新旧数量不等时）兜底挂到末尾目标 */
    for (let k = newOrder.length; k < oldOrder.length; k++) {
      particles[oldOrder[k]].target = newTargets[newTargets.length - 1];
    }

    targets = newTargets;

    /* 径向炸开：以新图案中心为原点给一个向外的初速度。
       配合 burst 阶段"低刚度 + 慢衰减"的参数，粒子会先真正飞散出去，
       再在 gather 阶段被柔和地拉回新图案，形成散开→重组的节奏。 */
    const cx = newTargets.length ? newTargets[0].cx : 0;
    const cy = newTargets.length ? newTargets[0].cy : 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const burst = config.burstSpeed * (0.6 + Math.random() * 0.8);
      p.vx += (dx / d) * burst + (Math.random() - 0.5) * 1.2;
      p.vy += (dy / d) * burst + (Math.random() - 0.5) * 1.2;
    }

    morphPhase = 'burst';
    clearTimeout(morphTimer);
    morphTimer = setTimeout(() => {
      morphPhase = 'gather';
      morphTimer = setTimeout(() => { morphPhase = 'idle'; }, config.gatherMs);
    }, config.burstMs);
  }

  /* ---------------- 粒子 ---------------- */
  class Particle {
    constructor(index) {
      const t = targets[index % targets.length];
      this.target = t;
      this.x = t.cx + t.dx + (Math.random() - 0.5) * 45;
      this.y = t.cy + t.dy + (Math.random() - 0.5) * 45;
      this.vx = 0;
      this.vy = 0;
      this.radius = config.baseRadius + Math.random() * 0.5;
      this.brightness = 0.4 + Math.random() * 0.6;
      this.phase = Math.random() * Math.PI * 2;
      this.displaced = 0; // 被推开的程度，用于连线高亮
    }

    update(t, dt) {
      const tg = this.target;

      // 整体极缓慢呼吸（±1.2%），幅度再大字母就糊了
      const br = 1 + Math.sin(t * 0.0004 + this.phase) * 0.012;
      // 微抖动，避免点阵过于死板
      const j = config.jitter * 0.6;
      let tx = tg.cx + tg.dx * br + Math.sin(t * 0.0011 + this.phase) * j;
      let ty = tg.cy + tg.dy * br + Math.cos(t * 0.0013 + this.phase) * j;

      // —— 指针推开：直接位移目标点，而不是给速度，天然不会"弹" ——
      const R = config.mouseRadius;
      if (mouseOn > 0.001) {
        const dx = tx - mouse.x;
        const dy = ty - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R) {
          const k = (R - dist) / R;          // 0(边缘) → 1(正中)
          const eased = k * k * (3 - 2 * k); // smoothstep，边缘过渡柔和
          const amount = (R - dist) * eased * config.pushStrength * mouseOn;
          const inv = 1 / (dist + 0.001);
          tx += dx * inv * amount;
          ty += dy * inv * amount;
        }
      }

      // 流体拖曳已关闭：原来的 window.__dshFlow 会让快速划过的鼠标把 AI 字形拧成漩涡，
      // 与当前「清晰可读的 AI 字形」目标冲突。只保留指针近距离推开（半径 26px）。
      // 如需恢复，把下面这段取消注释并把 flowDrag 调低（当前 2.2 对字形来说太强）：
      // const flow = window.__dshFlow;
      // if (flow && flow.influence > 0.02) {
      //   const fdx = this.x - mouse.x, fdy = this.y - mouse.y;
      //   const fd2 = fdx * fdx + fdy * fdy;
      //   if (fd2 < config.flowDragRadius * config.flowDragRadius) {
      //     const k = (1 - Math.sqrt(fd2) / config.flowDragRadius) * flow.influence * config.flowDrag;
      //     this.vx += flow.vx * k * dt;
      //     this.vy += flow.vy * k * dt;
      //   }
      // }

      // 归位弹簧。形变期间按阶段换参数：
      //   burst  —— 刚度压到近 0、衰减放慢(D 提高到 0.92)，粒子靠惯性真的飞散出去；
      //   gather —— 用一个更软的刚度(0.28 < S_crit 0.5895，仍过阻尼)慢慢收拢；
      //   idle   —— 恢复默认参数，保证指针交互的响应速度。
      // 不换参数的话，初速度会被默认弹簧在 ~13 帧内拉回，等于没有"散开"这一步。
      let S = config.returnSpeed;
      let D = config.damping;
      let maxV = config.maxSpeed;
      if (morphPhase === 'burst') {
        S = config.burstReturnSpeed;
        D = config.burstDamping;
        maxV = config.burstMaxSpeed;
      } else if (morphPhase === 'gather') {
        S = config.gatherReturnSpeed;
      }

      this.vx = (this.vx + (tx - this.x) * S) * D;
      this.vy = (this.vy + (ty - this.y) * S) * D;

      // 限速，彻底杜绝弹飞
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > maxV) {
        const k = maxV / sp;
        this.vx *= k;
        this.vy *= k;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.displaced = Math.hypot(tx - this.x, ty - this.y);
    }

    draw() {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const R = config.mouseRadius;
      const proximity = mouseOn > 0 ? Math.max(0, 1 - dist / (R * 1.6)) * mouseOn : 0;

      // 点阵很密，单颗压低一点，靠 lighter 叠加出实体感而不是糊成一团
      const alpha = Math.min(1, 0.22 + this.brightness * 0.30 + proximity * 0.50);
      const size = (this.radius * config.glowScale) * (1 + proximity * 0.55);

      ctx.globalAlpha = alpha;
      ctx.drawImage(glowSprite, this.x - size, this.y - size, size * 2, size * 2);
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < targets.length; i++) particles.push(new Particle(i));
  }

  /* ---------------- 被打散的粒子之间拉出细丝 ---------------- */
  function drawConnections() {
    if (mouseOn < 0.02) return;

    const R = config.mouseRadius * 2.2;
    const cd = config.connectionDistance;
    const nearby = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      if (dx * dx + dy * dy < R * R) nearby.push(p);
    }

    ctx.lineWidth = 0.6;
    for (let i = 0; i < nearby.length; i++) {
      const p1 = nearby[i];
      for (let j = i + 1; j < nearby.length; j++) {
        const p2 = nearby[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > cd * cd) continue;
        const dist = Math.sqrt(d2);
        const a = (1 - dist / cd) * config.connectionOpacity * mouseOn *
                  Math.min(1, (p1.displaced + p2.displaced) / 12);
        if (a < 0.004) continue;
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  /* ---------------- 主循环（画布保持透明，底下的流体可见） ---------------- */
  function frame(now) {
    animationId = requestAnimationFrame(frame);
    if (document.hidden) { lastNow = now; return; }

    const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0.016;
    lastNow = now;
    time += dt * 1000;

    mouseOn += ((mouse.active ? 1 : 0) - mouseOn) * 0.08;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
      particles[i].update(time, dt);
      particles[i].draw();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawConnections();
    ctx.globalAlpha = 1;
  }

  /* ---------------- 交互 ---------------- */
  function setPointer(x, y) {
    mouse.x = x;
    mouse.y = y;
    mouse.active = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { mouse.active = false; }, config.idleTimeout);
  }
  function clearPointer() {
    mouse.active = false;
    clearTimeout(idleTimer);
  }

  window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('mouseleave', clearPointer);
  window.addEventListener('blur', clearPointer);
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', clearPointer);

  window.addEventListener('resize', resize);

  resize();
  animationId = requestAnimationFrame(frame);

  /* 图案轮换：AI 字样 → 各厂商 SVG 图标，循环重组。
     页面切到后台时暂停，回来再续上，避免离屏空转。 */
  if (patternList.length > 1) {
    let rotTimer = setInterval(() => {
      switchPattern((patternIndex + 1) % patternList.length);
    }, config.patternInterval);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(rotTimer);
        rotTimer = null;
      } else if (!rotTimer) {
        rotTimer = setInterval(() => {
          switchPattern((patternIndex + 1) % patternList.length);
        }, config.patternInterval);
      }
    });
  }
})();