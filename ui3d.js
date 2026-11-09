// Painéis 2D desenhados em canvas e mostrados como placas no 3D (Quest), com botões.
import * as THREE from 'three';

export const COR = {
  fundo: 'rgba(14,15,18,0.92)', borda: 'rgba(255,255,255,0.10)', texto: '#f1f1f1', fraco: '#a7a7ad',
  amarelo: '#f6bd16', verde: '#38d27a', laranja: '#ff9b3d', azul: '#5aa9ff', vermelho: '#ff5252', botao: '#26272c', botaoHover: '#3a3b42',
};
export const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export function retArred(x, X, y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, y); x.arcTo(X + w, y, X + w, y + h, r); x.arcTo(X + w, y + h, X, y + h, r);
  x.arcTo(X, y + h, X, y, r); x.arcTo(X, y, X + w, y, r); x.closePath();
}

// quebra o texto em linhas que cabem em `larg`; devolve a altura usada
export function texto(x, s, X, Y, larg, alt, maxLinhas = 99) {
  const palavras = String(s).split(/\s+/); let linha = '', n = 0;
  for (let i = 0; i < palavras.length; i++) {
    const teste = linha ? linha + ' ' + palavras[i] : palavras[i];
    if (x.measureText(teste).width > larg && linha) {
      if (n === maxLinhas - 1) { x.fillText(linha + '…', X, Y + n * alt); return (n + 1) * alt; }
      x.fillText(linha, X, Y + n * alt); n++; linha = palavras[i];
    } else linha = teste;
  }
  if (linha) { x.fillText(linha, X, Y + n * alt); n++; }
  return n * alt;
}

export function cortar(x, s, larg) {
  if (x.measureText(s).width <= larg) return s;
  while (s.length > 1 && x.measureText(s + '…').width > larg) s = s.slice(0, -1);
  return s + '…';
}

