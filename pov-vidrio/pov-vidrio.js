/**
 * POV · Vidrio acanalado (Cell) — fondo generativo para web.
 * Port a WebGL del generador "s04-vidrio-cell" del sistema visual de POV Brands Lab.
 *
 * Uso rápido (web component, sin dependencias):
 *   <script type="module" src="/pov-vidrio/pov-vidrio.js"></script>
 *   <pov-vidrio poster="/pov-vidrio/vidrio-cell-2560x1440.jpg"></pov-vidrio>
 *
 * Uso programático:
 *   import { createVidrio } from './pov-vidrio.js';
 *   const v = createVidrio(canvas, { reed: 0.0714, interactive: true });
 *   v.destroy();
 */

const PALETTE = {
  ink: '#191918',
  cell: '#8EB0C7',
  cream: '#E0DED5',
};

export const DEFAULTS = {
  // Geometría (unidades relativas a R = min(ancho, alto) del lienzo)
  reed: 0.0714,          // ancho de cada acanalado (0.0714·R ≈ 77 px en la story de 1080)
  refraction: 1.6,       // cuánto desplaza cada acanalado la imagen de detrás
  blob: [0.58, 0.42],    // centro de la mancha principal (fracción de ancho, alto)
  blobSize: [0.30, 0.46],// radios de la mancha principal (·R)
  blob2: [0.25, 0.78],   // mancha secundaria
  blob2Size: [0.18, 0.178],
  softness: 0.016,       // desenfoque de las manchas (·R). Es el "foco" del vidrio
  // Tono
  colors: PALETTE,
  grain: 0.022,          // grano sutil POV (0 = sin grano)
  grainFps: 12,          // el grano se renueva a 12 fps, como película
  // Movimiento
  animate: true,
  drift: 0.035,          // amplitud de la deriva de las manchas
  driftPeriod: 38,       // segundos por ciclo de deriva
  slide: 0.006,          // velocidad a la que el vidrio "se desliza" (·R por segundo)
  focusIntro: 1.8,       // segundos del rack focus de entrada (0 = sin intro)
  focusFrom: 6,          // el intro empieza con el desenfoque × este factor
  interactive: false,    // la mancha sigue suavemente al puntero
  follow: 0.12,          // cuánto la sigue (0–1)
  maxDpr: 1.5,           // tope de densidad de píxeles, por rendimiento
};

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uR;
uniform float uReed;
uniform float uRefr;
uniform float uSlide;
uniform vec2  uBlob;
uniform vec2  uBlobSize;
uniform vec2  uBlob2;
uniform vec2  uBlob2Size;
uniform float uSoft;
uniform vec3  uInk;
uniform vec3  uCell;
uniform vec3  uCream;
uniform float uGrain;
uniform float uSeed;

float reedShape(float x, float y, vec2 c, vec2 rad, float powr){
  float period = uReed;
  float xx = x + uSlide;
  float fr = fract(xx / period);
  float xs = x + (fr - 0.5) * period * uRefr;
  vec2 p = vec2(xs - c.x * uRes.x, y - c.y * uRes.y) / (rad * uR);
  float d = length(p);
  return pow(clamp(1.0 - d, 0.0, 1.0), powr);
}

// desenfoque gaussiano horizontal de la forma refractada (9 muestras)
float blurred(float x, float y, vec2 c, vec2 rad, float powr, float sigma){
  float acc = 0.0, wsum = 0.0;
  for (int i = -4; i <= 4; i++){
    float o = float(i) * 0.5;               // muestras a ±2σ
    float w = exp(-0.5 * o * o);
    acc += w * reedShape(x + o * sigma, y, c, rad, powr);
    wsum += w;
  }
  return acc / wsum;
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }

vec3 ramp(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = uInk, c1 = uCell * 0.55, c2 = uCell, c3 = uCream;
  if (t < 0.35) return mix(c0, c1, t / 0.35);
  if (t < 0.70) return mix(c1, c2, (t - 0.35) / 0.35);
  return mix(c2, c3, (t - 0.70) / 0.30);
}

