// Modelo 3D do MLG ROVER Ω: gerado a partir do visualizador (model.js). Não edite aqui.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============ MODELO 3D (mm · X = frente, Y = cima, Z = direita) ============ */
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y_AX = V3(0, 1, 0), NEG_Y = V3(0, -1, 0);
const MAT = {};
const CAP = { value: 0 };
const CLIP = [new THREE.Plane(V3(0, 0, -1), 0)];
let CSG = null;
const EXPORT = typeof window !== 'undefined' && !!window.RV_EXPORT;   // guarda geometria crua + ferramentas de corte para gerar os STLs   // three-bvh-csg: abre os furos de verdade (sem ele, ficam só as marcas)

// marcas de camada (0,2 mm) nas peças impressas + tampa hachurada na vista em corte
function enhance(m) {
  const petg = !!m.userData.petg;
  m.side = m.userData.flat ? THREE.FrontSide : THREE.DoubleSide;
  m.clippingPlanes = CLIP;
  m.onBeforeCompile = sh => {
    sh.uniforms.uCap = CAP;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vUpV;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vOP = transformed;
      #ifdef USE_INSTANCING
        vUpV = normalize((modelViewMatrix * instanceMatrix * vec4(0.,1.,0.,0.)).xyz);
      #else
        vUpV = normalize((modelViewMatrix * vec4(0.,1.,0.,0.)).xyz);
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vUpV; uniform float uCap;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      ${petg ? `{ float lay = vOP.y * 5.0; float fw = fwidth(lay); float amp = 0.24 * clamp(1.5 - fw * 2.2, 0.0, 1.0);
        float wall = 1.0 - abs(dot(normal, vUpV)); normal = normalize(normal + vUpV * sin(lay * 6.2831853) * amp * wall); }` : ''}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if (uCap > 0.5 && !gl_FrontFacing) { float h = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.085)); gl_FragColor = vec4(diffuseColor.rgb * (0.5 + 0.32 * h) + 0.03, 1.0); }`);
  };
  m.customProgramCacheKey = () => (petg ? 'petg' : 'std') + m.side;
}
function initMaterials() {
  const S = (c, r, mt = 0, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: mt }, o));
  const P = (c, r) => { const m = S(c, r); m.userData.petg = true; return m; };
  Object.assign(MAT, {
    black: P(0x222226, .4), yellow: P(0xf2b10c, .36), tt: S(0xf9c623, .46), rubber: S(0x1b1b1d, .88),
    steel: S(0xc7cbcf, .24, 1), shaft: S(0xb7bcc1, .18, 1), white: S(0xeeede8, .48), copper: S(0xc8742c, .3, 1), brass: S(0xd3a64c, .3, 1),
    green: S(0x166b37, .42), red: S(0xb1211b, .42), blue: S(0x1f5fd6, .38), chip: S(0x26272a, .3, .3), gold: S(0xd8b04a, .26, 1),
    dark: S(0x0d0d0f, .55), sink: S(0x18181a, .36, .7), glass: S(0x05070a, .04, 1), pb: S(0x17171a, .28, .1), cam: S(0x111113, .32, .1),
    led: S(0x2dff8f, .3, 0, { emissive: 0x18ff80, emissiveIntensity: 1.4 }), ledB: S(0x3aa0ff, .3, 0, { emissive: 0x2a8cff, emissiveIntensity: 1.4 }),
    brown: S(0x3a2617, .55), tail: S(0xff2a1a, .3, 0, { emissive: 0x7a0a00 }), gearG: S(0xa3a8ae, .32, .6), gearG2: (() => { const m = S(0x8e9399, .4); m.userData.petg = true; return m; })(), nyloc: S(0xffffff, .3, .7, { vertexColors: true }),
    wR: S(0xd32f2f, .5), wK: S(0x171717, .5), wY: S(0xf2c200, .5), wG: S(0x2e9d4a, .5), wB: S(0x2c6fe0, .5), wP: S(0x8e44ad, .5), wO: S(0xf07a1a, .5), wW: S(0xdddddd, .5), wBr: S(0x6b3e1f, .5),
    rock: S(0x6f6a63, .95), petgG: P(0x8e9399, .42), petgN: P(0xe6e1d3, .36), hole: S(0x050506, .95),
    co2: S(0x8a1d1a, .32, .35), alu: S(0xa9adb2, .3, .9), tpu: S(0x2a2c30, .85), hose: S(0x3d8bff, .25, 0, { transparent: true, opacity: .72 }), lipo: S(0x1d3f8a, .45),
    mdf: S(0xc4a27a, .78), mdfE: S(0x4b2f1c, .9),
    prop: S(0xf26b1d, .42), eva: S(0x1b1c1f, .93), esc: S(0x2a59c9, .38), glue: S(0xf4f1e8, .3, 0, { transparent: true, opacity: .6 }),
  });
}
function textTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const decalMat = (tex, transparent = true) => { const m = new THREE.MeshStandardMaterial({ map: tex, transparent, roughness: .45, polygonOffset: true, polygonOffsetFactor: -2 }); m.userData.flat = true; return m; };

class Builder {
  constructor() { this.cache = new Map(); this.parts = new Map(); this.pick = []; this.inst = undefined; }
  reg(p) { let r = this.parts.get(p); if (!r) { r = { meshes: [], mats: new Set() }; this.parts.set(p, r); } return r; }
  mat(p, base) {
    const k = p + '|' + base.uuid; let m = this.cache.get(k);
    if (!m) {
      m = base.clone(); m.userData = { ...base.userData };
      m.userData.base = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite, emissive: m.emissive.clone(), ei: m.emissiveIntensity };
      enhance(m); this.cache.set(k, m); this.reg(p).mats.add(m);
    }
    return m;
  }
  mesh(geo, base, p, sub, parent, shadow = true) {
    const me = new THREE.Mesh(geo, this.mat(p, base));
    me.castShadow = shadow; me.receiveShadow = true; Object.assign(me.userData, { part: p, sub, inst: this.inst, cs: shadow });
    this.reg(p).meshes.push(me); this.pick.push(me); if (parent) parent.add(me); return me;
  }
  meshMDF(geo, p, sub, parent) {   // grupo 0 do ExtrudeGeometry = faces · grupo 1 = bordas (queimadas pelo laser)
    const me = new THREE.Mesh(geo, [this.mat(p, MAT.mdf), this.mat(p, MAT.mdfE)]);
    me.castShadow = true; me.receiveShadow = true; Object.assign(me.userData, { part: p, sub, inst: this.inst, cs: true, mdf: true });
    this.reg(p).meshes.push(me); this.pick.push(me); if (parent) parent.add(me); return me;
  }
}
const mat0 = m => Array.isArray(m.material) ? m.material[0] : m.material;
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: (w, h, d, r = 1.2, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - .01, h / 2 - .01, d / 2 - .01)),
  cylY: (r, h, s = 28) => new THREE.CylinderGeometry(r, r, h, s),
  cylX: (r, h, s = 28) => new THREE.CylinderGeometry(r, r, h, s).rotateZ(Math.PI / 2),
  cylZ: (r, h, s = 28) => new THREE.CylinderGeometry(r, r, h, s).rotateX(Math.PI / 2),
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const v2 = a => a.map(([x, y]) => new THREE.Vector2(x, y));
const circ = (cx, cz, r, n = 18) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cz + r * Math.sin(i / n * 2 * Math.PI)]);
const hexPts = (cx, cz, af) => { const R = af / Math.sqrt(3); return Array.from({ length: 6 }, (_, i) => [cx + R * Math.cos(i * Math.PI / 3), cz + R * Math.sin(i * Math.PI / 3)]); };
function rr(x0, x1, z0, z1, r = 4, n = 6) {
  const p = [];
  for (const [cx, cz, a0] of [[x1 - r, z0 + r, -90], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, 90], [x0 + r, z0 + r, 180]])
    for (let i = 0; i <= n; i++) { const a = (a0 + 90 * i / n) * DEG; p.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); }
  return p;
}
// união de dois polígonos convexos que contêm o ponto c: contorno em estrela visto de c
function unionStar(A, B, c) {
  const inside = (P, p) => { let sg = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(cr) < 1e-7) continue; const k = Math.sign(cr); if (!sg) sg = k; else if (k !== sg) return false; } return true; };
  const dense = P => { const o = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5)); for (let k = 0; k < n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
  const pts = [...dense(A).filter(p => !inside(B, p)), ...dense(B).filter(p => !inside(A, p))];
  return pts.sort((p, q) => Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(q[1] - c[1], q[0] - c[0]));
}
// placa no plano XZ extrudada para cima; furos como listas de pontos (x, z)
// chanfro na medida certa: triangula o contorno já recuado (furos já alargados) e deixa o chanfro do
// ExtrudeGeometry crescer de volta até a medida nominal — nada de triângulos virados perto de furos
function insetShape(shape, c, seg = 12) {
  if (!(c > 0)) return shape;
  const ex = shape.extractPoints(seg);
  const off = (pts, d) => {
    pts = pts.map(p => p.clone()).filter((p, i, A) => i === 0 || p.distanceTo(A[i - 1]) > 1e-6); if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();   // sem pontos repetidos (arco emendado em reta)
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    const n = pts.length, r = [];
    for (let i = 0; i < n; i++) {
      const p = pts[(i + n - 1) % n], v = pts[i], q = pts[(i + 1) % n];
      const d1 = v.clone().sub(p).normalize(), d2 = q.clone().sub(v).normalize(), n1 = new THREE.Vector2(d1.y, -d1.x), n2 = new THREE.Vector2(d2.y, -d2.x), m = n1.clone().add(n2), ml = m.length();
      if (ml < 1e-6) { r.push(v.clone().addScaledVector(n1, d)); continue; }
      m.divideScalar(ml); r.push(v.clone().addScaledVector(m, d / Math.max(.35, m.dot(n1))));
    }
    return r;
  };
  const s = new THREE.Shape(off(ex.shape, -c)); for (const h of ex.holes) s.holes.push(new THREE.Path(off(h, c)));
  return s;
}
function plate(outline, holes, t, bevel = 0) {
  const sh = new THREE.Shape(v2(outline.map(([x, z]) => [x, -z])));
  // furos sempre anti-horários: com o contorno espelhado (horário) o ExtrudeGeometry não os corrige e as paredes ficavam do avesso
  for (const h of holes) { const pts = v2(h.map(([x, z]) => [x, -z])); if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse(); sh.holes.push(new THREE.Path(pts)); }
  const g = new THREE.ExtrudeGeometry(insetShape(sh, bevel, 10), { depth: Math.max(.2, t - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); if (bevel) g.translate(0, bevel, 0); return g;
}
// perfil no plano XY extrudado em Z, centrado
function prism(shape, depth, bevel = 0, seg = 16) {
  const g = new THREE.ExtrudeGeometry(insetShape(shape, bevel, seg), { depth: Math.max(.2, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: seg });
  g.translate(0, 0, -depth / 2 + bevel); return g;
}
// placa com cantos arredondados e furos verticais (x, z, raio); centrada em y
const pad = (w, h, d, holes = [], r = 1.4) => plate(rr(-w / 2, w / 2, -d / 2, d / 2, Math.min(r, w / 2 - .1, d / 2 - .1), 4), holes.map(([x, z, rh = 2.2]) => circ(x, z, rh)), h, Math.min(.45, h / 4)).translate(0, -h / 2, 0);
const tube = (ri, ro, h, seg = 32) => new THREE.LatheGeometry(v2([[ri, -h / 2], [ro, -h / 2], [ro, h / 2], [ri, h / 2], [ri, -h / 2]]), seg);   // perfil anti-horário: normais para fora
function bar(b, base, p, sub, parent, a, c, w = 6) {
  const A = V3(...a), C = V3(...c), d = C.clone().sub(A);
  const me = b.mesh(G.rbox(w, d.length() + w * .6, w, 1.1), base, p, sub, parent);
  me.position.copy(A).add(C).multiplyScalar(.5); me.quaternion.setFromUnitVectors(Y_AX, d.normalize()); return me;
}

/* ---------- fixadores M4 e peças de precisão impressas (instanciados) ---------- */
const FGEO = {};
const nonIdx = gs => mergeGeometries(gs.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }));
const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), col = new THREE.Color(c); for (let i = 0; i < n; i++) col.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
function threadLathe(L, top = 0, seg = 14) {
  const p = [[0, -L], [1.5, -L], [1.96, -L + .45]];
  for (let y = -L + .8; y < top - .6; y += .7) p.push([1.98, y], [1.62, y + .35]);
  p.push([1.98, top - .3], [1.98, top + .05], [0, top + .05]);
  return new THREE.LatheGeometry(v2(p), seg);
}
function hexHole(R) { const h = new THREE.Path(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; i ? h.lineTo(R * Math.cos(a), R * Math.sin(a)) : h.moveTo(R * Math.cos(a), R * Math.sin(a)); } h.closePath(); return h; }
function fgeo(key) {
  if (FGEO[key]) return FGEO[key];
  const [t, Ls] = key.split('-'), L = +Ls; let g;
  if (t === 'shcs') { // ISO 4762 M4: cabeça Ø7 × 4, sextavado interno 3 mm
    const ring = new THREE.Shape(); ring.absarc(0, 0, 3.15, 0, Math.PI * 2, false); ring.holes.push(hexHole(2.05));
    const top = new THREE.ExtrudeGeometry(ring, { depth: 1.6, bevelEnabled: true, bevelThickness: .35, bevelSize: .35, bevelSegments: 2, curveSegments: 22 }).rotateX(-Math.PI / 2).translate(0, 2.05, 0);
    g = nonIdx([top, G.cylY(3.5, 2, 24).translate(0, 1, 0), threadLathe(L)]);
  } else if (t === 'csk') { // ISO 10642 M4: cabeça escareada Ø8, 90°, sextavado 2,5 mm
    const ring = new THREE.Shape(); ring.absarc(0, 0, 3.75, 0, Math.PI * 2, false); ring.holes.push(hexHole(1.7));
    const top = new THREE.ExtrudeGeometry(ring, { depth: .3, bevelEnabled: true, bevelThickness: .15, bevelSize: .25, bevelSegments: 1, curveSegments: 22 }).rotateX(-Math.PI / 2).translate(0, -.45, 0);
    const cone = new THREE.LatheGeometry(v2([[0, -.9], [1.98, -2.2], [3.95, -.4], [0, -.45]]), 24);
    g = nonIdx([top, cone, threadLathe(L, -2.1)]);
  } else if (t === 'nut') { // ISO 4032 M4: 7 mm entre faces × 3,2
    const s = new THREE.Shape(v2(hexPts(0, 0, 6.6))); const h = new THREE.Path(); h.absarc(0, 0, 2.05, 0, Math.PI * 2, true); s.holes.push(h);
    g = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelThickness: .3, bevelSize: .2, bevelSegments: 1, curveSegments: 16 }).rotateX(-Math.PI / 2).translate(0, .3, 0);
  } else if (t === 'nyloc') { // ISO 10511 M4: sextavado + anel de náilon azul
    const s = new THREE.Shape(v2(hexPts(0, 0, 6.6))); const h = new THREE.Path(); h.absarc(0, 0, 2.05, 0, Math.PI * 2, true); s.holes.push(h);
    const hx = paint(new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelThickness: .3, bevelSize: .2, bevelSegments: 1, curveSegments: 16 }).rotateX(-Math.PI / 2).translate(0, .3, 0), 0xc7cbcf);
    const dome = paint(new THREE.CylinderGeometry(3.1, 3.4, 1.7, 24, 1, true).translate(0, 3.95, 0), 0xc7cbcf);
    const ny = paint(new THREE.RingGeometry(2, 3.1, 24).rotateX(-Math.PI / 2).translate(0, 4.8, 0), 0x2f6fd8);
    g = nonIdx([hx, dome, ny]);
  } else if (t === 'washer') { // ISO 7089 M4: Ø9 × 0,8
    const s = new THREE.Shape(); s.absarc(0, 0, 4.5, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, 2.2, 0, Math.PI * 2, true); s.holes.push(h);
    g = new THREE.ExtrudeGeometry(s, { depth: .8, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2);
  } else if (t === 'insert') { // inserto térmico M4 × 8,1 de latão, recartilhado
    const pts = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, r = i % 2 ? 2.62 : 2.92; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    const s = new THREE.Shape(v2(pts)); const h = new THREE.Path(); h.absarc(0, 0, 1.9, 0, Math.PI * 2, true); s.holes.push(h);
    g = new THREE.ExtrudeGeometry(s, { depth: 8.1, bevelEnabled: false, curveSegments: 12 }).rotateX(Math.PI / 2);
  } else if (t === 'bearing') { // rolamento de rolos impresso no lugar: Ø16, furo Ø6 (eixo) ou Ø4,4 (parafuso), 10 rolos Ø2,5
    const ri = L === 4 ? 2.2 : 3, h = L === 4 ? 2.5 : 2;
    const ring = (a, b) => new THREE.LatheGeometry(v2([[a, -h], [b, -h], [b, h], [a, h], [a, -h]]), 36);
    const rol = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rol.push(new THREE.CylinderGeometry(1.22, 1.22, 2 * h - .5, 12).translate(5.45 * Math.cos(a), 0, 5.45 * Math.sin(a))); }
    g = nonIdx([ring(ri, 4.1), ring(6.8, 8), ...rol]);
  } else if (t === 'bush') { // bucha impressa Ø8 × 4 com furo Ø4,3 para o parafuso M4
    g = new THREE.LatheGeometry(v2([[2.15, -2], [4, -2], [4, 2], [2.15, 2], [2.15, -2]]), 28);
  } else if (t === 'm2') { // parafuso do servo M2 auto-atarraxante, cabeça panela Ø4 (vem com o MG90S)
    g = nonIdx([G.cylY(2, 1.5, 18).translate(0, .75, 0), new THREE.LatheGeometry(v2([[0, -L], [.55, -L + .7], [1, -L + 1.2], [1, .05], [0, .05]].reverse()), 12)]);
  } else if (t === 'p3' || t === 'p25') { // cabeça panela Phillips (DIN 7985): M3 Ø5,6 × 2,4 · M2,5 Ø4,5 × 1,8
    const R = t === 'p3' ? 2.8 : 2.25, H = t === 'p3' ? 2.4 : 1.8, r = t === 'p3' ? 1.5 : 1.25;
    const head = new THREE.LatheGeometry(v2([[0, 0], [R, 0], [R, H * .5], [R * .93, H * .83], [R * .7, H * .98], [0, H]]), 22);
    const cr = new THREE.BoxGeometry(R * 1.1, .5, .55).translate(0, H + .02, 0), cr2 = cr.clone().rotateY(Math.PI / 2);
    g = nonIdx([head, paint(cr, 0x2a2a2a), paint(cr2, 0x2a2a2a), G.cylY(r, L, 12).translate(0, -L / 2, 0)].map(x => x.attributes.color ? x : paint(x, 0xc7cbcf)));
  } else if (t === 'n3' || t === 'n25' || t === 'y3') { // porcas M3 (5,5 × 2,4), M2,5 (5 × 2) e autotravante M3 (5,5 × 4)
    const af = t === 'n25' ? 4.6 : 5.1, hr = t === 'n25' ? 1.3 : 1.55, dp = t === 'n25' ? 1.6 : 1.9;
    const s = new THREE.Shape(v2(hexPts(0, 0, af))); const h = new THREE.Path(); h.absarc(0, 0, hr, 0, Math.PI * 2, true); s.holes.push(h);
    const hx = paint(new THREE.ExtrudeGeometry(s, { depth: dp, bevelEnabled: true, bevelThickness: .25, bevelSize: .2, bevelSegments: 1, curveSegments: 14 }).rotateX(-Math.PI / 2).translate(0, .25, 0), 0xc7cbcf);
    g = t === 'y3' ? nonIdx([hx, paint(new THREE.CylinderGeometry(2.4, 2.65, 1.5, 22, 1, true).translate(0, 3.15, 0), 0xc7cbcf), paint(new THREE.RingGeometry(1.5, 2.4, 22).rotateX(-Math.PI / 2).translate(0, 3.9, 0), 0x2f6fd8)]) : hx;
  } else if (t === 'holeM') { // abertura de furo Ø4,4 (marca escura rente à superfície)
    g = new THREE.CylinderGeometry(2.2, 2.2, .5, 20).translate(0, -.27, 0);
  } else if (t === 'pin') { // pino-guia impresso Ø4
    g = new THREE.LatheGeometry(v2([[0, -2.4], [1.6, -2.4], [2, -2], [2, 0], [0, 0]]), 18);
  }
  return (FGEO[key] = g);
}
const FMETA = {
  shcs: { part: 'parafusos', mat: 'steel', fly: 1 }, m2: { part: 'parafusos', mat: 'steel', fly: 1 }, csk: { part: 'parafusos', mat: 'steel', fly: 1 }, nut: { part: 'porcas', mat: 'steel', fly: -1 },
  nyloc: { part: 'porcas', mat: 'nyloc', fly: -1 }, washer: { part: 'porcas', mat: 'steel', fly: -.5 }, insert: { part: 'insertos', mat: 'brass', fly: 0 },
  bearing: { part: 'rolamentos', mat: 'petgN', fly: 0 }, p3: { part: 'parafusos', mat: 'nyloc', fly: 1 }, p25: { part: 'parafusos', mat: 'nyloc', fly: 1 },
  n3: { part: 'porcas', mat: 'nyloc', fly: -1 }, y3: { part: 'porcas', mat: 'nyloc', fly: -1 }, n25: { part: 'porcas', mat: 'nyloc', fly: -1 }, bush: { part: 'rolamentos', mat: 'petgN', fly: 0 }, pin: { part: 'autoshift', mat: 'yellow', fly: 0 },
};

/* ---------- roda Ø68 × 26 (face externa em +Z, cubo do lado de dentro) ---------- */
let WHEEL;
function wheelGeos() {
  if (WHEEL) return WHEEL;
  const prof = [[22.6, -12.2], [25.5, -13], [29.4, -12.8], [31.1, -11.6], [31.6, -8.5], [31.7, 0], [31.6, 8.5], [31.1, 11.6], [29.4, 12.8], [25.5, 13], [22.6, 12.2]];
  const tire = new THREE.LatheGeometry(v2(prof), 56).rotateX(Math.PI / 2);
  const lugs = [], N = 20;
  for (let i = 0; i < N; i++) for (const side of [-1, 1]) {
    const a = (i + (side > 0 ? .5 : 0)) / N * Math.PI * 2, g = G.rbox(6.4, 2.6, 9.2, .8, 2);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(side * 22 * DEG));
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 32.6, side * 6.1));
    g.applyMatrix4(new THREE.Matrix4().makeRotationZ(a)); lugs.push(g);
    const sh = G.rbox(5, 4.4, 2.2, .6, 2); sh.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 28.6, side * 12.6)); sh.applyMatrix4(new THREE.Matrix4().makeRotationZ(a + Math.PI / N)); lugs.push(sh);
  }
  const face = new THREE.Shape(); face.absarc(0, 0, 22.2, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) {
    const a0 = i * 60 + 13, a1 = i * 60 + 47, pts = [];
    for (let k = 0; k <= 6; k++) { const a = (a0 + (a1 - a0) * k / 6) * DEG; pts.push([19 * Math.cos(a), 19 * Math.sin(a)]); }
    for (let k = 6; k >= 0; k--) { const a = (a0 + 5 + (a1 - a0 - 10) * k / 6) * DEG; pts.push([10 * Math.cos(a), 10 * Math.sin(a)]); }
    face.holes.push(new THREE.Path(v2(pts)));
  }
  face.holes.push(new THREE.Path(v2(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [Math.max(-1.9, Math.min(1.9, 2.75 * Math.cos(a))), 2.75 * Math.sin(a)]; }))));
  WHEEL = {
    tire, tread: mergeGeometries(lugs.map(g => (g.index ? g.toNonIndexed() : g))),
    barrel: new THREE.CylinderGeometry(23, 23, 24.4, 48, 1, true).rotateX(Math.PI / 2),
    face: prism(face, 3.6, .7, 40).translate(0, 0, 10.6),
    lip: new THREE.TorusGeometry(22.7, 1.5, 10, 56).translate(0, 0, 12.3),
    lipIn: new THREE.TorusGeometry(22.7, 1.2, 10, 56).translate(0, 0, -12.2),
    hub: new THREE.LatheGeometry(v2([[2.9, -13.2], [7.4, -13.2], [8, -12.4], [8, -2], [6.4, -1], [2.9, -1], [2.9, -13.2]]), 32).rotateX(Math.PI / 2),   // cubo do lado de dentro: o eixo do TT entra direto
  };
  return WHEEL;
}
function buildWheel(b, parent, pos) {
  const W = wheelGeos(), w = new THREE.Group(); w.position.copy(pos); parent.add(w);
  const sp = new THREE.Group(); w.add(sp);
  b.mesh(W.tire, MAT.rubber, 'rodas', 'Pneu', sp); b.mesh(W.tread, MAT.rubber, 'rodas', 'Cravos em V do pneu', sp);
  b.mesh(W.barrel, MAT.yellow, 'rodas', 'Aro', sp); b.mesh(W.face, MAT.yellow, 'rodas', 'Face do aro (6 raios)', sp);
  b.mesh(W.lip, MAT.yellow, 'rodas', 'Borda do aro', sp); b.mesh(W.lipIn, MAT.yellow, 'rodas', 'Borda do aro', sp); b.mesh(W.hub, MAT.yellow, 'rodas', 'Cubo com furo duplo-D', sp);
  return sp;
}

/* ---------- motor TT ---------- */
let TTG;
function ttGeos() {
  if (TTG) return TTG;
  const s = new THREE.Shape(v2(rr(-18.5, 18.5, -11.25, 11.25, 3.2).map(([x, y]) => [x, y])));
  for (const y of [-6.5, 6.5]) { const h = new THREE.Path(); h.absarc(-14.5, y, 1.6, 0, Math.PI * 2, true); s.holes.push(h); }
  const dS = new THREE.Shape(v2(Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2; return [2.7 * Math.cos(a), Math.max(-1.85, Math.min(1.85, 2.7 * Math.sin(a)))]; })));
  TTG = { body: prism(s, 18.8, .7, 8), can: new THREE.CylinderGeometry(10, 10, 26, 32).rotateZ(Math.PI / 2).scale(1, 1, .78), dshaft: prism(dS, 36, 0, 8) };
  return TTG;
}

/* ============================ ROVER 100% MDF 3 mm (corte a laser) ============================
   Toda peça estrutural é uma chapa de MDF de 3 mm com contorno e furos em 2D (as mesmas coordenadas viram
   os arquivos de corte). Peças grossas = 2 a 4 camadas coladas. Encaixes por abas e rasgos + cola branca. */
const TH = 3;
const RB = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const CI = (cx, cy, r, n) => { const p = circ(cx, cy, r, n || Math.max(16, Math.round(r * 8))); p.circle = [cx, cy, r]; return p; };
const sArea = P => { let a = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; a += x0 * y1 - x1 * y0; } return a / 2; };
const arcP = (cx, cy, r, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * DEG; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const TAB = (w, d = TH) => [[-w / 2, 0], [-w / 2, d], [w / 2, d], [w / 2, 0]];
// fenda T para parafuso M3 + porca M3 (5,5 × 2,4): entra pela borda
const TNUT = [[-1.7, 0], [-1.7, -7], [-2.8, -7], [-2.8, -9.6], [-1.7, -9.6], [-1.7, -14], [1.7, -14], [1.7, -9.6], [2.8, -9.6], [2.8, -7], [1.7, -7], [1.7, 0]];
// contorno anti-horário + recursos nas arestas: feats[i] = [[centro (coordenada absoluta no eixo da aresta), forma (t ao longo, n para fora)], ...]
function tabbed(P, feats = {}) {
  if (sArea(P) < 0) console.warn('MDF: contorno horário', P);
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], c = P[(i + 1) % P.length]; out.push(a);
    const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const k = Math.abs(dx) >= Math.abs(dy) ? 0 : 1, uk = k ? uy : ux;
    const list = (feats[i] || []).map(([cc, sh]) => [(cc - a[k]) / uk, sh]).sort((p, q) => p[0] - q[0]);
    for (const [s, sh] of list) for (const [t, n] of sh) out.push([a[0] + ux * (s + t) + nx * n, a[1] + uy * (s + t) + ny * n]);
  }
  return out;
}
function shapeOf(outline, holes) {
  const s = new THREE.Shape(v2(sArea(outline) > 0 ? outline : outline.slice().reverse()));
  for (const h of holes) s.holes.push(new THREE.Path(v2(sArea(h) > 0 ? h.slice().reverse() : h)));
  return s;
}
// plano 'xz': u → x, v → z, espessura +y · 'xy': u → x, v → y, espessura +z · 'zy': u → z, v → y, espessura +x
function mdfGeo(outline, holes, plane, d = TH) {
  const g = new THREE.ExtrudeGeometry(shapeOf(outline, holes), { depth: d, bevelEnabled: false, curveSegments: 6 });
  if (plane === 'xz') g.rotateX(Math.PI / 2).translate(0, d, 0);
  else if (plane === 'zy') g.rotateY(-Math.PI / 2).translate(d, 0, 0);
  g.deleteAttribute('uv'); return g;
}
function mkMDF(b, R) {
  return (parent, part, sub, code, plane, off, outline, holes = [], o = {}) => {
    const d = o.d || TH, me = b.meshMDF(mdfGeo(outline, holes, plane, d), part, sub, parent);
    if (plane === 'xz') me.position.y = off; else if (plane === 'xy') me.position.z = off; else me.position.x = off;
    if (o.exp !== false) (o.sheet === 2 ? R.cut2 : R.cut).push({ code, name: o.name || sub, part, outline, holes, qty: o.qty || 1, d });   // sheet 2: chapinha da sucção
    me.userData.code = code;
    return me;
  };
}

/* ---------- motor TT (eixo no ponto pos, carcaça girada rz em torno de z) ---------- */
function buildTT(b, R, parent, pos, rz, key) {
  const T = ttGeos(), g = new THREE.Group(); g.position.copy(pos); g.rotation.z = rz; parent.add(g);
  at(b.mesh(T.body, MAT.tt, 'motor', 'Caixa de redução 1:48 do TT', g), -7.5, 0, 0);
  at(b.mesh(T.can, MAT.steel, 'motor', 'Motor DC 130', g), -39, 0, 0);
  at(b.mesh(G.rbox(5, 21.5, 18, 1), MAT.white, 'motor', 'Presilha do motor', g), -34.7, 0, 0);
  at(b.mesh(G.cylX(9.4, 2.6, 28).scale(1, 1, .8), MAT.brown, 'motor', 'Tampa das escovas', g), -53.3, 0, 0);
  for (const dy of [4.6, -4.6]) at(b.mesh(G.rbox(1.2, 3.2, 1.6, .3), MAT.copper, 'motor', 'Terminal soldado', g), -55.1, dy, 0);
  const sh = b.mesh(T.dshaft, MAT.white, 'motor', 'Eixo duplo-D do TT (8,6 mm de cada lado)', g);
  const a1 = at(new THREE.Object3D(), -56.5, 4.6, 0), a2 = at(new THREE.Object3D(), -56.5, -4.6, 0); g.add(a1, a2);
  R.anchors[key + '+'] = a1; R.anchors[key + '-'] = a2; R.shafts.push(sh);
  return g;
}

/* ============================ montagem do rover ============================ */
const WZ0 = 34.5, WZ1 = 37.5;            // paredes laterais (face de dentro / de fora)
const KP = [82.5, 61.8];                  // pino-mestre (x, |z|): no plano do meio do motor TT
const SX = 25.6;                          // centro do corpo do servo (eixo em x = 31,1)
function buildRover() {
  initMaterials();
  const b = new Builder();
  const stand = new THREE.Group(); stand.position.set(82.5, 0, 0);
  const root = new THREE.Group(); root.position.set(-82.5, 0, 0); stand.add(root);
  const R = { stand, root, b, groups: [], anchors: {}, spinners: [], shafts: [], wires: [], fast: [], tex: {}, cut: [], cut2: [] };
  const grp = (name, ex, step, parent = root, pos) => {
    const g = new THREE.Group(); g.name = name; if (pos) g.position.copy(pos);
    Object.assign(g.userData, { base: g.position.clone(), ex: V3(...ex), step }); parent.add(g); R.groups.push(g); return g;
  };
  R.F = (type, L, joint, step, group, pos, dir) => R.fast.push({ type, L, joint, step, group, pos: pos.clone(), dir: dir.clone().normalize() });
  R.holes = []; R.H = () => {}; R.cuts = []; R.C = () => {};
  const label = (w, h, lines, bg) => textTex(w, h, (x, W, H) => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, W, H); } else x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.82)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach(([t, f, y]) => { x.font = f; x.fillText(t, W / 2, y); });
  });
  const M = mkMDF(b, R), sides = [-1, 1], zz = (s, a, c) => s > 0 ? [a, c] : [-c, -a];

  /* ---- 1. chassi: 2 camadas (a de baixo tem as línguas dos pinos das mangas) ---- */
  const gCh = grp('chassi', [0, 0, 0], 1);
  const WALLX = [-84, -36, 12, 36];
  const chSlots = [CI(-12, 0, 15.5), RB(-72.8, -66.8, -8, 8), RB(-53.2, -47.2, -8, 8)];   // ventoinha do kit · bochechas do garfo
  for (const s of sides) {
    for (const x of WALLX) chSlots.push(RB(x - 6, x + 6, ...zz(s, WZ0, WZ1)));            // paredes laterais
    chSlots.push(RB(-101, -98, ...zz(s, 16, 28)));                                         // painel traseiro
    for (const x of [17, 34]) chSlots.push(RB(x - 3, x + 3, ...zz(s, 9, 12)));             // paredes do suporte do servo
  }
  const frontTabs = [[-18, TAB(12, 6)], [18, TAB(12, 6)]];                                 // entram no para-choque
  M(gCh, 'chassi', 'Chassi · camada de cima', 'CH1', 'xz', 19, tabbed([[-105, -40.5], [105, -40.5], [105, 40.5], [-105, 40.5]], { 1: frontTabs }), chSlots);
  const dz = Math.sqrt(81 - 56.25), aL = Math.atan2(dz, 7.5) / DEG;
  const chB = [[-105, -40.5], [75, -40.5], [75, -KP[1] + dz], ...arcP(KP[0], -KP[1], 9, 180 - aL, 360 + aL, 20).slice(1, -1), [90, -KP[1] + dz], [90, -40.5], [105, -40.5],
    [105, 40.5], [90, 40.5], [90, KP[1] - dz], ...arcP(KP[0], KP[1], 9, -aL, 180 + aL, 20).slice(1, -1), [75, KP[1] - dz], [75, 40.5], [-105, 40.5]];
  const iF = chB.findIndex(p => p[0] === 105 && p[1] === -40.5);
  M(gCh, 'chassi', 'Chassi · camada de baixo (línguas dos pinos das mangas)', 'CH2', 'xz', 16, tabbed(chB, { [iF]: frontTabs }), [...chSlots, CI(KP[0], -KP[1], 4.2), CI(KP[0], KP[1], 4.2)]);
  at(b.mesh(new THREE.PlaneGeometry(22, 5.5).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), decalMat(label(440, 110, [['MLG Ω · MDF', '700 64px "Barlow Condensed", Arial', 58]])), 'chassi', 'Gravação no chassi', gCh, false), 98, 22.05, -18);

  /* ---- 2. garfo do pivô traseiro (2 bochechas de 2 camadas) e suporte do servo ---- */
  const gFk = grp('garfo', [0, 26, 0], 2);
  const cheek = tabbed([[-12, 22], [12, 22], [12, 58], [-12, 58]], { 0: [[0, TAB(16, 6)]] });
  [-72.8, -69.8, -53.2, -50.2].forEach((x, i) => M(gFk, 'suportes', 'Garfo do pivô (bochecha de 2 camadas)', 'GP', 'zy', x, cheek, [CI(0, 50.5, 2.2)], { exp: i === 0, qty: 4 }));
  R.F('shcs', 35, 'J01', 3, gFk, V3(-72.8, 50.5, 0), V3(1, 0, 0));
  R.F('nyloc', 0, 'J01', 3, gFk, V3(-47.2, 50.5, 0), V3(1, 0, 0));
  for (const x of [-66.8, -54]) R.F('washer', 0, 'J01', 3, gFk, V3(x, 50.5, 0), V3(1, 0, 0));

  const gSS = grp('berco', [-30, 30, 0], 2);
  const ssH = [RB(SX - 11.55, SX + 11.55, -6.25, 6.25), CI(SX - 13.8, 0, .8), CI(SX + 13.8, 0, .8)];
  for (const s of sides) for (const x of [19, 32]) ssH.push(RB(x - 3, x + 3, ...zz(s, 9, 12)));
  M(gSS, 'suporteServo', 'Suporte do servo · placa (abas do MG90S por cima)', 'SS', 'xz', 34, RB(8, 43, -15, 15), ssH);
  const sw = tabbed(RB(10, 41, 22, 34), { 0: [[17, TAB(6, 6)], [34, TAB(6, 6)]], 2: [[19, TAB(6)], [32, TAB(6)]] });
  M(gSS, 'suporteServo', 'Suporte do servo · parede', 'SW', 'xy', 9, sw, [], { qty: 2 });
  M(gSS, 'suporteServo', 'Suporte do servo · parede', 'SW', 'xy', -12, sw, [], { exp: false });

  /* ---- 3. travessa basculante: viga de 4 camadas + placas dos motores + motores TT + rodas ---- */
  const PV = V3(-60, 50.5, 0);
  const gRk = grp('travessa', [-6, 14, 0], 3, root, PV); R.rocker = gRk;
  const beam = [[-46.4, -6], [46.4, -6], [46.4, -3], [52.4, -3], [52.4, 5], [46.4, 5], [46.4, 6], [-46.4, 6], [-46.4, 5], [-52.4, 5], [-52.4, -3], [-46.4, -3]];
  [-6, -3, 0, 3].forEach((x, i) => M(gRk, 'travessa', 'Viga basculante (4 camadas)', 'VB', 'zy', x, beam, [CI(0, 0, 2.2)], { exp: i === 0, qty: 4 }));
  for (const side of sides) {
    b.inst = side < 0 ? 2 : 3;
    const gm = new THREE.Group(); gm.scale.z = side; gRk.add(gm);
    const pmA = [CI(-22.5, -16.5, 3.5), CI(-.5, -23, 1.7), CI(-.5, -10, 1.7), RB(-6, 6, -3, 5)], pmB = [CI(-22.5, -16.5, 3.5), hexPts(-.5, -23, 5.6), hexPts(-.5, -10, 5.6), RB(-6, 6, -3, 5)];
    M(gm, 'travessa', 'Placa do motor traseiro · camada encostada no TT', 'PM1', 'xy', 49.4, RB(-37, 10, -28, 8.5), pmA, { exp: side > 0, qty: 2 });
    M(gm, 'travessa', 'Placa do motor traseiro · camada das porcas cativas', 'PM2', 'xy', 46.4, RB(-37, 10, -28, 8.5), pmB, { exp: side > 0, qty: 2 });
    buildTT(b, R, gm, V3(-22.5, -16.5, KP[1]), Math.PI, side < 0 ? 'mRL' : 'mRR');
    for (const y of [-23, -10]) { R.F('p3', 25, 'J02', 3, gm, V3(-.5, y, 71.2), V3(0, 0, -1)); R.F('n3', 0, 'J02', 3, gm, V3(-.5, y, 49.4), V3(0, 0, -1)); }
    const gw = grp('rodaR' + side, [0, 0, 40], 13, gm, V3(-22.5, -16.5, 88));
    R.spinners.push(buildWheel(b, gw, V3()));
  }
  b.inst = undefined;

  /* ---- 4. servo MG90S em pé no suporte + braço de MDF ---- */
  const gS = grp('servo', [0, 44, 0], 4), FU = 37;   // FU: face de baixo das abas
  at(b.mesh(G.rbox(22.8, 22.7, 12.2, 1.1), MAT.dark, 'servo', 'Corpo do servo MG90S', gS), SX, FU - 14.2 + 11.35, 0);
  at(b.mesh(pad(32.5, 2.5, 12.2, [[-13.8, 0, 1.1], [13.8, 0, 1.1]], .6), MAT.dark, 'servo', 'Abas de fixação (furos Ø2,2)', gS), SX, FU + 1.25, 0);
  for (const x of [SX - 13.8, SX + 13.8]) R.F('m2', 8, 'J05', 4, gS, V3(x, FU + 2.5, 0), NEG_Y);
  at(b.mesh(G.cylY(5.8, 1.6, 24), MAT.dark, 'servo', 'Topo do servo', gS), SX + 5.5, FU + 9.3, 0);
  at(b.mesh(G.cylY(2.4, 1.8, 14), MAT.steel, 'servo', 'Eixo estriado 25T', gS), SX + 5.5, FU + 11, 0);
  at(b.mesh(new THREE.PlaneGeometry(18, 8.4), decalMat(label(360, 168, [['MG90S', 'italic 800 108px "Barlow Condensed", Arial', 90]], '#0d0d0f'), false), 'servo', 'Etiqueta MG90S', gS, false), SX, 34, 6.15);
  const hp = new THREE.Group(); hp.position.set(SX + 5.5, FU + 11.9, 0); gS.add(hp); R.horn = hp;
  at(b.mesh(G.rbox(32, 1.6, 6, .7), MAT.white, 'servo', 'Braço duplo do servo (vem com ele)', hp), 0, .8, 0);
  const hornO = [[-12, -5], [21, -5], [21, -13], [31, -13], [31, 13], [21, 13], [21, 5], [-12, 5]];
  M(hp, 'braco', 'Braço do servo em MDF (2 furos Ø3,4)', 'BS', 'xz', 1.6, hornO, [CI(0, 0, 3), CI(-9, 0, .6), CI(9, 0, .6), CI(26, -8, 1.7), CI(26, 8, 1.7)]);
  for (const z of [-8, 8]) { R.F('p3', 12, 'J03', 9, hp, V3(26, 7.6, z), NEG_Y); R.F('y3', 0, 'J03', 9, hp, V3(26, 1.6, z), NEG_Y); }
  R.hornTipA = at(new THREE.Object3D(), 26, 4.6, -8); R.hornTipB = at(new THREE.Object3D(), 26, 4.6, 8); hp.add(R.hornTipA, R.hornTipB);
  R.anchors.srv = at(new THREE.Object3D(), SX - 11.6, 26, 3); gS.add(R.anchors.srv);

  /* ---- 5. mangas dianteiras: motor TT em pé, gira junto com a roda num pino de MDF embaixo e outro em cima ---- */
  const knuckles = {}, armTips = {}, TIP = [-25.4, -5.4];
  const mv = tabbed([[-32.5, 36], [-12, 36], [-12, 22], [12, 22], [12, 94.7], [-12, 94.7], [-12, 47.5], [-32.5, 47.5]],
    { 2: [[-4, TAB(4)], [4, TAB(4)]], 4: [[4, TAB(4)], [-4, TAB(4)]], 6: [[-25, TAB(6, 6)], [-16, TAB(4, 6)]] });
  const mvH = [CI(0, 34, 3.5), CI(-6.5, 56, 1.7), CI(6.5, 56, 1.7)], mvN = [CI(0, 34, 3.5), hexPts(-6.5, 56, 5.6), hexPts(6.5, 56, 5.6)];
  const slotMV = [RB(-6, -2, -15.4, -9.4), RB(2, 6, -15.4, -9.4)];
  const aB = Math.atan2(11.7, Math.sqrt(19 * 19 - 11.7 * 11.7)) / DEG;
  const mbO = arcP(0, 0, 19, 180 - aB, 360 + aB, 40);                                       // fundo: disco r 19 cortado em z = 11,7 (antes do pneu)
  const mtO = [[-12, -18], [12, -18], ...arcP(0, 0, 12, 0, 180, 18)];
  const aA = Math.asin(1 / 6.5) / DEG;
  const maO = [[-32.5, -18], [-12, -18], [-12, -6.4], ...arcP(TIP[0], TIP[1], 6.5, -aA, 180 + aA, 20), [-32.5, -6.4]];
  const maH = [RB(-28, -22, -15.4, -9.4), RB(-18, -14, -15.4, -9.4), CI(TIP[0], TIP[1], 1.7)];
  for (const side of sides) {
    b.inst = side < 0 ? 0 : 1;
    const k = grp('manga' + side, [0, -6, 70 * side], 9, root, V3(KP[0], 0, KP[1] * side)); k.scale.z = side;
    const ex = side > 0;
    M(k, 'manga', 'Manga · placa do motor · camada encostada no TT', 'MV1', 'xy', -12.4, mv, mvH, { exp: ex, qty: 2 });
    M(k, 'manga', 'Manga · placa do motor · camada das porcas cativas', 'MV2', 'xy', -15.4, mv, mvN, { exp: ex, qty: 2 });
    M(k, 'manga', 'Manga · fundo (apoia na língua do chassi)', 'MB', 'xz', 19, mbO, slotMV, { exp: ex, qty: 2 });
    M(k, 'manga', 'Manga · orelha de cima (encosta no teto)', 'MT', 'xz', 94.7, mtO, slotMV, { exp: ex, qty: 2 });
    [47.5, 50.5].forEach((y, i) => M(k, 'manga', 'Manga · braço de direção (2 camadas)', 'MA', 'xz', y, maO, maH, { exp: ex && i === 0, qty: 4 }));
    M(k, 'manga', 'Pino de MDF Ø8 (pivô da manga)', 'MP', 'xz', 16, CI(0, 0, 4), [], { exp: ex, qty: 4 });
    M(k, 'manga', 'Pino de MDF Ø8 (pivô da manga)', 'MP', 'xz', 97.7, CI(0, 0, 4), [], { exp: false });
    buildTT(b, R, k, V3(0, 34, 0), -Math.PI / 2, side < 0 ? 'mFL' : 'mFR');
    for (const x of [-6.5, 6.5]) { R.F('p3', 25, 'J02', 9, k, V3(x, 56, 9.4), V3(0, 0, -1)); R.F('n3', 0, 'J02', 9, k, V3(x, 56, -12.4), V3(0, 0, -1)); }
    R.F('p3', 16, 'J04', 9, k, V3(TIP[0], 56.5, TIP[1]), NEG_Y); R.F('y3', 0, 'J04', 9, k, V3(TIP[0], 47.5, TIP[1]), NEG_Y);
    const tip = at(new THREE.Object3D(), TIP[0], 53.5, TIP[1]); k.add(tip);
    const gw = grp('rodaF' + side, [0, 0, 40], 13, k, V3(0, 34, 88 - KP[1]));
    R.spinners.push(buildWheel(b, gw, V3()));
    knuckles[side] = k; armTips[side] = tip;
  }
  b.inst = undefined;
  R.kL = knuckles[-1]; R.kR = knuckles[1]; R.tipL = armTips[-1]; R.tipR = armTips[1];
  R.link = { K: KP[0], Kz: KP[1], tip: TIP, S: SX + 5.5, h: 26, e: 8 };

  /* ---- 6. barras de direção (MDF, comprimento fixo) ---- */
  const gT = new THREE.Group(); root.add(gT); Object.assign(gT.userData, { step: 9 }); R.tieGroup = gT; R.ties = [];
  const LR = KP[1] + TIP[1] - 8;
  const rodO = [...arcP(LR, 0, 4, -90, 90, 10), ...arcP(0, 0, 4, 90, 270, 10)];
  for (let i = 0; i < 2; i++) R.ties.push({ rod: M(gT, 'braco', `Barra de direção (MDF, ${fmt(LR, 1)} mm entre furos)`, 'BD', 'xz', 0, rodO, [CI(0, 0, 1.7), CI(LR, 0, 1.7)], { exp: i === 0, qty: 2 }) });
  R.tieLen = LR;

  /* ---- 7. paredes laterais, painel traseiro, prateleira e bandeja do power bank ---- */
  const wallT = tabbed([[-98, 22], [45, 22], [45, 58], [101, 58], [101, 97.8], [-98, 97.8]], {
    0: WALLX.map(x => [x, TAB(12, 6)]),
    4: [[-74, TAB(12)], [-14, TAB(12)], [36, TAB(12)], [86, TAB(12)], [-92, TNUT], [60, TNUT]],
    5: [[76, TAB(12)], [38, TAB(12)]] });
  const wallH = [RB(-94, -72, 28, 58), RB(-68, -52, 37, 63), RB(-45, -6, 28, 56), RB(-92, -28, 71, 80), RB(0, 52, 68, 90), RB(66, 96, 68, 90),
    ...[-80, -30].map(x => RB(x - 6, x + 6, 64, 67)), ...[-80, -20].map(x => RB(x - 5, x + 5, 84, 87)), ...[16, 56, 92].map(x => RB(x - 6, x + 6, 61, 64))];
  const logo = textTex(640, 180, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.font = 'italic 800 150px "Barlow Condensed", Arial, sans-serif'; x.textBaseline = 'middle';
    x.fillStyle = '#1d1d20'; x.fillText('MLG', 30, 92); const mw = x.measureText('MLG ').width;
    x.fillStyle = '#c98a00'; x.font = 'italic 800 150px "Barlow Condensed", "DejaVu Sans", Arial, sans-serif'; x.fillText('Ω', 30 + mw, 92);
    x.beginPath(); x.moveTo(36, 160); x.lineTo(560, 160); x.lineTo(546, 172); x.lineTo(30, 172); x.fill();
  });
  R.wallG = {};
  for (const s of sides) {
    const gW = grp('parede' + s, [0, 24, 60 * s], 5); R.wallG[s] = gW;
    M(gW, 'carroceria', 'Parede lateral (janelas e fendas T do teto)', 'PL', 'xy', s > 0 ? WZ0 : -WZ1, wallT, wallH, { exp: s > 0, qty: 2 });
    const d = at(b.mesh(new THREE.PlaneGeometry(46, 13), decalMat(logo), 'carroceria', 'Logotipo MLG Ω (gravado a laser)', gW, false), 20, 40, s * (WZ1 + .05));
    if (s < 0) d.rotation.y = Math.PI;
  }
  const gRear = grp('traseira', [-50, 20, 0], 5);
  const rpT = tabbed([[-40.5, 22], [40.5, 22], [40.5, 97.8], [-40.5, 97.8]], { 0: [[-22, TAB(12, 6)], [22, TAB(12, 6)]], 2: [[14, TAB(12)], [-14, TAB(12)]] });
  const rpH = [RB(-20, 20, 30, 32.5), RB(-20, 20, 36, 38.5), RB(-20, 20, 42, 44.5)];
  for (const s of sides) for (const y of [38, 76]) rpH.push(RB(...zz(s, WZ0, WZ1), y - 6, y + 6));
  M(gRear, 'carroceria', 'Painel traseiro', 'TR', 'zy', -101, rpT, rpH);
  for (const z of [-30, 30]) at(b.mesh(G.rbox(1.2, 6, 9, .4), MAT.tail, 'carroceria', 'Lanterna traseira (adesivo)', gRear, false), -101.6, 64, z);

  const gDk = grp('bandeja', [0, 64, 0], 7);
  const shT = tabbed([[-2, -WZ0], [101, -WZ0], [101, WZ0], [-2, WZ0]], { 0: [16, 56, 92].map(x => [x, TAB(12)]), 2: [92, 56, 16].map(x => [x, TAB(12)]) });
  const PI0 = [62, -17], piHw = [[-29, -11.5], [29, -11.5], [-29, 11.5], [29, 11.5]].map(([x, z]) => [PI0[0] - x, PI0[1] - z]);
  const DR0 = [20.5, 15.5];                                                                  // centro da L9110S
  const shH = [...piHw.map(([x, z]) => CI(x, z, 1.35)), RB(38, 52, 6, 14), RB(4, 14, -30, -18), RB(-1, 7, 18, 30),
    ...[17.5, 27.5].flatMap(x => [RB(x - 1.5, x + 1.5, DR0[1] - 13.4, DR0[1] - 11.8), RB(x - 1.5, x + 1.5, DR0[1] + 11.8, DR0[1] + 13.4)])];
  M(gDk, 'suportes', 'Prateleira eletrônica', 'PR', 'xz', 61, shT, shH);
  piHw.forEach(([x, z], i) => { M(gDk, 'suportes', 'Espaçador do Pi (anel de MDF)', 'ES', 'xz', 64, CI(x, z, 3.2), [CI(x, z, 1.35)], { exp: i === 0, qty: 4 }); R.F('p25', 10, 'J07', 8, gDk, V3(x, 68.4, z), NEG_Y); R.F('n25', 0, 'J07', 8, gDk, V3(x, 61, z), NEG_Y); });
  const gPT = grp('bandejaPB', [0, 52, 0], 7);
  M(gPT, 'suportes', 'Bandeja do power bank', 'BP', 'xz', 64, tabbed([[-96, -WZ0], [-4, -WZ0], [-4, WZ0], [-96, WZ0]], { 0: [-80, -30].map(x => [x, TAB(12)]), 2: [-30, -80].map(x => [x, TAB(12)]) }), [RB(-70, -40, -14, 14)]);

  /* ---- 8. Raspberry Pi Zero 2 W (girado: portas viradas para o centro, cartão para a frente) ---- */
  const gPi = grp('pi', [0, 96, 0], 8, root, V3(PI0[0], 67, PI0[1])); gPi.rotation.y = Math.PI;
  const piH = [[-29, -11.5], [29, -11.5], [-29, 11.5], [29, 11.5]];
  const piTex = textTex(650, 300, (x, W, H) => {
    x.fillStyle = '#176b38'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(200,170,80,.55)'; x.lineWidth = 2;
    for (let i = 0; i < 40; i++) { x.beginPath(); const y0 = 40 + Math.random() * 220; x.moveTo(60 + Math.random() * 500, y0); x.lineTo(60 + Math.random() * 500, y0 + (Math.random() - .5) * 30); x.stroke(); }
    x.fillStyle = '#e8e6d8'; x.font = '600 18px Barlow, Arial'; x.fillText('Raspberry Pi Zero 2 W', 210, 214); x.fillText('GPIO', 420, 46); x.fillText('PWR IN', 520, 278); x.fillText('USB', 400, 278); x.fillText('mini HDMI', 110, 278); x.fillText('CAM', 590, 160);
    x.fillStyle = '#c9a648'; for (const [cx, cy] of [[35, 35], [615, 35], [35, 265], [615, 265]]) { x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.fill(); x.fillStyle = '#176b38'; x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.fill(); x.fillStyle = '#c9a648'; }
    x.fillStyle = '#222'; for (let i = 0; i < 12; i++) x.fillRect(150 + i * 26, 120 + (i % 3) * 18, 10, 5);
  });
  b.mesh(plate(rr(-32.5, 32.5, -15, 15, 3), piH.map(([px, pz]) => circ(px, pz, 1.4)), 1.4), MAT.green, 'pi', 'Placa (PCB)', gPi);
  at(b.mesh(new THREE.PlaneGeometry(65, 30).rotateX(-Math.PI / 2), decalMat(piTex, false), 'pi', 'Placa (PCB)', gPi, false), 0, 1.42, 0);
  at(b.mesh(G.box(12, 1.3, 12), MAT.steel, 'pi', 'Processador RP3A0 (CPU + 512 MB)', gPi), 2.5, 2.05, -1);
  at(b.mesh(G.rbox(9, 1, 7, .2), MAT.steel, 'pi', 'Módulo Wi-Fi / Bluetooth', gPi), 18.5, 1.9, 6);
  at(b.mesh(G.box(50.8, 2.5, 5.08), MAT.dark, 'pi', 'Barra GPIO 40 pinos (soldada)', gPi), 0, 2.65, 11.5);
  const pins = new THREE.InstancedMesh(G.box(.64, 6, .64), b.mat('pi', MAT.gold), 40); Object.assign(pins.userData, { part: 'pi', sub: 'Pinos GPIO', cs: true }); b.reg('pi').meshes.push(pins); b.pick.push(pins); gPi.add(pins);
  const pm = new THREE.Matrix4(); for (let i = 0; i < 40; i++) { pm.makeTranslation(-24.13 + (i >> 1) * 2.54, 4.4, i % 2 ? 12.77 : 10.23); pins.setMatrixAt(i, pm); }
  pins.computeBoundingSphere(); pins.computeBoundingBox();
  at(b.mesh(G.rbox(11.2, 3.4, 7.6, .5), MAT.steel, 'pi', 'Porta mini-HDMI', gPi), -20.1, 3.1, -12.3);
  at(b.mesh(G.rbox(8, 2.8, 5.6, .5), MAT.steel, 'pi', 'Porta micro-USB OTG (webcam)', gPi), 8.9, 2.8, -13.2);
  at(b.mesh(G.rbox(8, 2.8, 5.6, .5), MAT.steel, 'pi', 'Porta micro-USB de energia', gPi), 21.5, 2.8, -13.2);
  at(b.mesh(G.rbox(11, 1.4, 12, .3), MAT.steel, 'pi', 'Leitor microSD', gPi), -26.5, 2.1, 0);
  at(b.mesh(G.box(4, 1.3, 17), MAT.dark, 'pi', 'Conector de câmera CSI', gPi), 30, 2.05, 0);
  at(b.mesh(G.box(1.4, .8, 1.4), MAT.led, 'pi', 'LED de atividade', gPi, false), 26, 1.8, 10.5);
  R.anchors.piPWR = at(new THREE.Object3D(), 21.5, 2.8, -16.6); R.anchors.piUSB = at(new THREE.Object3D(), 8.9, 2.8, -16.6); gPi.add(R.anchors.piPWR, R.anchors.piUSB);
  R.piHdr = k => { const v = V3(-24.13 + (k >> 1) * 2.54, 7.4, k % 2 ? 12.77 : 10.23); return v.applyAxisAngle(Y_AX, Math.PI).add(V3(PI0[0], 67, PI0[1])); };

  /* ---- 9. ponte H L9110S (2 canais) presa com 2 abraçadeiras ---- */
  const gL = grp('driver', [0, 96, 0], 8, root, V3(DR0[0], 64, DR0[1]));
  b.mesh(plate(rr(-14.5, 14.5, -11.5, 11.5, 1.2), [], 1.6), MAT.red, 'driver', 'Placa (PCB)', gL);
  const dTex = textTex(290, 230, (x, W, H) => { x.fillStyle = '#b1211b'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2ece4'; x.textAlign = 'center'; x.font = '700 30px Barlow, Arial'; x.fillText('L9110S', 145, 120); x.font = '600 16px Barlow, Arial'; x.fillText('MOTOR-A', 70, 40); x.fillText('MOTOR-B', 70, 205); x.fillText('B-IA B-IB GND VCC A-IA A-IB', 160, 168); });
  at(b.mesh(new THREE.PlaneGeometry(29, 23).rotateX(-Math.PI / 2), decalMat(dTex, false), 'driver', 'Placa (PCB)', gL, false), 0, 1.62, 0);
  for (const z of [-4.5, 4.5]) at(b.mesh(G.rbox(5, 1.6, 4, .3), MAT.chip, 'driver', 'Chip L9110S (ponte H, 800 mA)', gL), 1, 2.4, z);
  const dterm = (z, sub) => { at(b.mesh(G.rbox(7.5, 8.5, 10.2, .4), MAT.blue, 'driver', sub, gL), -10.5, 5.85, z); for (const dz2 of [-2.54, 2.54]) at(b.mesh(G.cylY(1.4, .6, 12), MAT.steel, 'driver', sub, gL), -10.5, 10.3, z + dz2); };
  dterm(-6, 'Borne motor A'); dterm(6, 'Borne motor B');
  at(b.mesh(G.box(2.5, 2.5, 15.24), MAT.dark, 'driver', 'Pinos B-IA B-IB GND VCC A-IA A-IB', gL), 12.5, 2.85, 0);
  const lp = new THREE.InstancedMesh(G.box(.64, 6, .64), b.mat('driver', MAT.gold), 6); Object.assign(lp.userData, { part: 'driver', sub: 'Pinos B-IA B-IB GND VCC A-IA A-IB', cs: true }); b.reg('driver').meshes.push(lp); b.pick.push(lp); gL.add(lp);
  for (let i = 0; i < 6; i++) { pm.makeTranslation(12.5, 5.6, -6.35 + i * 2.54); lp.setMatrixAt(i, pm); } lp.computeBoundingSphere(); lp.computeBoundingBox();
  at(b.mesh(G.box(1.4, .8, 1.4), MAT.led, 'driver', 'LED de energia', gL, false), 10, 2, -9);
  for (const x of [17.5, 27.5].map(v => v - DR0[0])) at(b.mesh(G.rbox(2.6, .8, 24, .3), MAT.dark, 'driver', 'Abraçadeira de nylon', gL, false), x, 2, 0);
  R.anchors.dA1 = at(new THREE.Object3D(), -14, 6, -8.5); R.anchors.dA2 = at(new THREE.Object3D(), -14, 6, -3.5);
  R.anchors.dB1 = at(new THREE.Object3D(), -14, 6, 3.5); R.anchors.dB2 = at(new THREE.Object3D(), -14, 6, 8.5);
  for (const k of ['dA1', 'dA2', 'dB1', 'dB2']) gL.add(R.anchors[k]);
  R.dIn = i => V3(DR0[0] + 12.5, 64 + 8.6, DR0[1] - 6.35 + i * 2.54);   // 0 B-IA · 1 B-IB · 2 GND · 3 VCC · 4 A-IA · 5 A-IB

  /* ---- 10. power bank + 2 travessas que entram pelas fendas das paredes ---- */
  const gPB = grp('powerbank', [0, 70, 0], 10);
  at(b.mesh(G.rbox(97, 17, 67, 4, 4), MAT.pb, 'powerbank', 'Corpo do power bank', gPB), -49, 75.5, 0);
  const pbl = label(440, 760, [['KAIDI', '800 124px "Barlow Condensed", Arial', 300], ['KD-998', '700 78px "Barlow Condensed", Arial', 400], ['10.000 mAh', '600 58px "Barlow", Arial', 490]], '#141416');
  at(b.mesh(new THREE.PlaneGeometry(44, 76).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2), decalMat(pbl, false), 'powerbank', 'Etiqueta KD-998', gPB, false), -49, 84.06, 0);
  at(b.mesh(G.rbox(1.4, 5.6, 12.5, .4), MAT.steel, 'powerbank', 'Saída USB-A', gPB), -.3, 75.5, 8);
  at(b.mesh(G.rbox(1.4, 3.2, 9, 1.2), MAT.steel, 'powerbank', 'Saída USB-C', gPB), -.3, 75.5, -10);
  for (let i = 0; i < 4; i++) at(b.mesh(G.box(.8, 1.4, 1.4), MAT.ledB, 'powerbank', 'LEDs de carga', gPB, false), -.1, 81, -3.6 + i * 2.4);
  [-80, -20].forEach((x, i) => M(gPB, 'suportes', 'Travessa do power bank (entra pelas fendas das paredes)', 'TB', 'xz', 84, RB(x - 5, x + 5, -WZ1, WZ1), [], { exp: i === 0, qty: 2 }));
  R.anchors.pbC = at(new THREE.Object3D(), .6, 75.5, -10); R.anchors.pbA = at(new THREE.Object3D(), .6, 75.5, 8); gPB.add(R.anchors.pbC, R.anchors.pbA);

  /* ---- 11. teto com asas (seguram os pinos de cima das mangas) e antena ---- */
  const gRoof = grp('teto', [0, 130, 0], 11);
  const wing = s => s < 0
    ? [[70, -40.5], [70, -KP[1]], ...arcP(KP[0], -KP[1], 12.5, 180, 360, 18).slice(1, -1), [95, -KP[1]], [95, -40.5]]
    : [[95, 40.5], [95, KP[1]], ...arcP(KP[0], KP[1], 12.5, 0, 180, 18).slice(1, -1), [70, KP[1]], [70, 40.5]];
  const roofP = [[-104, -40.5], ...wing(-1), [101, -40.5], [101, 40.5], ...wing(1), [-104, 40.5]];   // passa 3 mm atrás do painel traseiro
  const roofH = [CI(KP[0], -KP[1], 4.2), CI(KP[0], KP[1], 4.2), RB(-97, -94, 29, 33), RB(50, 58, -31, -24)];
  for (const s of sides) {
    for (const x of [-74, -14, 36, 86]) roofH.push(RB(x - 6, x + 6, ...zz(s, WZ0, WZ1)));
    roofH.push(RB(-101, -98, ...zz(s, 8, 20)), RB(65.5, 68.5, ...zz(s, 21.3, 24.5)));
    for (const x of [-92, 60]) roofH.push(CI(x, 36 * s, 1.7));
  }
  for (let c = 0; c < 6; c++) for (const z of [-22, 0, 22]) roofH.push(RB(-88 + 16 * c, -78 + 16 * c, z - 5, z + 5));
  M(gRoof, 'carroceria', 'Teto / rack (as asas seguram os pinos das mangas)', 'TE', 'xz', 97.8, roofP, roofH);
  for (const s of sides) for (const x of [-92, 60]) { R.F('p3', 16, 'J06', 11, gRoof, V3(x, 100.8, 36 * s), NEG_Y); R.F('n3', 0, 'J06', 11, R.wallG[s], V3(x, 90.6, 36 * s), NEG_Y); }
  const gAnt = grp('antena', [-40, 150, 0], 11);
  M(gAnt, 'carroceria', 'Antena (MDF, só estética)', 'AN', 'zy', -97, tabbed([[28, 100.8], [34, 100.8], [34, 150], ...arcP(31, 150, 3, 0, 180, 8).slice(1, -1), [28, 150]], { 0: [[31, TAB(4)]] }));

  /* ---- 12. para-choque (2 camadas) ---- */
  const gBump = grp('parachoque', [60, 0, 0], 11);
  const bpO = [[-36, 10], [36, 10], [36, 44], [27, 44], [27, 54], [19, 54], [19, 44], [-19, 44], [-19, 54], [-27, 54], [-27, 44], [-36, 44]];
  const bpH = [RB(-24, -12, 16, 22), RB(12, 24, 16, 22), RB(-16, 16, 27, 29.5), RB(-16, 16, 32, 34.5), RB(-16, 16, 37, 39.5)];
  [105, 108].forEach((x, i) => M(gBump, 'carroceria', 'Para-choque (2 camadas)', 'PC', 'zy', x, bpO, bpH, { exp: i === 0, qty: 2 }));

  /* ---- 13. webcam no teto: bolsão + ponte em U ---- */
  const CL = 98, CP = 100.8, CX = 67;
  const gBer = grp('bercoCam', [30, 60, 0], 12);
  M(gBer, 'suportes', 'Bolsão da base da webcam (colado no teto)', 'WC', 'xz', CP, RB(58.6, 100.1, -30, 30), [RB(61.6, 97.1, -27, 27)]);
  const gPr = grp('presilhaCam', [40, 236, 0], 12);
  const ubO = tabbed([[-26, CP], [-19.8, CP], [-19.8, CP + 16.2], [19.8, CP + 16.2], [19.8, CP], [26, CP], [26, CP + 20.2], [-26, CP + 20.2]], { 0: [[-22.9, TAB(3.2)]], 4: [[22.9, TAB(3.2)]] });
  M(gPr, 'suportes', 'Ponte da webcam (prende a base dobrada)', 'WP', 'zy', CX - 1.5, ubO);
  const gCam = grp('webcam', [56, 190, 0], 12), yL = CP + 37.7;
  at(b.mesh(G.rbox(34.3, 11.8, 39.3, 2.4), MAT.cam, 'webcam', 'Base dobrável (clipe de monitor fechado)', gCam), CL - 18.65, CP + 5.9, 0);
  at(b.mesh(G.rbox(38.5, 4.8, 39.3, 1.4), MAT.cam, 'webcam', 'Base dobrável (clipe de monitor fechado)', gCam), CL - 20.75, CP + 14.2, 0);
  at(b.mesh(G.cylZ(4.8, 39.3, 28), MAT.cam, 'webcam', 'Articulação do clipe', gCam), CL - 38.9, CP + 10.9, 0);
  for (const s of sides) at(b.mesh(G.cylZ(3, .5, 22), MAT.dark, 'webcam', 'Articulação do clipe', gCam), CL - 38.9, CP + 10.9, 19.9 * s);
  at(b.mesh(G.cylY(5, 3.2, 24), MAT.cam, 'webcam', 'Pescoço giratório', gCam), CL - 12.5, CP + 18.2, 0);
  at(b.mesh(G.cylY(6.75, 4.9, 24), MAT.cam, 'webcam', 'Pescoço giratório', gCam), CL - 12.5, CP + 22.25, 0);
  at(b.mesh(prism(new THREE.Shape(v2(rr(-35, 35, -13, 13, 9, 8))), 19.8, 1.6, 10).rotateY(Math.PI / 2), MAT.cam, 'webcam', 'Corpo da webcam (70 × 26 × 23 mm)', gCam), CL - 13.1, yL, 0);
  at(b.mesh(G.cylX(8.3, 3.4, 32), MAT.dark, 'webcam', 'Lente (aro Ø16,6)', gCam), CL - 1.7, yL, 0);
  at(b.mesh(new THREE.TorusGeometry(6.2, .85, 10, 32).rotateY(Math.PI / 2), MAT.steel, 'webcam', 'Anel da lente', gCam), CL, yL, 0);
  at(b.mesh(G.cylX(4.6, .5, 32), MAT.glass, 'webcam', 'Vidro da lente', gCam), CL + .05, yL, 0);
  at(b.mesh(new THREE.SphereGeometry(.9, 10, 8), MAT.led, 'webcam', 'LED da webcam', gCam, false), CL - 3.1, yL, -12);
  const camTex = textTex(560, 160, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(228,228,228,.85)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '600 24px Barlow, Arial, sans-serif'; x.fillText('WEBCAM', 85, 80); x.fillText('HD FULL', 483, 80); });
  at(b.mesh(new THREE.PlaneGeometry(56, 16).rotateY(Math.PI / 2), decalMat(camTex), 'webcam', 'Corpo da webcam (70 × 26 × 23 mm)', gCam, false), CL - 3.15, yL, 0);
  at(b.mesh(G.cylX(2, 5, 16), MAT.dark, 'webcam', 'Saída do cabo USB', gCam), CL - 25.5, CP + 31, -22);
  R.anchors.cam = at(new THREE.Object3D(), CL - 28, CP + 31, -22); gCam.add(R.anchors.cam);

  /* ---- kit de manobras (opcional, peças genéricas) ---- */
  R.kit = null;   // versão leve: sem o kit de CO2 (buildKit fica guardado, sem uso)

  /* ---- sucção (fan car): turbina no meio do chassi, saia por baixo, bateria própria no teto ---- */
  buildSuccao(b, R, grp, M, label);

  /* ---- peça de teste de encaixe (só nos arquivos de corte) ---- */
  const comb = [[0, 0], [70, 0], [70, 22]];
  [3.3, 3.2, 3.1, 3.0, 2.9, 2.8].forEach((w, i) => { const x = 62 - i * 11; comb.push([x + w / 2, 22], [x + w / 2, 12], [x - w / 2, 12], [x - w / 2, 22]); });
  comb.push([0, 22]);
  R.cut.push({ code: 'TESTE', name: 'Peça de teste: rasgos 3,3 a 2,8 mm e furos', part: 'teste', outline: comb, holes: [CI(8, 6, 2.2), CI(18, 6, 1.7), CI(28, 6, 4.2), CI(38, 6, 1.35)], qty: 1, d: TH });

  /* ---- peça só para a miniatura dos fixadores ---- */
  const gThumb = new THREE.Group(); gThumb.visible = false; root.add(gThumb); R.screwThumb = gThumb;
  [['shcs-16', MAT.steel, [0, 8, 0]], ['nut-0', MAT.steel, [10, -3, 3]], ['washer-0', MAT.steel, [9, -7, -6]]].forEach(([k, m, p]) => { const me = new THREE.Mesh(fgeo(k), m); me.position.set(...p); gThumb.add(me); });

  R.cutOK = true; R.markers = [];
  buildFasteners(R);
  buildWires(b, R);
  return R;
}

/* ============================ SUCÇÃO (fan car) ============================
   Turbina de 2 estágios contrarrotativos num pedaço de cano de esgoto Ø50, em pé sobre o furo Ø31 do chassi:
   2 motores do DJI Neo 2 com hélices de 45 mm, presos em cruzetas de MDF. Uma saia de EVA em volta do chassi
   e de 2 asas de MDF fecha a área de baixo; a turbina tira o ar dali e o rover é puxado contra o chão.
   As peças novas de MDF (SM e SA) vão numa chapinha separada (R.cut2): a chapa 1 não muda. */
const SUC = { x: -19, y0: 22, h: 34, ri: 23.4, ro: 25, notch: 10.5 };
// contorno da saia (chassi + 2 asas), em (x, z), no sentido anti-horário
const SKIRT = [[104, 40.5], [40, 40.5], [40, 80], [32, 88], [-32, 88], [-40, 80], [-40, 40.5], [-104, 40.5],
  [-104, -40.5], [-40, -40.5], [-40, -80], [-32, -88], [32, -88], [40, -80], [40, -40.5], [104, -40.5]];
// cruzeta: cubo + 3 braços que encostam por dentro do cano
function spiderO(rh = 9, ra = 23.2, w = 5, arms = [90, 210, 330]) {
  const dh = Math.asin(w / 2 / rh) / DEG, da = Math.asin(w / 2 / ra) / DEG, p = [];
  arms.forEach((a, i) => {
    const nx = i === arms.length - 1 ? arms[0] + 360 : arms[i + 1];
    p.push(...arcP(0, 0, ra, a - da, a + da, 4), ...arcP(0, 0, rh, a + dh, nx - dh, 14));
  });
  return p;
}
// rasgo arredondado radial (ângulo a, de r0 a r1, largura w)
function slotP(a, r0, r1, w, n = 6) {
  const c = Math.cos(a * DEG), s = Math.sin(a * DEG), h = w / 2, p = [];
  for (const [rc, a0] of [[r1 - h, -90], [r0 + h, 90]]) for (let i = 0; i <= n; i++) { const t = (a0 + 180 * i / n) * DEG, u = rc + h * Math.cos(t), v = h * Math.sin(t); p.push([u * c - v * s, u * s + v * c]); }
  return p;
}
function buildSuccao(b, R, grp, M, label) {
  const S = { rot: [], blur: [], ang: 0 }; R.suc = S;
  const X = SUC.x, Y0 = SUC.y0, Y1 = SUC.y0 + SUC.h, sides = [-1, 1];
  const sg = (name, ex, step, pos, exA) => { const g = grp(name, ex, step, R.root, pos); if (exA) g.userData.exA = V3(...exA); return g; };
  const DROP = [0, 92, 0];   // na montagem a turbina pronta desce inteira por cima, antes da prateleira e da bandeja

  /* ---- passo 6 · cano Ø50 colado no chassi em cima do furo Ø31 · entalhe de 10 × 10,5 mm na boca, virado para trás:
     encaixa na porca do pivô da travessa (acima da 2ª hélice o ar já saiu, então o entalhe não rouba sucção) ---- */
  const gC = sg('cano', [-180, 0, 0], 6, V3(X, 0, 0), DROP), NY = SUC.notch, csub = 'Cano de esgoto Ø50 (34 mm, entalhe atrás para a porca do pivô)';
  at(b.mesh(tube(SUC.ri, SUC.ro, Y1 - NY - Y0, 56), MAT.white, 'cano', csub, gC), 0, (Y0 + Y1 - NY) / 2, 0);
  const cSh = new THREE.Shape(v2([...arcP(0, 0, SUC.ro, 192.5, 527.5, 52), ...arcP(0, 0, SUC.ri, 527.5, 192.5, 52)]));
  const cG = new THREE.ExtrudeGeometry(cSh, { depth: NY, bevelEnabled: false, curveSegments: 4 }); cG.rotateX(Math.PI / 2).translate(0, NY, 0); cG.deleteAttribute('uv');
  at(b.mesh(cG, MAT.white, 'cano', csub, gC), 0, Y1 - NY, 0);
  at(b.mesh(tube(SUC.ro, 26.6, 1.4, 56), MAT.glue, 'cano', 'Cola quente em volta da base (sem frestas)', gC, false), 0, Y0 + .7, 0);

  /* ---- cruzetas de MDF (chapa 2): a de baixo apoia no chassi, a de cima fica rente à boca do cano ---- */
  const smO = spiderO(), smH = [CI(0, 0, 2.6), ...[30, 150, 270].map(a => slotP(a, 3.6, 7.4, 1.8))];
  const gS1 = sg('cruzeta1', [-180, 40, 0], 6, V3(X, 0, 0), DROP), gS2 = sg('cruzeta2', [-180, 80, 0], 6, V3(X, 0, 0), DROP);
  M(gS1, 'cruzetas', 'Cruzeta do motor de baixo (MDF, chapa 2)', 'SM', 'xz', Y0, smO, smH, { sheet: 2, qty: 2, name: 'Cruzeta do motor (cubo + 3 braços que colam no cano)' });
  M(gS2, 'cruzetas', 'Cruzeta do motor de cima (MDF, chapa 2)', 'SM', 'xz', Y1 - TH, smO, smH, { exp: false });

  /* ---- motores do Neo 2 (Ø14 × 8): o de baixo em pé, o de cima pendurado; o sino gira junto com a hélice ---- */
  const motor = (name, ex, y, flip, which) => {
    const g = sg(name, ex, 6, V3(X, y, 0), DROP), s = flip ? -1 : 1, sub = `Motor do DJI Neo 2 (${which})`;
    at(b.mesh(G.cylY(7, 1.6, 28), MAT.alu, 'turbina', sub + ' · base', g), 0, s * .8, 0);
    const bell = new THREE.Group(); g.add(bell);
    at(b.mesh(G.cylY(6.8, 6, 28), MAT.dark, 'turbina', sub + ' · sino (gira)', bell), 0, s * 4.6, 0);
    at(b.mesh(G.cylY(5.4, .4, 24), MAT.steel, 'turbina', sub + ' · sino (gira)', bell), 0, s * 7.8, 0);
    at(b.mesh(G.cylY(.75, 4, 10), MAT.shaft, 'turbina', sub + ' · eixo Ø1,5', bell), 0, s * 10, 0);
    S.rot.push({ g: bell, dir: flip ? 1 : -1 });   // visto de cima: o de baixo gira no sentido horário, o de cima no anti-horário
    return g;
  };
  motor('motorSuc1', [-180, 48, 0], Y0 + TH, false, 'de baixo');
  motor('motorSuc2', [-180, 72, 0], Y1 - TH, true, 'de cima');

  /* ---- hélices de 45 mm, 3 pás: CCW embaixo e CW em cima, as duas com a parte escrita para baixo: jogam o ar para cima ---- */
  // pá: borda de ataque mais baixa que a de fuga, então empurra o ar para cima; m = −1 dá a pá espelhada (giro ao contrário)
  const blade = m => {
    const sh = new THREE.Shape(v2([[2.5, 2.4], [6, 3.9], [10, 4.5], [14, 4.4], [18, 3.6], [21, 2.4], [22.4, .8], [22.4, -.6], [21, -2], [18, -3], [14, -3.5], [10, -3.4], [6, -2.8], [2.5, -2.1]].map(([u, v]) => [u, m * v])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: .7, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -.35); g.rotateX(Math.PI / 2); g.rotateX(m * 22 * DEG); g.deleteAttribute('uv'); return g;
  };
  const prop = (name, ex, y, dir) => {
    const g = sg(name, ex, 6, V3(X, y, 0), DROP), r = new THREE.Group(); g.add(r);
    const sub = `Hélice de 45 mm, 3 pás (${dir < 0 ? 'CCW, embaixo' : 'CW, em cima'}) · escrita para baixo`;
    b.mesh(tube(.8, 3, 4, 20), MAT.prop, 'helices', sub, r);
    const base = blade(dir > 0 ? -1 : 1);
    for (let i = 0; i < 3; i++) b.mesh(base.clone().rotateY(i * 2 * Math.PI / 3), MAT.prop, 'helices', sub, r);
    const disc = new THREE.Mesh(new THREE.RingGeometry(3.2, 22.4, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffc89a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: CLIP }));
    disc.renderOrder = 5; g.add(disc); b.reg('helices').meshes.push(disc); S.blur.push(disc);
    S.rot.push({ g: r, dir });
    return g;
  };
  prop('heliceSuc1', [-180, 56, 0], Y0 + TH + 8 + 2, -1);
  prop('heliceSuc2', [-180, 64, 0], Y1 - TH - 8 - 2, 1);

  /* ---- 2 ESCs de pé, colados por dentro das paredes ao lado do servo (fios do motor embaixo, bateria e sinal em cima) ---- */
  const escTex = label(240, 500, [['ESC', '800 120px "Barlow Condensed", Arial', 190], ['12 A', '700 96px "Barlow Condensed", Arial', 310]], '#2a59c9');
  for (const s of sides) {
    const g = sg(s < 0 ? 'escE' : 'escD', [0, 10, 46 * s], 6, V3(20, 39.5, 31.5 * s), [0, 70, 0]);
    b.mesh(G.rbox(12, 25, 5, 1.8), MAT.esc, 'esc', `ESC 12 A (BLHeli_S) · motor ${s < 0 ? 'de baixo' : 'de cima'}`, g);
    const d = at(b.mesh(new THREE.PlaneGeometry(9, 19), decalMat(escTex, false), 'esc', `ESC 12 A (BLHeli_S) · motor ${s < 0 ? 'de baixo' : 'de cima'}`, g, false), 0, 0, -s * 2.55);
    if (s > 0) d.rotation.y = Math.PI;
  }

  /* ---- passo 14 · saia: 2 asas de MDF (chapa 2) coladas embaixo do chassi + tiras de EVA até 1 mm do chão ---- */
  const gSk = sg('saia', [0, -46, 0], 14, null, [0, -72, 0]);
  const saO = [[-40, 28], [40, 28], [40, 80], [32, 88], [-32, 88], [-40, 80]];
  for (const s of sides) M(gSk, 'saia', 'Asa da saia (MDF, colada embaixo do chassi)', 'SA', 'xz', 13, s > 0 ? saO : saO.map(([x, z]) => [x, -z]).reverse(), [], { sheet: 2, qty: 2, exp: s > 0 });
  const ar = sArea(SKIRT) > 0 ? 1 : -1;
  for (let i = 0; i < SKIRT.length; i++) {
    const [x0, z0] = SKIRT[i], [x1, z1] = SKIRT[(i + 1) % SKIRT.length], L = Math.hypot(x1 - x0, z1 - z0);
    const top = Math.max(Math.abs(z0), Math.abs(z1)) > 41 ? 13 : 16, nx = -(z1 - z0) / L * ar, nz = (x1 - x0) / L * ar;   // normal para dentro
    const w = b.mesh(G.box(L + .6, top - 1, 2), MAT.eva, 'saia', 'Saia de EVA 2 mm (fica a 1 mm do chão)', gSk);
    w.position.set((x0 + x1) / 2 + nx, (top + 1) / 2, (z0 + z1) / 2 + nz); w.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  }

  /* ---- bateria LiPo 2S só da turbina, no teto, presa com 2 fitas de velcro pelos rasgos do rack ---- */
  const gB = sg('lipoSuc', [0, 172, 0], 14, null, [0, 70, 0]);
  at(b.mesh(G.rbox(58, 13, 30, 2.4), MAT.lipo, 'lipo', 'Bateria LiPo 2S 7,4 V 850 mAh (só da turbina)', gB), -44, 107.3, 0);
  const lpTex = label(580, 300, [['LiPo 2S · 7,4 V', '800 70px "Barlow Condensed", Arial', 105], ['850 mAh · 30C', '700 60px "Barlow Condensed", Arial', 200]], '#1d3f8a');
  at(b.mesh(new THREE.PlaneGeometry(50, 24).rotateX(-Math.PI / 2).rotateY(Math.PI), decalMat(lpTex, false), 'lipo', 'Bateria LiPo 2S 7,4 V 850 mAh (só da turbina)', gB, false), -44, 113.86, 0);
  for (const x of [-51, -35]) {
    const sub = 'Fita de velcro (passa pelos rasgos do teto)';
    at(b.mesh(G.box(9, 1.2, 37.2), MAT.dark, 'lipo', sub, gB), x, 114.4, 0);
    at(b.mesh(G.box(9, 1.2, 37.2), MAT.dark, 'lipo', sub, gB), x, 97.2, 0);
    for (const s of sides) at(b.mesh(G.box(9, 18.4, 1.2), MAT.dark, 'lipo', sub, gB), x, 105.8, 18 * s);
  }
  at(b.mesh(G.rbox(8, 5.5, 16, .8), MAT.tt, 'lipo', 'Conector XT30 (desligue aqui: turbina sem energia)', gB), -7, 103.55, 9);

  /* ---- ar: sai pelas janelas das paredes e entra por baixo da saia ---- */
  const dot = textTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const air = (n, size) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    p.frustumCulled = false; p.renderOrder = 8; p.visible = false; R.root.add(p);
    return { p, n, t: new Float32Array(n).fill(9), life: new Float32Array(n).fill(1), o: new Float32Array(n * 3), v: new Float32Array(n * 3) };
  };
  S.out = air(150, 6.5); S.in = air(110, 4.2);
  let per = 0; S.seg = SKIRT.map((a, i) => { const c = SKIRT[(i + 1) % SKIRT.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); per += L; return { a, c, L, nx: (c[1] - a[1]) / L * ar, nz: -(c[0] - a[0]) / L * ar }; });
  S.per = per;
}
// gira os rotores, acende o borrão das hélices e move o ar; k = nível suave da turbina (0 – 1)
function updateSuccao(R, k, dt, show) {
  const S = R.suc; if (!S) return;
  S.ang += dt * (4 + 22 * k) * (k > .004 ? 1 : 0);
  for (const r of S.rot) r.g.rotation.y = S.ang * r.dir;
  for (const d of S.blur) d.material.opacity = .34 * Math.min(1, k * 1.8);
  const rnd = (a, c) => a + Math.random() * (c - a);
  for (const A of [S.out, S.in]) {
    A.p.visible = show && k > .015; if (!A.p.visible) { A.t.fill(9); continue; }
    const P = A.p.geometry.attributes.position.array, C = A.p.geometry.attributes.color.array, out = A === S.out;
    for (let i = 0; i < A.n; i++) {
      A.t[i] += dt;
      if (A.t[i] < 0) continue;                                     // esperando para nascer
      if (A.t[i] > A.life[i]) {
        if (out) {   // janelas RB(-45, -6, 28, 56) das paredes
          const s = i & 1 ? 1 : -1;
          A.o.set([rnd(-42, -9), rnd(30, 54), s * 38.5], 3 * i);
          A.v.set([rnd(-35, 35), rnd(-8, 40), s * rnd(150, 260) * (.45 + .55 * k)], 3 * i);
          A.life[i] = rnd(.45, .85);
        } else {     // vem do chão em volta e some embaixo da saia
          let u = Math.random() * S.per, sg = S.seg[0]; for (const q of S.seg) { if (u <= q.L) { sg = q; break; } u -= q.L; }
          const f = u / sg.L, d = rnd(26, 46), sp = rnd(55, 95) * (.5 + .5 * k);
          A.o.set([sg.a[0] + (sg.c[0] - sg.a[0]) * f + sg.nx * d, rnd(.6, 2.6), sg.a[1] + (sg.c[1] - sg.a[1]) * f + sg.nz * d], 3 * i);
          A.v.set([-sg.nx * sp, 0, -sg.nz * sp], 3 * i);
          A.life[i] = d / sp;
        }
        A.t[i] = -Math.random() * (1 - k) * 1.2;                   // menos ar com a turbina fraca
        C[3 * i] = C[3 * i + 1] = C[3 * i + 2] = 0; continue;
      }
      const t = A.t[i], L = A.life[i], e = t / L;
      P[3 * i] = A.o[3 * i] + A.v[3 * i] * t; P[3 * i + 1] = A.o[3 * i + 1] + A.v[3 * i + 1] * t; P[3 * i + 2] = A.o[3 * i + 2] + A.v[3 * i + 2] * t;
      const a = (out ? Math.sin(Math.PI * Math.min(1, e)) * .5 : Math.min(1, t / .12) * Math.min(1, (L - t) / .1) * .42) * (.35 + .65 * k);
      C[3 * i] = .82 * a; C[3 * i + 1] = .9 * a; C[3 * i + 2] = a;
    }
    A.p.geometry.attributes.position.needsUpdate = true; A.p.geometry.attributes.color.needsUpdate = true;
  }
}
// visibilidade que depende do passo da montagem: barras de direção e cada grupo de fios
function stepVis(R, k, on = true) {
  if (R.tieGroup) R.tieGroup.visible = !on || k >= R.tieGroup.userData.step;
  for (const g of Object.values(R.wireG || {})) g.visible = on ? k >= g.userData.step : true;
}

/* ============================ KIT DE MANOBRAS (opcional) ============================
   Peças genéricas: EDF 30 mm + saia de TPU (sucção), cilindro de CO2 88 g + regulador + 5 válvulas
   (turbo, freio, giro ←, giro →, aderência), válvula de alta pressão do pouso, 14 bicos, sensores.
   Os suportes viram peças de MDF quando as peças compradas estiverem definidas. */
const VNAME = { turbo: 'turbo', freio: 'freio', esq: 'giro esquerda', dir: 'giro direita', ader: 'aderência' };
function buildKit(b, R, grp, root, label) {
  const K = { nz: { turbo: [], freio: [], esq: [], dir: [], ader: [], pouso: [] }, pm: {} };
  const PL = new THREE.MeshBasicMaterial({ color: 0xe6f2ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const plumeG = new THREE.CylinderGeometry(9, 1.2, 46, 18, 1, true).translate(0, 23 + 8.5, 0);
  const plumeC = new THREE.CylinderGeometry(3.4, .8, 26, 12, 1, true).translate(0, 13 + 8.5, 0);
  // bico metálico com engate de 4 mm; o +Y local é a direção do jato
  const nozzle = (parent, part, ch, pos, dir, sub, big = false) => {
    const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(Y_AX, dir.clone().normalize()); parent.add(g);
    b.mesh(G.cylY(2.6, 5, 14).translate(0, 2.5, 0), MAT.brass, part, sub, g);
    b.mesh(new THREE.CylinderGeometry(1.5, 2.2, 3.5, 14).translate(0, 6.75, 0), MAT.steel, part, sub, g);
    const pm = K.pm[ch] || (K.pm[ch] = { a: PL.clone(), c: PL.clone() });
    const sc = big ? 1.7 : 1, pa = new THREE.Mesh(plumeG, pm.a), pc = new THREE.Mesh(plumeC, pm.c);
    for (const q of [pa, pc]) { q.scale.setScalar(sc); q.renderOrder = 6; q.frustumCulled = false; q.visible = false; g.add(q); }
    K.nz[ch].push({ g, pa, pc, sc });
    return g;
  };
  K.hoses = new THREE.Group(); root.add(K.hoses);
  const hose = (part, pts) => b.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), false, 'centripetal', .5), pts.length * 16, 1.6, 8, false), MAT.hose, part, 'Mangueira PU 4 mm', K.hoses, false);

  /* ---- sucção: EDF 30 mm em pé sobre a abertura Ø31 do chassi (x = -12), entre as bandejas ---- */
  const gE = grp('kitEDF', [0, 46, 0], 13);
  at(b.mesh(tube(15.6, 20, 3, 40), MAT.mdf, 'kitSuccao', 'Anel de fixação da ventoinha (MDF)', gE), -12, 23.5, 0);
  at(b.mesh(tube(15, 17, 30, 40), MAT.chip, 'kitSuccao', 'Duto da EDF 30 mm (ar sai por cima)', gE), -12, 40, 0);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, v = at(b.mesh(G.box(9, 8, .8), MAT.chip, 'kitSuccao', 'Duto da EDF 30 mm (ar sai por cima)', gE), -12 + 10.5 * Math.cos(a), 47, 10.5 * Math.sin(a)); v.rotation.y = -a; }
  at(b.mesh(G.cylY(6, 16, 24), MAT.dark, 'kitSuccao', 'Motor brushless da EDF (3S)', gE), -12, 45, 0);
  const rotor = new THREE.Group(); rotor.position.set(-12, 33, 0); gE.add(rotor); K.rotor = rotor;
  b.mesh(G.cylY(6.2, 5, 24), MAT.dark, 'kitSuccao', 'Rotor da EDF (11 pás)', rotor);
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, bl = b.mesh(G.box(8.4, .7, 5), MAT.dark, 'kitSuccao', 'Rotor da EDF (11 pás)', rotor); bl.position.set(10.3 * Math.cos(a), 0, 10.3 * Math.sin(a)); bl.rotation.order = 'YXZ'; bl.rotation.set(.55, -a, 0); }
  // saia de TPU embaixo do chassi (dentro da largura de 81 mm): fecha a área da sucção
  const gS = grp('kitSaia', [0, -46, 0], 13);
  const sk = [[-34, -24], [1, -24], [1, -38], [70, -38], [70, 38], [1, 38], [1, 24], [-34, 24]];
  for (let i = 0; i < sk.length; i++) {
    const [x0, z0] = sk[i], [x1, z1] = sk[(i + 1) % sk.length], L = Math.hypot(x1 - x0, z1 - z0);
    const w = b.mesh(G.box(L + 1.2, 12.6, 1.2), MAT.tpu, 'kitSuccao', 'Saia de TPU (veda a sucção)', gS);
    w.position.set((x0 + x1) / 2, 9.7, (z0 + z1) / 2); w.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  }
  at(b.mesh(G.rbox(16, 2, 14, .6), MAT.mdf, 'sensores', 'Suporte do laser de altura (MDF)', gS), 44, 15, 0);
  at(b.mesh(G.box(13, 1.6, 18), MAT.blue, 'sensores', 'Laser VL53L1X para baixo (altura do chão)', gS), 44, 13.2, 0);
  at(b.mesh(G.box(4.4, 1.2, 2.4), MAT.chip, 'sensores', 'Laser VL53L1X para baixo (altura do chão)', gS), 44, 11.8, 0);

  /* ---- teto: cilindro de CO2, regulador, válvula do pouso, bloco de 5 válvulas, LiPo e placa de potência ---- */
  const gT = grp('kitTeto', [0, 250, 0], 13), cz = -18, cy = 122.8, RT = 100.8;   // RT: face de cima do teto
  const cyl = new THREE.LatheGeometry(v2([[0, -86], [7.5, -86], [8, -77], [14, -74.6], [18.6, -70.4], [20, -66], [20, 55], [18.6, 59.4], [15, 62.4], [9, 64.4], [0, 65]]), 40).rotateZ(-Math.PI / 2);
  at(b.mesh(cyl, MAT.co2, 'kitJatos', 'Cilindro de CO2 88 g (≈ 60 bar)', gT), -10, cy, cz);
  const sad = new THREE.Shape(); sad.moveTo(-22, 0); sad.lineTo(22, 0); sad.lineTo(22, 14); sad.absarc(0, 22, 20.4, Math.atan2(-8, 18.77), Math.atan2(-8, -18.77), true); sad.lineTo(-22, 14); sad.lineTo(-22, 0);
  const sadG = prism(sad, 10, .5, 24).rotateY(Math.PI / 2);
  for (const x of [-55, 25]) {
    at(b.mesh(sadG, MAT.mdf, 'kitJatos', 'Berço do cilindro (MDF)', gT), x, RT, cz);
    at(b.mesh(tube(20.1, 21.4, 6, 40).rotateZ(Math.PI / 2), MAT.dark, 'kitJatos', 'Cinta do cilindro', gT), x, cy, cz);
  }
  const XT = -103;
  at(b.mesh(G.rbox(14, 14, 14, 1.5), MAT.brass, 'kitJatos', 'Bloco T no bocal do cilindro', gT), XT, cy, cz);
  at(b.mesh(G.cylZ(13, 28, 32), MAT.brass, 'kitJatos', 'Regulador de pressão (6 – 8 bar)', gT), XT, cy, cz + 21);
  at(b.mesh(G.cylY(3, 6, 14), MAT.brass, 'kitJatos', 'Regulador de pressão (6 – 8 bar)', gT), XT, cy + 14, cz + 22);
  at(b.mesh(G.cylY(11, 7, 32), MAT.steel, 'kitJatos', 'Manômetro do regulador', gT), XT, cy + 20, cz + 22);
  at(b.mesh(G.cylY(9.6, .5, 32), MAT.white, 'kitJatos', 'Manômetro do regulador', gT), XT, cy + 23.8, cz + 22);
  at(b.mesh(G.rbox(14, 12, 14, 1.5), MAT.brass, 'kitPouso', 'Válvula de alta pressão do pouso (antes do regulador)', gT), XT, cy - 13, cz);
  at(b.mesh(G.cylZ(8, 16, 24), MAT.dark, 'kitPouso', 'Válvula de alta pressão do pouso (antes do regulador)', gT), XT, cy - 13, cz - 15);
  at(b.mesh(G.rbox(56, 10, 36, 1.5), MAT.alu, 'kitJatos', 'Bloco de válvulas (manifold)', gT), -60, RT + 5, 22);
  const VP = { turbo: [-78, 14], freio: [-60, 14], esq: [-42, 14], dir: [-78, 32], ader: [-60, 32] };
  for (const [k, [x, z]] of Object.entries(VP)) {
    const sub = 'Válvula solenoide 12 V · ' + VNAME[k];
    at(b.mesh(G.rbox(12, 10, 12, 1), MAT.brass, 'kitJatos', sub, gT), x, RT + 15, z);
    at(b.mesh(G.cylY(7.6, 16, 24), MAT.dark, 'kitJatos', sub, gT), x, RT + 28, z);
    at(b.mesh(G.rbox(9, 4, 6, .8), MAT.dark, 'kitJatos', sub, gT), x, RT + 38, z);
  }
  at(b.mesh(G.rbox(70, 20, 34, 2), MAT.lipo, 'kitSuccao', 'Bateria LiPo 3S 1000 mAh (ventoinha e válvulas)', gT), 10, RT + 10, 22);
  at(b.mesh(new THREE.PlaneGeometry(60, 15), decalMat(label(600, 150, [['LiPo 3S · 1000 mAh · 11,1 V', '700 54px "Barlow Condensed", Arial', 78]])), 'kitSuccao', 'Bateria LiPo 3S 1000 mAh (ventoinha e válvulas)', gT, false), 10, RT + 10, 39.05);
  at(b.mesh(G.rbox(52, 2, 30, .5), MAT.green, 'sensores', 'Placa de potência: 6 MOSFETs das válvulas', gT), 8, RT + 21, 22);
  for (let i = 0; i < 6; i++) at(b.mesh(G.box(5, 4, 6), MAT.chip, 'sensores', 'Placa de potência: 6 MOSFETs das válvulas', gT), -12 + i * 8, RT + 24, 14);
  at(b.mesh(G.rbox(38, 7, 13, 1.5), MAT.blue, 'kitSuccao', 'ESC 20 A da ventoinha', gT), 12, RT + 25.5, 30);
  // aderência: 2 bicos para cima nas bordas do teto
  for (const s of [-1, 1]) {
    at(b.mesh(G.rbox(5, 4, 5, 1), MAT.mdf, 'kitJatos', 'Suporte dos bicos (MDF)', gT), -28.5, RT + 2, 38 * s);
    nozzle(gT, 'kitJatos', 'ader', V3(-28.5, RT + 4, 38 * s), V3(0, 1, 0), 'Bico de aderência (jato para cima)');
  }
  // pouso: 4 bicos para baixo em braços presos por fora das paredes, logo abaixo do teto, entre as rodas
  for (const x of [-40, 0]) for (const s of [-1, 1]) {
    bar(b, MAT.mdf, 'kitPouso', 'Braço do bico de pouso (MDF)', gT, [x, 93.5, 39.4 * s], [x, 93.5, 73 * s], 6);
    nozzle(gT, 'kitPouso', 'pouso', V3(x, 90.5, 73 * s), V3(0, -1, 0), 'Bico de pouso (jato para baixo)', true);
  }
  // MPU-6050 na prateleira eletrônica
  const gDk = R.groups.find(g => g.name === 'bandeja');
  at(b.mesh(G.rbox(21, 1.6, 16, .3), MAT.blue, 'sensores', 'MPU-6050 (acelerômetro + giroscópio)', gDk), 80, 64.8, 25);
  at(b.mesh(G.box(4, 1, 4), MAT.chip, 'sensores', 'MPU-6050 (acelerômetro + giroscópio)', gDk), 80, 66.1, 25);

  /* ---- frente: freio (para a frente), giro (laterais do para-choque) e laser de beirada ---- */
  const gF = grp('kitFrente', [74, 10, 0], 13);
  for (const s of [-1, 1]) {
    at(b.mesh(G.rbox(3, 5, 8, .8), MAT.mdf, 'kitJatos', 'Suporte dos bicos (MDF)', gF), 112.5, 42, 29 * s);
    nozzle(gF, 'kitJatos', 'freio', V3(114, 42, 29 * s), V3(1, 0, 0), 'Bico de freio (jato para a frente)');
    at(b.mesh(G.rbox(6, 6, 3, .8), MAT.mdf, 'kitJatos', 'Suporte dos bicos (MDF)', gF), 108, 40, 37.5 * s);
    nozzle(gF, 'kitJatos', s > 0 ? 'esq' : 'dir', V3(108, 40, 39 * s), V3(0, 0, s), 'Bico de giro (lateral, frente)');
  }
  at(b.mesh(G.rbox(2, 10, 16, .5), MAT.mdf, 'sensores', 'Suporte do laser de beirada (MDF)', gF), 112, 21, 0);
  const tf = new THREE.Group(); tf.position.set(117.75, 18, 0); tf.rotation.z = -Math.PI / 4; gF.add(tf);
  at(b.mesh(G.rbox(2, 6, 10, .4), MAT.mdf, 'sensores', 'Suporte do laser de beirada (MDF)', tf), -1.8, 0, 0);
  b.mesh(G.box(1.6, 13, 18), MAT.blue, 'sensores', 'Laser VL53L1X a 45° (detector de beirada)', tf);
  at(b.mesh(G.box(1.2, 2.4, 4.4), MAT.chip, 'sensores', 'Laser VL53L1X a 45° (detector de beirada)', tf), 1.4, 0, 0);

  /* ---- traseira: turbo (para trás), giro (laterais) e chave de armar no painel traseiro ---- */
  const gR = grp('kitTras', [-64, 24, 0], 13);
  for (const s of [-1, 1]) {
    at(b.mesh(G.rbox(3, 8, 8, .8), MAT.mdf, 'kitJatos', 'Suporte dos bicos (MDF)', gR), -102.5, 41, 30 * s);
    nozzle(gR, 'kitJatos', 'turbo', V3(-104, 41, 30 * s), V3(-1, 0, 0), 'Bico turbo (jato para trás)');
    at(b.mesh(G.rbox(5.6, 6, 3, .8), MAT.mdf, 'kitJatos', 'Suporte dos bicos (MDF)', gR), -103.8, 62, 38 * s);
    nozzle(gR, 'kitJatos', s < 0 ? 'esq' : 'dir', V3(-103.8, 62, 39.5 * s), V3(0, 0, s), 'Bico de giro (lateral, traseira)');
  }
  at(b.mesh(G.rbox(4, 9, 12, .8), MAT.red, 'sensores', 'Chave de armar (corta válvulas e ventoinha)', gR), -103, 74, -14);
  const lev = at(b.mesh(G.cylX(1, 8, 10), MAT.steel, 'sensores', 'Chave de armar (corta válvulas e ventoinha)', gR), -108, 76, -14); lev.rotation.z = -.5;

  /* ---- mangueiras PU 4 mm (por cima do teto e descendo pela frente e pela traseira) ---- */
  const J = 'kitJatos', H = RT + 2.2;
  for (const s of [-1, 1]) {
    const zr = 33.5 * s;
    hose(J, [[-60, RT + 6, 14 + 2 * s], [-44, H + 2, zr], [40, H, zr], [100, H, zr], [103.5, RT - 6, zr], [104, 70, 31 * s], [106, 50, 29.5 * s], [110, 43, 29 * s], [112.5, 42, 29 * s]]);
    hose(J, [[-42, RT + 6, 14 + 2 * s], [-30, H + 2, 35.5 * s], [40, H + .4, 35.5 * s], [99, H + .4, 35.5 * s], [102.5, RT - 7, 35.5 * s], [103, 66, 36 * s], [105, 48, 37.5 * s], [107.5, 41, 38 * s], [108, 40, 38 * s]]);
    hose(J, [[-78, RT + 6, 14 + 4 * s], [-90, H + 2, 28 * s], [-99, H, 30 * s], [-102.5, RT - 6, 30 * s], [-103, 60, 30 * s], [-103, 45, 30 * s], [-102.8, 41, 30 * s]]);
    hose(J, [[-78, RT + 6, 32 + 2 * s], [-92, H + 2, 36 * s], [-100, H, 37 * s], [-102.8, RT - 8, 37 * s], [-103.4, 70, 38 * s], [-103.8, 62, 38.5 * s]]);
    hose(J, [[-60, RT + 6, 32 + 2 * s], [-44, H + 1.5, 38 * s], [-33, H + .5, 38 * s], [-28.5, RT + 4.2, 38 * s]]);
    for (const x of [-40, 0]) hose('kitPouso', [[XT, cy - 13, cz - 22], [-98, H + 3, 39 * s], [x - 8, H + 2, 42 * s], [x - 2, 97.5, 44 * s], [x - 1, 97.5, 68 * s], [x, 92, 73 * s]]);
  }
  hose(J, [[XT, cy, cz + 35], [-96, RT + 8, 26], [-88, RT + 6, 22]]);
  return K;
}

/* ---------- furos de verdade (CSG): cada parafuso abre o próprio furo nas peças impressas ---------- */
function frustumGeo(pos, dir, d0, d1, r0, r1, seg = 24, th = 0) {   // tronco de cone ao longo de dir, da profundidade d0 (raio r0) a d1 (raio r1)
  const g = new THREE.CylinderGeometry(r0, r1, d1 - d0, seg, 1, false, th); g.deleteAttribute('uv');
  g.translate(0, -(d0 + d1) / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(NEG_Y, dir)); g.translate(pos.x, pos.y, pos.z);
  return g;
}
const HOLE_R = { shcs: [2.2, 1.8], csk: [2.2, 1.8], m2: [1.15, .8] };   // [passante, rosca direta]
function csgClean(g, eps = 1e-9) {
  g = g.index ? g.toNonIndexed() : g.clone();
  const P = g.attributes.position.array, N = g.attributes.normal ? g.attributes.normal.array : null, keep = [];
  for (let t = 0; t < P.length; t += 9) {
    const ux = P[t + 3] - P[t], uy = P[t + 4] - P[t + 1], uz = P[t + 5] - P[t + 2], vx = P[t + 6] - P[t], vy = P[t + 7] - P[t + 1], vz = P[t + 8] - P[t + 2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > eps) keep.push(t);
  }
  const pos = new Float32Array(keep.length * 9), nor = new Float32Array(keep.length * 9);
  keep.forEach((t, i) => { pos.set(P.subarray(t, t + 9), i * 9); if (N) nor.set(N.subarray(t, t + 9), i * 9); });
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (!N) o.computeVertexNormals();
  return o;
}
function csgSub(geo, cutters) {   // subtrai sólidos (mesmo sistema de coordenadas) e devolve só posição + normal
  if (!CSG || !cutters.length) return geo;
  const { Brush, Evaluator, SUBTRACTION } = CSG, ev = new Evaluator(); ev.attributes = ['position', 'normal']; ev.useGroups = false;
  let a = new Brush(csgClean(geo)); a.updateMatrixWorld();
  for (const c of cutters) { const b = new Brush(csgClean(c)); b.updateMatrixWorld(); a = ev.evaluate(a, b, SUBTRACTION); }
  return csgClean(a.geometry, 2e-4);   // tira lascas degeneradas que o CSG deixa nas bordas dos cortes
}
function cutHoles(R) {
  if (!CSG) return false;
  const t0 = performance.now();
  try {
    const { Brush, Evaluator, SUBTRACTION } = CSG, ev = new Evaluator();
    ev.attributes = ['position', 'normal']; ev.useGroups = false;
    R.stand.updateMatrixWorld(true);
    const pr = R.b.pick.filter(m => m.isMesh && !m.isInstancedMesh && m.material.userData.petg && m.userData.part !== 'rodas' && m.geometry.type !== 'PlaneGeometry');
    for (const m of pr) { m.geometry.computeBoundingBox(); m.userData.wb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); }
    const jobs = new Map(), add = (m, g) => { if (!jobs.has(m)) jobs.set(m, []); jobs.get(m).push(g); };
    const rc = new THREE.Raycaster(), box = new THREE.Box3();
    // peças cruzadas por raios paralelos ao eixo (profundidade d0 → d1, a rad mm do eixo)
    const crossed = (pos, dir, d0, d1, rad, n, out = new Map()) => {
      const a = Math.abs(dir.y) < .9 ? Y_AX : V3(1, 0, 0), u = V3().crossVectors(dir, a).normalize(), w = V3().crossVectors(dir, u);
      box.makeEmpty().expandByPoint(pos.clone().addScaledVector(dir, d0)).expandByPoint(pos.clone().addScaledVector(dir, d1)).expandByScalar(rad + .5);
      const cand = pr.filter(m => m.userData.wb.intersectsBox(box)); if (!cand.length) return out;
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2, o = u.clone().multiplyScalar(rad * Math.cos(t)).addScaledVector(w, rad * Math.sin(t));
        rc.set(pos.clone().addScaledVector(dir, d0).add(o), dir); rc.near = 0; rc.far = d1 - d0;
        for (const h of rc.intersectObjects(cand, false)) { const d = d0 + h.distance, e = out.get(h.object); if (!e) out.set(h.object, { min: d, max: d }); else { e.min = Math.min(e.min, d); e.max = Math.max(e.max, d); } }
      }
      return out;
    };
    for (const f of R.fast) {
      const HR = HOLE_R[f.type]; if (!HR) continue;
      const M = f.group.matrixWorld, pos = f.pos.clone().applyMatrix4(M), dir = f.dir.clone().transformDirection(M), L = f.L;
      const tap = f.type === 'm2' || (JOINTS[f.joint] && JOINTS[f.joint].fix.some(([t]) => t === 'tap'));
      const sh = crossed(pos, dir, -.3, L + .3, 0, 1); crossed(pos, dir, -.3, L + .3, HR[1] * .8, 4, sh);
      let deep = null; for (const [m, e] of sh) if (!deep || e.max > sh.get(deep).max) deep = m;
      for (const [m] of sh) { const r = tap && m.parent === deep.parent ? HR[1] : HR[0]; add(m, frustumGeo(pos, dir, -.6, L + .6, r, r, r > 1.5 ? 24 : 14)); }
      if (f.type === 'csk') for (const [m] of crossed(pos, dir, -.4, 1.2, 3.1, 8)) add(m, frustumGeo(pos, dir, -.4, 2.25, 4.85, 2.2, 28));   // escareado 90° na peça sob a cabeça
      else if (f.type === 'shcs') for (const [m] of crossed(pos, dir, -9, -.15, 3.1, 8)) { if (sh.has(m)) add(m, frustumGeo(pos, dir, -9, 0, 3.8, 3.8, 28)); }   // cabeça embutida na peça que o parafuso atravessa → rebaixo Ø7,6
    }
    for (const c of R.cuts) for (const g of [].concat(c.make())) {
      g.applyMatrix4(c.group.matrixWorld); g.computeBoundingBox();
      for (const m of pr) if (m.parent === c.group && m.userData.wb.intersectsBox(g.boundingBox)) add(m, g);
    }
    const inv = new THREE.Matrix4();
    let fails = 0;
    for (const [m, list] of jobs) {
      try {
        inv.copy(m.matrixWorld).invert(); const flip = inv.determinant() < 0;
        let a = new Brush(csgClean(m.geometry)); a.updateMatrixWorld();
        for (const gw of list) {
          const g = csgClean(gw.clone().applyMatrix4(inv));
          if (flip) { const P = g.attributes.position.array, N = g.attributes.normal.array; for (let i = 0; i < P.length; i += 9) for (const A of [P, N]) for (let k = 0; k < 3; k++) { const t = A[i + 3 + k]; A[i + 3 + k] = A[i + 6 + k]; A[i + 6 + k] = t; } }
          const bb = new Brush(g); bb.updateMatrixWorld(); a = ev.evaluate(a, bb, SUBTRACTION);
        }
        const out = csgClean(a.geometry, 2e-4); out.computeBoundingBox(); out.computeBoundingSphere();
        if (EXPORT) { m.userData.raw = m.geometry; m.userData.cutW = list; }
        m.geometry = out; m.userData.cuts = list.length;
      } catch (e) { fails++; console.info('CSG falhou em', m.userData.sub, e.message); }
    }
    R.cutFails = fails;
    R.cutCount = jobs.size; R.cutMs = Math.round(performance.now() - t0);
    return true;
  } catch (e) { console.info('Furos CSG não aplicados:', e); return false; }
}

/* ---------- instancia os fixadores por (tipo, grupo) ---------- */
function buildFasteners(R) {
  const byKey = new Map();
  R.fast.forEach((f, i) => {
    f.id = i; const meta = FMETA[f.type]; f.part = meta.part; f.fly = meta.fly * (['shcs', 'csk', 'm2', 'p3', 'p25'].includes(f.type) ? f.L + 14 : 14);
    const k = f.type + '-' + f.L + '|' + f.group.uuid; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(f);
  });
  R.fims = [];
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), one = V3(1, 1, 1);
  for (const [k, list] of byKey) {
    const f0 = list[0], meta = FMETA[f0.type];
    const im = new THREE.InstancedMesh(fgeo(f0.type + '-' + f0.L), R.b.mat(meta.part, MAT[meta.mat]), list.length);
    im.castShadow = true; im.receiveShadow = true; im.userData = { part: meta.part, sub: '', recs: list, cs: true };
    const upFirst = ['nut', 'nyloc', 'washer', 'bearing', 'n3', 'y3', 'n25'].includes(f0.type);
    list.forEach((f, i) => { f.im = im; f.idx = i; f.quat = q.setFromUnitVectors(upFirst ? Y_AX : NEG_Y, f.dir).clone(); m.compose(f.pos, f.quat, one); im.setMatrixAt(i, m); });
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3).fill(1), 3);
    im.computeBoundingSphere(); im.computeBoundingBox();
    f0.group.add(im); R.b.reg(meta.part).meshes.push(im); R.b.pick.push(im); R.fims.push(im);
    if (meta.fly) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(list.length * 6), 3));
      const ln = new THREE.LineSegments(lg, new THREE.LineDashedMaterial({ color: 0xf2b10c, dashSize: 2.5, gapSize: 2, transparent: true, opacity: .75 }));
      ln.visible = false; ln.frustumCulled = false; f0.group.add(ln); im.userData.lines = ln;
    }
  }
}
// abertura de furo em cada assento de cabeça e em cada furo de rosca (some junto com a peça dona)
function buildHoles(R) {
  const hm = MAT.hole.clone(); hm.userData = { flat: false }; enhance(hm);
  const list = [...R.fast.filter(f => f.type === 'shcs' || f.type === 'csk').map(f => ({ group: f.group, pos: f.pos, dir: f.dir, owner: JOWN[f.joint] || null, r: f.type === 'csk' ? 2.2 : 2.2 })), ...R.holes];
  const by = new Map(); for (const h of list) { const k = h.group.uuid + '|' + (h.owner || '') + '|' + h.r; if (!by.has(k)) by.set(k, []); by.get(k).push(h); }
  R.markers = []; const q = new THREE.Quaternion(), m = new THREE.Matrix4();
  for (const [, hs] of by) {
    const geo = fgeo('holeM').clone().scale(hs[0].r / 2.2, 1, hs[0].r / 2.2);
    const im = new THREE.InstancedMesh(geo, hm, hs.length); im.userData = { owner: hs[0].owner };
    hs.forEach((h, i) => { q.setFromUnitVectors(NEG_Y, h.dir); m.compose(h.pos, q, V3(1, 1, 1)); im.setMatrixAt(i, m); });
    im.computeBoundingSphere(); hs[0].group.add(im); R.markers.push(im);
  }
}
// explode/montagem: cada fixador recua ao longo do próprio eixo
function updateFasteners(R, factorOf) {
  const m = new THREE.Matrix4(), p = V3(), zero = V3(0, 0, 0), one = V3(1, 1, 1);
  for (const im of R.fims) {
    const ln = im.userData.lines, arr = ln ? ln.geometry.attributes.position.array : null; let anyLine = false;
    im.userData.recs.forEach((f, i) => {
      const t = factorOf(f);
      if (t < 0) { m.compose(f.pos, f.quat, zero); im.setMatrixAt(i, m); if (arr) arr.fill(0, i * 6, i * 6 + 6); return; }
      p.copy(f.pos).addScaledVector(f.dir, -f.fly * t); m.compose(p, f.quat, one); im.setMatrixAt(i, m);
      if (arr) { f.pos.toArray(arr, i * 6); p.toArray(arr, i * 6 + 3); if (t > .02) anyLine = true; }
    });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    if (ln) { ln.geometry.attributes.position.needsUpdate = true; ln.computeLineDistances(); ln.visible = anyLine; }
  }
}

/* ---------- direção: ligação real (servo → barras de comprimento fixo → mangas) ---------- */
function linkInit(R) {
  const L = R.link, rot = (d, x, z) => [x * Math.cos(d) + z * Math.sin(d), -x * Math.sin(d) + z * Math.cos(d)];
  L.rot = rot;
  L.hole = (phi, sgn) => { const [x, z] = rot(phi, L.h, sgn * L.e); return [L.S + x, z]; };
  L.tipW = (sgn, d) => { const [x, z] = rot(d, L.tip[0], sgn * L.tip[1]); return [L.K + x, sgn * L.Kz + z]; };
  const len = sgn => { const t = L.tipW(sgn, 0), h = L.hole(0, sgn); return Math.hypot(t[0] - h[0], t[1] - h[1]); };
  L.Lr = len(1);
  L.solve = (phi, sgn, prev) => {   // interseção de círculos: ponta do braço (raio a em torno do pino-mestre) × barra (raio Lr em torno do furo)
    const K = [L.K, sgn * L.Kz], H = L.hole(phi, sgn), a = Math.hypot(L.tip[0], L.tip[1]);
    const dx = H[0] - K[0], dz = H[1] - K[1], d = Math.hypot(dx, dz), t = (a * a - L.Lr * L.Lr + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - t * t));
    const mx = K[0] + t * dx / d, mz = K[1] + t * dz / d, p1 = [mx - hh * dz / d, mz + hh * dx / d], p2 = [mx + hh * dz / d, mz - hh * dx / d];
    const pv = L.tipW(sgn, prev), p = (p1[0] - pv[0]) ** 2 + (p1[1] - pv[1]) ** 2 < (p2[0] - pv[0]) ** 2 + (p2[1] - pv[1]) ** 2 ? p1 : p2;
    const a0 = Math.atan2(-(sgn * L.tip[1]), L.tip[0]), a1 = Math.atan2(-(p[1] - K[1]), p[0] - K[0]);
    let dd = a1 - a0; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; return dd;
  };
  // tabela φ → ângulos (φ < 0 vira à esquerda)
  L.tab = []; let dL = 0, dR = 0;
  for (let i = 0; i <= 200; i++) { const phi = -i * .2 * DEG; dL = L.solve(phi, -1, dL); dR = L.solve(phi, 1, dR); L.tab.push([phi, dL, dR]); }
}
function steerPose(R, s) {
  const L = R.link; if (!L.tab) linkInit(R);
  const target = Math.abs(s) * 30 * DEG; let row = L.tab[0];
  for (let i = 1; i < L.tab.length; i++) { const p = L.tab[i - 1], q = L.tab[i]; if (q[1] >= target) { const f = (target - p[1]) / Math.max(1e-9, q[1] - p[1]); row = [p[0] + (q[0] - p[0]) * f, target, p[2] + (q[2] - p[2]) * f]; break; } row = q; }
  const [phi, din, dout] = row;
  if (s >= 0) { R.horn.rotation.y = phi; R.kL.rotation.y = din; R.kR.rotation.y = dout; }
  else { R.horn.rotation.y = -phi; R.kL.rotation.y = -dout; R.kR.rotation.y = -din; }
  return { phi, din, dout };
}

/* ---------- fiação ---------- */
function buildWires(b, R) {
  const gW = new THREE.Group(); gW.userData.step = 13; R.root.add(gW); R.wireGroup = gW; R.wireG = { 13: gW };
  const WG = st => R.wireG[st] || (R.wireG[st] = (() => { const g = new THREE.Group(); g.userData.step = st; R.root.add(g); return g; })());
  const W = (pts, r, mat, dyn = false, step = 13, sub = 'Cabo') => R.wires.push({ pts, r, mat, dyn, sub, g: WG(step), mesh: null });
  // energia: USB-C do power bank → Pi · USB-A → VCC/GND da L9110S (motores e servo)
  W(['pbC', [6, 74, -11], [16, 72, -8], [30, 70.5, -3], 'piPWR'], 1.5, MAT.wK);
  W(['pbA', [7, 76, 9], [22, 77, 12], [31, 75, 15], R.dIn(3)], .9, MAT.wR);
  W(['pbA', [7, 76.6, 7], [22, 77.6, 10], [31, 75.5, 13.5], R.dIn(2)], .9, MAT.wK);
  // webcam: desce pelo furo do teto até a porta OTG do Pi
  W(['cam', [62, 128, -24], [55, 113, -27.5], [54, 100, -27.5], [54, 90, -26], [55, 78, -10], 'piUSB'], 1.4, MAT.wK);
  // GPIO → entradas da L9110S (A-IA, A-IB, B-IA, B-IB) e GND
  const gp = [[31, 4, MAT.wY], [28, 5, MAT.wG], [32, 0, MAT.wB], [30, 1, MAT.wP], [33, 2, MAT.wK]];
  gp.forEach(([k, i, m], j) => { const a = R.piHdr(k), c = R.dIn(i); W([a, [a.x, 79 + j * .6, a.z + 6], [c.x + 6, 79 + j * .6, c.z - 4], c], .55, m); });
  // servo: sobe pelo furo da prateleira (sinal no GPIO18, V+ e GND na barra de 5 V)
  const s18 = R.piHdr(11);
  [[MAT.wO, 0, s18], [MAT.wR, 1.2, R.dIn(3)], [MAT.wBr, 2.4, R.dIn(2)]].forEach(([m, o, end]) => W(['srv', [14, 30, 5 + o * .3], [24, 46, 9 + o * .3], [44, 56, 10 + o * .4], [45, 66, 10 + o * .4], [45, 75, 8 + o], end], .55, m));
  // motores: canal A = lado esquerdo (FL + RL), canal B = lado direito (FR + RR), em paralelo
  for (const [side, t1, t2] of [[-1, 'dA1', 'dA2'], [1, 'dB1', 'dB2']]) for (const [pol, m, o, term] of [['+', MAT.wR, 0, t1], ['-', MAT.wK, 1.6, t2]]) {
    const z = side * (30 - o);
    W([(side < 0 ? 'mFL' : 'mFR') + pol, [82.5 + (o ? -3 : 3), 93, side * 58], [80, 90, side * 44], [80, 82, side * 36], [74, 76, side * 30], [40, 74, z], [12, 72, side * (14 + o)], term], .8, m, true);
    W([(side < 0 ? 'mRL' : 'mRR') + pol, [-24, 36 + o, side * 54], [-21, 40, side * 44], [-20, 42, side * 36], [-14, 48, side * 28], [-4, 58, z], [8, 66, side * (20 + o)], [4, 70, side * (6 + o)], term], .8, m, true);
  }
  if (!R.suc) return;
  /* ---- sucção · passo 6: 3 fios de cada motor até o ESC (passam por um furo Ø4 no cano, vedado com cola quente) ---- */
  const X = SUC.x, P = (r, a, y) => [X + r * Math.cos(a * DEG), y, r * Math.sin(a * DEG)];
  const tri = [[MAT.wK, -1], [MAT.wR, 0], [MAT.wY, 1]];   // trocar 2 deles inverte o giro
  tri.forEach(([m, o]) => W([P(6.9, -40 + 13 * o, 26.1), P(20.5, -40 + 3 * o, 27.4), P(25.8, -40 + 2.2 * o, 28), [7 + .5 * o, 26.6, -24.5], [15 + o, 24.6, -30], [20 + 3 * o, 24.8, -31.5], [20 + 3 * o, 27, -31.5]],
    .45, m, false, 6, 'Fios do motor de baixo → ESC da esquerda'));
  tri.forEach(([m, o]) => W([P(6.9, 40 + 13 * o, 52.2), P(20.5, 40 + 3 * o, 51.6), P(25.8, 40 + 2.2 * o, 51), [4.5 + .6 * o, 42, 24 + .3 * o], [8 + .6 * o, 29, 27], [15 + o, 24.6, 30], [20 + 3 * o, 24.8, 31.5], [20 + 3 * o, 27, 31.5]],
    .45, m, false, 6, 'Fios do motor de cima → ESC da direita'));
  /* ---- passo 14: bateria → XT30 no teto → desce na frente do power bank → um ramo para cada ESC; sinais no GPIO23/24 ---- */
  for (const [m, o] of [[MAT.wR, -1], [MAT.wK, 1]]) {
    const d = 1.25 * o;
    W([[-15, 104.4, d], [-12, 104.2, d * .8], [-9.5, 103.6, 2.5 + d * .4], [-7 + d, 103.6, 1.2]], .8, m, false, 14, 'Cabo da bateria → XT30');
    W([[-7 + d, 103.6, 16.8], [-6 + d, 102.6, 20.5], [-3 + d * .6, 98.6, 22], [.3, 92, 22 + d], [1.5, 75, 22 + d], [2, 67.6, 22 + d], [3.6, 62.5, 24.5 + d * .8], [12, 57.4, 29.2 + d * .6], [18.6 + d, 53.6, 31.5], [18.6 + d, 52, 31.5]],
      .8, m, false, 14, 'Bateria → ESC da direita');
    W([[2, 67.6, 22 + d], [2.2, 66.4 + d * .5, 6], [2.6, 66.4 + d * .5, -14], [8.6 + d * .4, 62.5, -24.2], [12, 57.4, -29.2 - d * .6], [18.6 + d, 53.6, -31.5], [18.6 + d, 52, -31.5]],
      .8, m, false, 14, 'Bateria → ESC da esquerda');
  }
  // sinal de cada ESC + 1 GND (o fio vermelho do ESC fica sem ligar)
  const sig = (s, k, m, j, sub) => {
    const a = R.piHdr(k), x0 = 22.8 + j * 1.1;
    const mid = s < 0 ? [[14, 57.6, -29.6 + j * .4], [9.6, 62.5, -26.6 + j * .6], [12, 69, -32 + j * .3], [30, 72.4, -33 + j * .25], [56, 72.8, -33 + j * .25], [a.x, 77.4, -32.6]]
      : [[14, 57.6, 29.6], [4.4, 62.5, 26.4], [3.2, 69, 28], [12, 83.4, 24], [40, 84.6, -16], [a.x, 80, -33], [a.x, 76.6, -32.4]];
    W([[x0, 52, 31.5 * s], [x0, 53.6, 31.2 * s], ...mid, a], .5, m, false, 14, sub);
  };
  sig(-1, 15, MAT.wW, 0, 'Sinal do ESC de baixo → GPIO23 (pino 16)');
  sig(-1, 13, MAT.wK, 1, 'GND dos ESCs → pino 14 do Pi');
  sig(1, 17, MAT.wW, 0, 'Sinal do ESC de cima → GPIO24 (pino 18)');
}
function rebuildWires(R, onlyDyn) {
  const v = V3(); R.stand.updateMatrixWorld(true);
  for (const w of R.wires) {
    if (onlyDyn && !w.dyn) continue;
    const pts = w.pts.map(p => typeof p === 'string' ? R.root.worldToLocal(R.anchors[p].getWorldPosition(v.clone())) : (p.isVector3 ? p.clone() : V3(...p)));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), Math.max(28, pts.length * 12), w.r, 7, false);
    if (w.mesh) { w.mesh.geometry.dispose(); w.mesh.geometry = geo; } else w.mesh = R.b.mesh(geo, w.mat, 'fiacao', w.sub || 'Cabo', w.g || R.wireGroup, false);
  }
}

export { buildRover, updateFasteners, steerPose, linkInit, rebuildWires, stepVis, updateSuccao, MAT };
