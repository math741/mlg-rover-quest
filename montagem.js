// Passo a passo da montagem: o mesmo modelo 3D do visualizador, peça por peça.
import * as THREE from 'three';
import { buildRover, updateFasteners, steerPose, rebuildWires, stepVis } from './modelo.js';
import { PECAS, TESTE_ID } from './pecas.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const PECA = Object.fromEntries(PECAS.map(p => [p.code, p]));
const POR_ID = Object.fromEntries(PECAS.filter(p => p.id != null).map(p => [p.id, p]));

export { PECA, POR_ID, TESTE_ID };

// troca os materiais PBR por Lambert (bem mais leve no Quest e no celular)
function materiaisLeves(root) {
  const cache = new Map();
  const conv = m => {
    if (!m || !m.isMeshStandardMaterial) return m;
    if (cache.has(m)) return cache.get(m);
    const n = new THREE.MeshLambertMaterial({
      color: m.color, map: m.map, emissive: m.emissive, emissiveIntensity: m.emissiveIntensity,
      transparent: m.transparent, opacity: m.opacity, side: m.side === THREE.BackSide ? THREE.BackSide : THREE.FrontSide,
      alphaTest: m.alphaTest, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset,
      polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits,
    });
    if (m.metalness > .5) n.color = m.color.clone().multiplyScalar(.8);
    n.userData = m.userData;
    cache.set(m, n);
    return n;
  };
  root.traverse(o => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    o.castShadow = o.receiveShadow = false;
  });
}

export class Montagem {
  constructor() {
    const R = this.R = buildRover();
    rebuildWires(R, false);
    materiaisLeves(R.stand);
    // escala: o modelo é em mm; a bancada fica em metros (tamanho real no AR)
    this.obj = new THREE.Group();
    this.obj.add(R.stand);
    this.obj.scale.setScalar(0.001);
    this.k = 1; this.p = 0; this.pausa = 0; this.repetir = true;
    this.total = STEPS.length;
    this._prepararPassos();
    this._poseFixa();
    this.encontrados = {};                 // passo → Set de códigos já escaneados
    this.destaques = new Map();            // código → tempo restante
    this._hl = [new THREE.MeshLambertMaterial({ color: 0xffd04a, emissive: 0xff9500, emissiveIntensity: .6 }),
      new THREE.MeshLambertMaterial({ color: 0xff9a1a, emissive: 0xff6a00, emissiveIntensity: .6 })];
    this.ir(1);
  }

  _prepararPassos() {
    const R = this.R;
    this.meshes = {};                      // código → malhas
    const outros = {};                     // passo → peças compradas (motor, Pi...)
    const passoDe = o => { let g = o; while (g) { if (g.userData && g.userData.step != null) return g.userData.step; g = g.parent; } return null; };
    R.root.traverse(o => {
      if (!o.isMesh) return;
      const st = passoDe(o);
      if (o.userData.code) (this.meshes[o.userData.code] = this.meshes[o.userData.code] || []).push(o);
      else if (st && o.userData.part && typeof PARTS !== 'undefined' && PARTS[o.userData.part] && PARTS[o.userData.part].cat !== 'mdf') {
        (outros[st] = outros[st] || new Set()).add(o.userData.part);
      }
    });
    this.passos = STEPS.map(([titulo, texto], i) => {
      const k = i + 1;
      const mdf = PECAS.filter(p => p.passo === k);
      const comprados = [...(outros[k] || [])].map(id => PARTS[id].nome);
      return { k, titulo, texto, mdf, comprados };
    });
  }

  _poseFixa() {
    const R = this.R;
    steerPose(R, 0);
    R.stand.updateMatrixWorld(true);
    const V = () => new THREE.Vector3();
    [[R.ties[0], R.hornTipA, R.tipL], [R.ties[1], R.hornTipB, R.tipR]].forEach(([t, hA, tipObj]) => {
      if (!t || !hA || !tipObj) return;
      const pH = R.tieGroup.worldToLocal(hA.getWorldPosition(V())), pB = R.tieGroup.worldToLocal(tipObj.getWorldPosition(V()));
      t.rod.position.copy(pH); t.rod.rotation.set(0, Math.atan2(-(pB.z - pH.z), pB.x - pH.x), 0);
    });
  }