void main(){
  float x = gl_FragCoord.x;
  float y = uRes.y - gl_FragCoord.y;            // origen arriba-izquierda
  float sigma = uSoft;
  float s1 = blurred(x, y, uBlob, uBlobSize, 1.2, sigma);
  float s2 = blurred(x, y, uBlob2, uBlob2Size, 1.5, sigma * 0.82) * 0.7;
  float base = 0.62 + 0.25 * (y / uRes.y);
  float v = base - 0.62 * s1 - 0.35 * s2;
  float fr = fract((x + uSlide) / uReed);
  float cs = cos(fr * 6.2831853);
  v += pow(max(cs, 0.0), 4.0) * 0.06 - pow(max(-cs, 0.0), 6.0) * 0.05;
  vec3 col = ramp(v);
  if (uGrain > 0.0){
    float l = dot(col, vec3(0.3333));
    float n = (hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 17.17) - 1.0) * 2.45; // ~N(0,1)
    col += n * uGrain * (3.2 * l * (1.0 - l) + 0.12);
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToRgb(h) {
  const s = h.replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}
const easeOut = t => 1 - Math.pow(1 - t, 3);

export function createVidrio(canvas, options = {}) {
  const o = { ...DEFAULTS, ...options, colors: { ...PALETTE, ...(options.colors || {}) } };
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uR', 'uReed', 'uRefr', 'uSlide', 'uBlob', 'uBlobSize', 'uBlob2', 'uBlob2Size', 'uSoft', 'uInk', 'uCell', 'uCream', 'uGrain', 'uSeed']
    .forEach(n => (U[n] = gl.getUniformLocation(prog, n)));

  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, running = false, visible = true, t0 = performance.now(), lastSeed = 0;
  let pointer = null, follow = [0, 0];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function draw(now) {
    resize();
    const w = canvas.width, h = canvas.height, R = Math.min(w, h);
    const t = (now - t0) / 1000;
    const anim = o.animate && !reduced;
    const ph = anim ? (t / o.driftPeriod) * Math.PI * 2 : 0;
    let bx = o.blob[0] + (anim ? o.drift * Math.sin(ph) : 0);
    let by = o.blob[1] + (anim ? o.drift * 0.6 * Math.sin(ph * 2 + 1.3) : 0);
    if (o.interactive && pointer && anim) {
      follow[0] += ((pointer[0] - o.blob[0]) * o.follow - follow[0]) * 0.04;
      follow[1] += ((pointer[1] - o.blob[1]) * o.follow - follow[1]) * 0.04;
    }
    bx += follow[0]; by += follow[1];
    const b2x = o.blob2[0] + (anim ? o.drift * 0.7 * Math.sin(ph * 1.3 + 2.1) : 0);
    const b2y = o.blob2[1] + (anim ? o.drift * 0.5 * Math.cos(ph * 0.9) : 0);
    let soft = o.softness * R;
    if (anim && o.focusIntro > 0 && t < o.focusIntro) soft *= 1 + (o.focusFrom - 1) * (1 - easeOut(t / o.focusIntro));
    if (anim && now - lastSeed > 1000 / o.grainFps) lastSeed = now;

    const c = o.colors;
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uR, R);
    gl.uniform1f(U.uReed, o.reed * R);
    gl.uniform1f(U.uRefr, o.refraction);
    gl.uniform1f(U.uSlide, anim ? t * o.slide * R : 0);
    gl.uniform2f(U.uBlob, bx, by);
    gl.uniform2f(U.uBlobSize, o.blobSize[0], o.blobSize[1]);
    gl.uniform2f(U.uBlob2, b2x, b2y);
    gl.uniform2f(U.uBlob2Size, o.blob2Size[0], o.blob2Size[1]);
    gl.uniform1f(U.uSoft, soft);
    gl.uniform3fv(U.uInk, hexToRgb(c.ink));
    gl.uniform3fv(U.uCell, hexToRgb(c.cell));
    gl.uniform3fv(U.uCream, hexToRgb(c.cream));
    gl.uniform1f(U.uGrain, o.grain);
    gl.uniform1f(U.uSeed, (lastSeed % 1000) / 10);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop(now) {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    if (!o.animate || reduced) { draw(performance.now()); return; }
    running = true; raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const onPointer = e => {
    const r = canvas.getBoundingClientRect();
    pointer = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  if (o.interactive) window.addEventListener('pointermove', onPointer, { passive: true });

  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([en]) => {
    visible = en.isIntersecting; visible && !document.hidden ? start() : stop();
  }) : null;
  io && io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : visible && start());
  document.addEventListener('visibilitychange', onVis);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => !running && draw(performance.now())) : null;
  ro && ro.observe(canvas);

  start();
  return {
    start, stop,
    renderFrame: (ms = 1e6) => draw(t0 + ms),
    setOptions(next) { Object.assign(o, next); if (!running) draw(performance.now()); },
    destroy() {
      stop(); io && io.disconnect(); ro && ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/* <pov-vidrio> — web component. Atributos: poster, interactive, static, grain, reed */
if (typeof customElements !== 'undefined' && !customElements.get('pov-vidrio')) {
  customElements.define('pov-vidrio', class extends HTMLElement {
    connectedCallback() {
      this.style.display = this.style.display || 'block';
      this.style.position = this.style.position || 'relative';
      const poster = this.getAttribute('poster');
      if (poster) Object.assign(this.style, { backgroundImage: `url("${poster}")`, backgroundSize: 'cover', backgroundPosition: 'center' });
      const c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.prepend(c);
      const num = (a, d) => (this.hasAttribute(a) ? parseFloat(this.getAttribute(a)) : d);
      this._v = createVidrio(c, {
        interactive: this.hasAttribute('interactive'),
        animate: !this.hasAttribute('static'),
        grain: num('grain', DEFAULTS.grain),
        reed: num('reed', DEFAULTS.reed),
      });
      if (!this._v) c.remove(); // sin WebGL: queda el póster
    }
    disconnectedCallback() { this._v && this._v.destroy(); }
  });
}