export class Painel {
  constructor(wPx, hPx, wM) {
    this.c = document.createElement('canvas'); this.c.width = wPx; this.c.height = hPx;
    this.x = this.c.getContext('2d');
    this.w = wPx; this.h = hPx;
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4; this.tex.generateMipmaps = true;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, depthWrite: true });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, wM * hPx / wPx), mat);
    this.mesh.userData.painel = this;
    this.mesh.renderOrder = 10;
    this.botoes = [];
    this.hover = null;
    this.sujo = true;
  }
  limparBotoes() { this.botoes = []; }
  botao(id, X, Y, w, h, rotulo, o = {}) { this.botoes.push({ id, X, Y, w, h, rotulo, ...o }); }
  hit(uv) {
    const px = uv.x * this.w, py = (1 - uv.y) * this.h;
    return this.botoes.find(b => !b.off && px >= b.X && px <= b.X + b.w && py >= b.Y && py <= b.Y + b.h) || null;
  }
  fundo() {
    const x = this.x;
    x.clearRect(0, 0, this.w, this.h);
    retArred(x, 0, 0, this.w, this.h, 28); x.fillStyle = COR.fundo; x.fill();
    x.lineWidth = 2; x.strokeStyle = COR.borda; x.stroke();
  }
  desenharBotoes() {
    const x = this.x;
    for (const b of this.botoes) {
      const h = this.hover && this.hover.id === b.id;
      retArred(x, b.X, b.Y, b.w, b.h, 16);
      x.fillStyle = b.off ? 'rgba(255,255,255,0.04)' : b.cor ? b.cor : h ? COR.botaoHover : COR.botao; x.fill();
      if (h && !b.off) { x.lineWidth = 3; x.strokeStyle = COR.amarelo; x.stroke(); }
      x.fillStyle = b.off ? '#55565c' : b.corTexto || COR.texto;
      x.font = `600 ${b.fs || 26}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(b.rotulo, b.X + b.w / 2, b.Y + b.h / 2 + 1);
    }
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  }
  publicar() { this.tex.needsUpdate = true; this.sujo = false; }
}

// Raios dos controles e das mãos: apontar nos painéis e "clicar" (gatilho ou pinça).
export class Ponteiros {
  constructor(renderer, cena) {
    this.renderer = renderer;
    this.alvos = [];
    this.ray = new THREE.Raycaster();
    this.onClique = null;       // (botao, painel, ctrl)
    this.onSelecionar = null;   // clique fora dos painéis
    this.onInicio = null; this.onFim = null;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    this.ctrls = [0, 1].map(i => {
      const c = renderer.xr.getController(i);
      const linha = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf6bd16, transparent: true, opacity: .8 }));
      linha.scale.z = 1.2; linha.visible = false; c.add(linha);
      const ponto = new THREE.Mesh(new THREE.SphereGeometry(.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ponto.visible = false; cena.add(ponto);
      // o controle pode já estar conectado (quando se entra no modo imersivo pela 2ª vez)
      const fonte = renderer.xr.getSession() && renderer.xr.getSession().inputSources[i];
      c.userData = { linha, ponto, src: fonte || null, alvo: null, painel: null, apertado: false };
      const h = {
        connected: e => { c.userData.src = e.data; },
        disconnected: () => { c.userData.src = null; linha.visible = false; ponto.visible = false; },
        selectstart: () => { c.userData.apertado = true; if (!c.userData.alvo && this.onInicio) this.onInicio(c); },
        selectend: () => { c.userData.apertado = false; if (this.onFim) this.onFim(c); },
        select: () => {
          const d = c.userData;
          if (d.alvo && d.painel) { if (this.onClique) this.onClique(d.alvo, d.painel, c); }
          else if (!d.painel && this.onSelecionar) this.onSelecionar(c);
        },
      };
      for (const [k, f] of Object.entries(h)) c.addEventListener(k, f);
      c.userData.h = h;
      cena.add(c);
      return c;
    });
  }
  destruir() {
    for (const c of this.ctrls) {
      const d = c.userData;
      if (d.h) for (const [k, f] of Object.entries(d.h)) c.removeEventListener(k, f);
      if (d.linha) c.remove(d.linha);
      if (d.ponto) d.ponto.removeFromParent();
      c.removeFromParent();
      c.userData = {};
    }
  }
  mudarCena(cena) { for (const c of this.ctrls) { cena.add(c); cena.add(c.userData.ponto); } }
  atualizar() {
    const m = new THREE.Matrix4();
    for (const c of this.ctrls) {
      const d = c.userData;
      if (!d.src) { d.alvo = d.painel = null; continue; }
      m.identity().extractRotation(c.matrixWorld);
      this.ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
      this.ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
      const hits = this.ray.intersectObjects(this.alvos.filter(o => o.visible && o.parent), false);
      const h = hits[0];
      const idDe = b => (b ? b.id : null);
      const antes = d.painel;
      d.alvo = null; d.painel = null;
      if (h && h.uv) {
        const p = h.object.userData.painel;
        d.painel = p; d.alvo = p.hit(h.uv);
        // compara pelo id: o painel recria os botões quando redesenha
        if (idDe(p.hover) !== idDe(d.alvo)) { p.hover = d.alvo; p.sujo = true; }
        d.linha.scale.z = h.distance; d.ponto.visible = true; d.ponto.position.copy(h.point);
      } else {
        d.linha.scale.z = 1.2; d.ponto.visible = false;
        if (antes && antes.hover && !this.ctrls.some(k => k !== c && k.userData.painel === antes)) { antes.hover = null; antes.sujo = true; }
      }
      d.linha.visible = true;
    }
  }
  vibrar(c, forca = .5, ms = 50) {
    const src = c ? c.userData.src : null;
    const lista = src ? [src] : this.ctrls.map(k => k.userData.src).filter(Boolean);
    for (const s of lista) { const a = s.gamepad && s.gamepad.hapticActuators && s.gamepad.hapticActuators[0]; if (a && a.pulse) a.pulse(forca, ms).catch(() => {}); }
  }
}