  get passo() { return this.passos[this.k - 1]; }
  ir(k) {
    this.k = Math.max(1, Math.min(this.total, k));
    this.p = 0; this.pausa = 0;
    this._aplicar();
  }
  proximo() { this.ir(this.k + 1); }
  anterior() { this.ir(this.k - 1); }
  replay() { this.p = 0; this.pausa = 0; }

  // ---------- escaneamento ----------
  achou(code) {
    const s = this.encontrados[this.k] = this.encontrados[this.k] || new Set();
    const novo = !s.has(code) && this.passo.mdf.some(p => p.code === code);
    if (novo) s.add(code);
    this.destacar(code);
    return novo;
  }
  // avalia os adesivos vistos pela câmera; devolve a mensagem para mostrar (ou null)
  avaliar(ids) {
    const r = { desta: [], outras: [], teste: false };
    for (const id of ids) {
      if (id === TESTE_ID) { r.teste = true; continue; }
      const p = POR_ID[id]; if (!p) continue;
      if (this.passo.mdf.some(q => q.code === p.code)) { this.achou(p.code); if (!r.desta.includes(p.code)) r.desta.push(p.code); }
      else if (!r.outras.some(q => q.code === p.code)) { r.outras.push(p); if (p.passo < this.k) this.destacar(p.code); }
    }
    r.completo = this.completo();
    if (r.desta.length) {
      r.tipo = 'ok';
      const lista = r.desta.join(', ');
      r.texto = r.completo ? `Tudo certo: todas as peças do passo ${this.k} estão com você (${lista}). Monte e vá para o próximo.`
        : r.desta.length === 1 ? `${lista} · ${PECA[lista].nome}: é deste passo.` : `${lista}: são deste passo.`;
    } else if (r.outras.length) {
      r.tipo = 'outro';
      const p = r.outras[0];
      r.irPara = p.passo;
      r.texto = r.outras.length === 1 ? `${p.code} · ${p.nome}: é do passo ${p.passo}. Agora estamos no passo ${this.k}.`
        : `${r.outras.map(q => q.code).join(', ')}: são de outros passos (agora estamos no passo ${this.k}).`;
    } else if (r.teste) { r.tipo = 'teste'; r.texto = 'Câmera funcionando: adesivo de TESTE reconhecido.'; }
    else return null;
    return r;
  }
  feitoNoPasso(code) { return !!(this.encontrados[this.k] && this.encontrados[this.k].has(code)); }
  completo() { const m = this.passo.mdf.filter(p => p.id != null); return m.length > 0 && m.every(p => this.feitoNoPasso(p.code)); }
  destacar(code, s = 2.5) { if (this.meshes[code]) this.destaques.set(code, s); }

  // ---------- animação ----------
  atualizar(dt) {
    if (this.p < 1) this.p = Math.min(1, this.p + dt / 1.8);
    else if (this.repetir) { this.pausa += dt; if (this.pausa > 1.6) { this.p = 0; this.pausa = 0; } }
    this._aplicar();
    // destaque piscando nas peças escaneadas
    const t = performance.now() / 1000;
    for (const [code, rest] of this.destaques) {
      const ms = this.meshes[code];
      const r = rest - dt;
      for (const m of ms) {
        if (!m.userData._mat) m.userData._mat = m.material;
        m.material = r > 0 ? (Array.isArray(m.userData._mat) ? this._hl : this._hl[0]) : m.userData._mat;
        if (r <= 0) delete m.userData._mat;
      }
      if (r <= 0) this.destaques.delete(code); else this.destaques.set(code, r);
    }
    const pulso = .35 + .45 * (0.5 + 0.5 * Math.sin(t * 9));
    this._hl[0].emissiveIntensity = this._hl[1].emissiveIntensity = pulso;
  }

  _aplicar() {
    const R = this.R, k = this.k, p = this.p;
    const fac = st => st < k ? 0 : st === k ? 1 - ease(clamp01(p / .6)) : -1;
    for (const g of R.groups) {
      const f = fac(g.userData.step);
      g.visible = f >= 0;
      g.position.copy(g.userData.base).addScaledVector(g.userData.exA || g.userData.ex, Math.max(0, f) * 1.15);
    }
    stepVis(R, k);                         // barras de direção e fios aparecem no passo deles
    updateFasteners(R, f => f.step < k ? 0 : f.step === k ? 1 - ease(clamp01((p - .45) / .55)) : -1);
  }
}

export const nomePeca = code => (PECA[code] ? PECA[code].nome : code);
