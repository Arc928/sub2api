
/* ============================================================
   DeepSeek Harness 背景流体 —— 对齐官网 deepseek.com/harness

   逆向来源（真实源码，非猜测）：
     https://www.deepseek.com/harness/_next/static/chunks/
       app/[locale]/page-f752721b763e9f77.js

   官网管线：
     Pass 1  flowmap（1/4 分辨率、RGBA8、ping-pong）
             衰减 → 鼠标注入「密度 R + 速度 GB」
     Pass 2  主渲染
             3D simplex 噪声三层域扭曲 fluidNoise() + curl 扰动
             → 标量场 n → 5 色渐变映射
             → 鼠标三色光晕 → 颗粒 → 自发光 bloom
             → 虚拟光源(暖核 + 冷halo) → 暗角

   ★ 关键认知（之前做错的地方）：
     官网 **没有** metaball、没有等值面、没有金属反射/折射、没有独立团块。
     它是一整片铺满全屏、无边界的柔和渐变场：
       - 局部梯度中位数 ≈ 1.3（极平滑）
       - 色相 98% 落在 210-240° 蓝区
     之前那个「一坨会动的铬球」在结构上就是错的，参数怎么调都对不上。

   ★ 参数全部取自官网，改动即偏离。
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return;

  /* ---------------- 官网参数（page chunk @26008，逐字抄录） ---------------- */
  const PARAMS = {
    type: 'fluid',
    mouseRadius: 0.09,
    mouseStrength: 1.8,
    mouseSmoothing: 0.1,
    mouseVelocity: 0.2,
    decay: 0.925,

    distortBoost: 2.2,
    noiseBoost: 0.3,
    swirlBoost: 0.8,
    glowIntensity: 0.13,
    glowColors: ['#fff7d1', '#538dca', '#2d448b'],

    speed: 28,
    distortion: 18,
    swirl: 20,
    swirlIterations: 12,

    scale: 1.77,
    rotation: 15,
    proportion: 60,
    softness: 80,
    shapeScale: 0,
    offsetX: -124,
    offsetY: -48,
    grain: 0.005,

    // 宿主可在加载本脚本前设置 window.__FLUID_COLORS_OVERRIDE__ 覆盖调色板（如浅色主题）
    colors: (typeof window !== 'undefined' && window.__FLUID_COLORS_OVERRIDE__)
      ? JSON.parse(window.__FLUID_COLORS_OVERRIDE__.replace(/'/g, '"'))
      : ['#000000', '#1A3870', '#204a7e', '#eed8aa', '#000000'],

    lightX: 0.89,
    lightY: 0.46,
    lightCore: 0.14,
    lightHalo: 0.2,
    vignette: 0.38,
    lightFollow: 0.63,
    bloomThreshold: 0.61,
    bloomRange: 0.18,
    bloomStrength: 0.4,
  };

  /* ---------------- 着色器（官网原文，仅调整缩进） ---------------- */

  const VERT = `#version 300 es
in vec4 a_position;
out vec2 vUv;
void main() {
  vUv = a_position.xy * 0.5 + 0.5;
  gl_Position = a_position;
}
`;

  /* Pass 1：flowmap 更新 */
  const FLOW_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D u_prev;
uniform vec2 u_mouse;
uniform vec2 u_velocity;
uniform float u_brushRadius;
uniform float u_brushStrength;
uniform float u_decay;
out vec4 fragColor;

void main() {
  vec4 prev = texture(u_prev, vUv);

  prev.r *= u_decay;
  prev.gb = mix(vec2(0.5), prev.gb, u_decay);

  float dist = distance(vUv, u_mouse);

  float influence = exp(-dist * dist / (u_brushRadius * u_brushRadius * 0.5));
  influence = max(0.0, influence - 0.01);

  float speed = length(u_velocity);
  float presenceStrength = u_brushStrength * 0.3;
  float velBonus = min(speed * 3.0, 0.7) * u_brushStrength;
  float totalStrength = presenceStrength + velBonus;

  prev.r = max(prev.r, influence * totalStrength);
  float blendAmt = influence * min(totalStrength, 0.4) * 0.3;
  prev.g = mix(prev.g, clamp(u_velocity.x * 2.0 + 0.5, 0.0, 1.0), blendAmt);
  prev.b = mix(prev.b, clamp(u_velocity.y * 2.0 + 0.5, 0.0, 1.0), blendAmt);

  fragColor = prev;
}
`;

  /* Pass 2：主渲染（type === "fluid" 走这一支）
     官网写的是 mediump，但 Ashima simplex 噪声的 permute 中间量会到 289²≈83521，
     超过 fp16 上限 65504 —— 桌面 GPU 通常把 mediump 提升为 fp32 所以官网没事，
     但严格实现 mediump 的环境（含部分移动端 GPU）会算崩。这里直接用 highp。 */
  const FLUID_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_c1, u_c2, u_c3, u_c4, u_c5;
uniform float u_scale;
uniform vec2 u_offset;
uniform float u_grain;
uniform float u_speed;
uniform sampler2D u_flowmap;
uniform float u_distortBoost;
uniform float u_swirlBoost;
uniform float u_glowIntensity;
uniform vec3 u_glowColor1;
uniform vec3 u_glowColor2;
uniform vec3 u_glowColor3;
uniform vec2 u_lightPos;
uniform float u_lightCore;
uniform float u_lightHalo;
uniform float u_vignette;
uniform float u_bloomThreshold;
uniform float u_bloomRange;
uniform float u_bloomStrength;
out vec4 fragColor;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float hash(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float fbm(vec3 p){
  float v=0.,amp=.6;vec3 shift=vec3(100.);
  for(int i=0;i<1;i++){v+=amp*snoise(p);p=p*2.+shift;amp*=.4;}
  return v;
}

float fluidNoise(vec2 uv,float t){
  float n1=fbm(vec3(uv*.6,t*.06));
  float n2=fbm(vec3(uv*.6+5.2,t*.06+1.3));
  vec2 w1=vec2(n1,n2)*.6;
  float n3=fbm(vec3((uv+w1)*.7+1.7,t*.05+3.1));
  float n4=fbm(vec3((uv+w1)*.7+9.2,t*.05+5.7));
  vec2 w2=vec2(n3,n4)*.5;
  return fbm(vec3((uv+w1+w2)*.5,t*.04));
}

vec2 curlish(vec2 uv,float t){
  float eps=.02;
  float n=snoise(vec3(uv*.8,t));
  float nx=snoise(vec3((uv+vec2(eps,0.))*.8,t));
  float ny=snoise(vec3((uv+vec2(0.,eps))*.8,t));
  return vec2(-(ny-n)/eps,(nx-n)/eps)*.003;
}

void main(){
  float aspect=u_resolution.x/u_resolution.y;
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 suv=vec2(uv.x*aspect, uv.y) * u_scale + u_offset;
  float t=u_time;

  vec4 flow = texture(u_flowmap, uv);
  float influence = flow.r;
  vec2 flowDir = (flow.gb - 0.5) * 2.0;

  suv += flowDir * influence * u_distortBoost * 0.8;

  float swirlAngle = influence * u_swirlBoost * 2.5;
  float cs = cos(swirlAngle), sn = sin(swirlAngle);
  vec2 delta = suv - vec2(uv.x * aspect, uv.y) * u_scale;
  suv += (mat2(cs, sn, -sn, cs) * delta - delta) * influence;

  vec2 curl=curlish(suv,t*.04);
  vec2 uvD=suv+curl*12.;
  float f=fluidNoise(uvD,t);
  float swirl=snoise(vec3(uvD*.8+f*1.5,t*.035))*.5+.5;
  float n=f*.5+.5;
  vec3 col=mix(u_c1,u_c2,smoothstep(.2,.5,n));
  col=mix(col,u_c3,smoothstep(.35,.65,n+swirl*.25));
  col=mix(col,u_c4,smoothstep(.6,.85,swirl)*.55);
  col=mix(col,u_c5,smoothstep(.5,.8,n*swirl)*.35);

  float glow = smoothstep(0.0, 0.8, influence);
  float glowNoise = snoise(vec3(uvD * 1.5, t * 0.08)) * 0.5 + 0.5;
  float glowDist = smoothstep(0.0, 1.0, influence);
  vec3 glowMix = mix(u_glowColor3, u_glowColor2, glowDist);
  glowMix = mix(glowMix, u_glowColor1, glowDist * glowNoise);
  col = mix(col, glowMix, glow * u_glowIntensity);

  if(u_grain>0.0){
    vec2 flowOffset = (uvD - suv) * u_resolution.y;
    vec2 gp = floor((gl_FragCoord.xy + flowOffset) / 5.0);
    float gr=hash(gp)*2.-1.;
    col+=gr*u_grain;
  }

  float luma=dot(col,vec3(.299,.587,.114));
  float bloom=smoothstep(u_bloomThreshold-u_bloomRange,u_bloomThreshold+u_bloomRange,luma);
  col+=(col*.85+vec3(.15,.145,.13))*bloom*u_bloomStrength;

  float ld=length((uv-u_lightPos)*vec2(aspect,1.));
  float core=exp(-ld*ld*4.5);
  float halo=exp(-ld*1.8);
  col+=vec3(1.,.97,.9)*core*u_lightCore+vec3(.72,.8,1.)*halo*u_lightHalo;

  float vig=1.-smoothstep(.35,.75,length(uv-.5));
  col=mix(col*(1.-u_vignette),col,vig);
  fragColor=vec4(col,1.);
}
`;

  /* ---------------- GL 初始化 ---------------- */

  const GL_ATTRS = {
    alpha: true, premultipliedAlpha: false,
    depth: false, stencil: false, antialias: false,
    preserveDrawingBuffer: false, powerPreference: 'low-power',
  };

  let gl = null;
  try { gl = canvas.getContext('webgl2', GL_ATTRS); } catch (e) { /* noop */ }
  if (!gl) { canvas.style.display = 'none'; return; }

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[fluid] compile:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function build(vsSrc, fsSrc) {
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[fluid] link:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  const flowProg = build(VERT, FLOW_FRAG);
  const mainProg = build(VERT, FLUID_FRAG);
  if (!flowProg || !mainProg) { canvas.style.display = 'none'; return; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function bindQuad(prog) {
    const a = gl.getAttribLocation(prog, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  }

  const FU = {};
  ['u_prev', 'u_mouse', 'u_velocity', 'u_brushRadius', 'u_brushStrength', 'u_decay']
    .forEach((n) => { FU[n] = gl.getUniformLocation(flowProg, n); });

  const MU = {};
  ['u_time', 'u_resolution', 'u_scale', 'u_offset', 'u_grain', 'u_speed', 'u_flowmap',
   'u_distortBoost', 'u_swirlBoost', 'u_glowIntensity',
   'u_glowColor1', 'u_glowColor2', 'u_glowColor3',
   'u_lightPos', 'u_lightCore', 'u_lightHalo',
   'u_vignette', 'u_bloomThreshold', 'u_bloomRange', 'u_bloomStrength',
   'u_c1', 'u_c2', 'u_c3', 'u_c4', 'u_c5']
    .forEach((n) => { MU[n] = gl.getUniformLocation(mainProg, n); });

  /* ---------------- 渲染目标（与官网一致：1/4 分辨率 RGBA8） ---------------- */

  function makeRT(w, h, data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { gl.deleteFramebuffer(fbo); gl.deleteTexture(tex); return null; }
    return { fbo, tex, w, h };
  }

  let VW = 0, VH = 0;      // 画布像素尺寸
  let FW = 0, FH = 0;      // flowmap 尺寸
  let rtP = null, rtQ = null, swap = false;

  function allocFlow(w, h) {
    const d = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      d[4 * i] = 0; d[4 * i + 1] = 128; d[4 * i + 2] = 128; d[4 * i + 3] = 255;
    }
    const a = makeRT(w, h, d);
    const b = makeRT(w, h, d);
    if (!a || !b) return false;
    if (rtP) { gl.deleteFramebuffer(rtP.fbo); gl.deleteTexture(rtP.tex); }
    if (rtQ) { gl.deleteFramebuffer(rtQ.fbo); gl.deleteTexture(rtQ.tex); }
    rtP = a; rtQ = b;
    return true;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.max(1, canvas.clientWidth || window.innerWidth);
    const ch = Math.max(1, canvas.clientHeight || window.innerHeight);
    VW = Math.round(cw * dpr);
    VH = Math.round(ch * dpr);
    canvas.width = VW;
    canvas.height = VH;
    FW = Math.max(8, Math.round(VW / 4));
    FH = Math.max(8, Math.round(VH / 4));
    return allocFlow(FW, FH);
  }

  /* ---------------- 颜色解析（官网：hex → /255，无 gamma 转换） ---------------- */

  function hex2rgb(h) {
    const t = String(h).replace('#', '');
    return [
      parseInt(t.slice(0, 2), 16) / 255,
      parseInt(t.slice(2, 4), 16) / 255,
      parseInt(t.slice(4, 6), 16) / 255,
    ];
  }

  /* ---------------- 指针 ---------------- */

  const mouse = { x: 0.5, y: 0.5, smoothX: 0.5, smoothY: 0.5, vx: 0, vy: 0, svx: 0, svy: 0 };
  const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const pointerEnabled = !isCoarse;

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = 1 - (e.clientY - r.top) / r.height;   // 官网：翻转成 y 向上
  }
  if (pointerEnabled) {
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length) onMove(e.touches[0]);
    }, { passive: true });
  }

  // 供 script.js 的粒子层复用同一股流
  const sharedFlow = { vx: 0, vy: 0, influence: 0 };
  window.__dshFlow = sharedFlow;

  /* ---------------- 主循环（官网锁 30fps） ---------------- */

  const FRAME_MS = 1000 / 30;
  const startedAt = performance.now();
  let lastTick = 0;
  let raf = 0;
  let ready = false;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { lastTick = now; return; }
    if (now - lastTick < FRAME_MS) return;
    lastTick = now - ((now - lastTick) % FRAME_MS);

    if (!ready) { ready = resize(); if (!ready) return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.round((canvas.clientWidth || window.innerWidth) * dpr);
    const ch = Math.round((canvas.clientHeight || window.innerHeight) * dpr);
    if (cw !== VW || ch !== VH) { ready = resize(); if (!ready) return; }

    const w = PARAMS;

    // 指针平滑（官网公式：用「目标与平滑值之差」当作速度来源）
    mouse.smoothX += (mouse.x - mouse.smoothX) * w.mouseSmoothing;
    mouse.smoothY += (mouse.y - mouse.smoothY) * w.mouseSmoothing;
    mouse.svx += ((mouse.x - mouse.smoothX) * 0.5 - mouse.svx) * w.mouseVelocity;
    mouse.svy += ((mouse.y - mouse.smoothY) * 0.5 - mouse.svy) * w.mouseVelocity;

    /* ---- Pass 1：flowmap ---- */
    const src = swap ? rtP : rtQ;
    const dst = swap ? rtQ : rtP;
    swap = !swap;

    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, FW, FH);
    gl.useProgram(flowProg);
    bindQuad(flowProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(FU.u_prev, 0);
    gl.uniform2f(FU.u_mouse, mouse.smoothX, mouse.smoothY);
    gl.uniform2f(FU.u_velocity, mouse.svx, mouse.svy);
    gl.uniform1f(FU.u_brushRadius, w.mouseRadius);
    gl.uniform1f(FU.u_brushStrength, pointerEnabled ? w.mouseStrength : 0);
    gl.uniform1f(FU.u_decay, w.decay);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    /* ---- Pass 2：主渲染 ---- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, VW, VH);
    gl.useProgram(mainProg);
    bindQuad(mainProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dst.tex);
    gl.uniform1i(MU.u_flowmap, 0);

    const time = (performance.now() - startedAt) * 0.001 * (w.speed / 100);
    gl.uniform1f(MU.u_time, time);
    gl.uniform2f(MU.u_resolution, VW, VH);
    gl.uniform1f(MU.u_scale, w.scale);
    gl.uniform2f(MU.u_offset, w.offsetX / 100, w.offsetY / 100);
    gl.uniform1f(MU.u_grain, w.grain);
    gl.uniform1f(MU.u_speed, w.speed);
    gl.uniform1f(MU.u_distortBoost, w.distortBoost);
    gl.uniform1f(MU.u_swirlBoost, w.swirlBoost);
    gl.uniform1f(MU.u_glowIntensity, w.glowIntensity);

    const g1 = hex2rgb(w.glowColors[0] || '#ffffff');
    const g2 = hex2rgb(w.glowColors[1] || w.glowColors[0] || '#ffffff');
    const g3 = hex2rgb(w.glowColors[2] || w.glowColors[0] || '#ffffff');
    gl.uniform3f(MU.u_glowColor1, g1[0], g1[1], g1[2]);
    gl.uniform3f(MU.u_glowColor2, g2[0], g2[1], g2[2]);
    gl.uniform3f(MU.u_glowColor3, g3[0], g3[1], g3[2]);

    const cLoc = [MU.u_c1, MU.u_c2, MU.u_c3, MU.u_c4, MU.u_c5];
    for (let i = 0; i < 5; i++) {
      const c = hex2rgb(w.colors[i] || w.colors[w.colors.length - 1] || '#000000');
      gl.uniform3f(cLoc[i], c[0], c[1], c[2]);
    }

    const lx = w.lightX + (mouse.smoothX - w.lightX) * (pointerEnabled ? w.lightFollow : 0);
    gl.uniform2f(MU.u_lightPos, lx, w.lightY);
    gl.uniform1f(MU.u_lightCore, w.lightCore);
    gl.uniform1f(MU.u_lightHalo, w.lightHalo);
    gl.uniform1f(MU.u_vignette, w.vignette);
    gl.uniform1f(MU.u_bloomThreshold, w.bloomThreshold);
    gl.uniform1f(MU.u_bloomRange, w.bloomRange);
    gl.uniform1f(MU.u_bloomStrength, w.bloomStrength);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 粗略估计指针处的流场强度，给粒子层
    const speed = Math.hypot(mouse.svx, mouse.svy);
    const totalStrength = w.mouseStrength * 0.3 + Math.min(speed * 3.0, 0.7) * w.mouseStrength;
    sharedFlow.influence = pointerEnabled ? Math.min(1, totalStrength) : 0;
    sharedFlow.vx = mouse.svx * (canvas.clientWidth || window.innerWidth);
    sharedFlow.vy = -mouse.svy * (canvas.clientHeight || window.innerHeight);
  }

  window.addEventListener('resize', () => { ready = resize(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); });
  canvas.addEventListener('webglcontextrestored', () => { window.location.reload(); });

  ready = resize();
  raf = requestAnimationFrame(frame);
})();

