// Modos imersivos do Quest 3S: montagem em AR (holograma 1:1 + scanner) e pilotagem (telão + controles).
import * as THREE from 'three';
import { Painel, Ponteiros, COR, FONTE, texto, cortar, retArred } from './ui3d.js';
import { PECA, POR_ID, TESTE_ID } from './montagem.js';
import { kmh } from './link.js';

const v3 = () => new THREE.Vector3();

export async function suporteXR() {
  const r = { ar: false, vr: false };
  if (!navigator.xr) return r;
  try { r.ar = await navigator.xr.isSessionSupported('immersive-ar'); } catch { /* sem AR */ }
  try { r.vr = await navigator.xr.isSessionSupported('immersive-vr'); } catch { /* sem VR */ }
  return r;
}

async function abrirSessao(renderer, preferirAR, extras = []) {
  const sup = await suporteXR();
  const tipo = preferirAR && sup.ar ? 'immersive-ar' : sup.vr ? 'immersive-vr' : sup.ar ? 'immersive-ar' : null;
  if (!tipo) throw new Error('Este navegador não tem WebXR. Abra no navegador do Quest.');
  const session = await navigator.xr.requestSession(tipo, {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking', ...extras],
  });
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFoveation(1);
  await renderer.xr.setSession(session);
  return { session, ar: tipo === 'immersive-ar' };
}

/* =============================== MONTAGEM EM AR =============================== */
export class MontagemAR {
  constructor({ renderer, montagem, scanner, aoSair }) {
    this.renderer = renderer; this.mt = montagem; this.sc = scanner; this.aoSair = aoSair;
    this.cena = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, 1, .01, 50);
    this.cena.add(new THREE.HemisphereLight(0xffffff, 0x5b5146, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(.4, 1, .6); this.cena.add(sol);
    // bancada: o rover em tamanho real + um "tapete" para ele não parecer flutuar
    this.bancada = new THREE.Group(); this.bancada.visible = false; this.cena.add(this.bancada);
    const tapete = new THREE.Mesh(new THREE.CircleGeometry(.19, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false }));
    tapete.position.y = .0005; this.bancada.add(tapete);
    this.giro = new THREE.Group(); this.bancada.add(this.giro);
    // mira (onde a bancada vai ficar)
    this.mira = new THREE.Mesh(new THREE.RingGeometry(.05, .065, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf6bd16 }));
    this.mira.matrixAutoUpdate = false; this.mira.visible = false; this.cena.add(this.mira);
    // painel do passo a passo
    this.painel = new Painel(1100, 760, .52);
    this.cena.add(this.painel.mesh); this.painel.mesh.visible = false;
    this.ponteiros = new Ponteiros(renderer, this.cena);
    this.ponteiros.alvos = [this.painel.mesh];
    this.ponteiros.onClique = b => this._clique(b);
    this.ponteiros.onSelecionar = () => this._colocar();
    this.colocando = true;
    this.msg = { t: 'Olhe para a mesa e aperte o gatilho (ou faça a pinça) para colocar o rover.', cor: COR.amarelo, ate: 0 };
    this._tPainel = 0; this._ultimaLeitura = 0;
    this.escala = 1;
    this._ouvir();
  }

  async entrar() {
    const { session, ar } = await abrirSessao(this.renderer, true, ['hit-test', 'anchors', 'plane-detection']);
    this.session = session; this.ar = ar;
    this.cena.background = ar ? null : new THREE.Color(0x202024);
    if (!ar) this.cena.add(this._chao());
    this.mt.obj.removeFromParent(); this.giro.add(this.mt.obj);
    session.addEventListener('end', () => this._fim());
    try {
      const vs = await session.requestReferenceSpace('viewer');
      this.hitSrc = await session.requestHitTestSource({ space: vs });
    } catch { this.hitSrc = null; }
    this._desenhar(true);
  }

  _chao() {
    const g = new THREE.GridHelper(6, 30, 0x555555, 0x333333); g.position.y = 0; return g;
  }

  _ouvir() {
    this._onPeca = e => this._detectou(e.detail);
    this.sc.addEventListener('peca', this._onPeca);
  }

  _fim() {
    this.sc.removeEventListener('peca', this._onPeca);
    this.ponteiros.destruir();
    if (this.hitSrc) { try { this.hitSrc.cancel(); } catch { /* já encerrada */ } }
    this.mt.obj.removeFromParent();
    this.aoSair && this.aoSair();
  }

  sair() { if (this.session) this.session.end(); }

  _colocar(posicao) {
    if (!this.colocando) return;
    const cam = this.renderer.xr.getCamera();
    const pc = cam.getWorldPosition(v3());
    let p;
    if (posicao) p = posicao;
    else if (this.mira.visible) p = v3().setFromMatrixPosition(this.mira.matrix);
    else {                                                    // sem hit-test: 55 cm à frente, na altura de uma mesa
      const dir = cam.getWorldDirection(v3()); dir.y = 0; dir.normalize();
      p = pc.clone().addScaledVector(dir, .55); p.y = Math.max(.45, pc.y - .5);
    }
    this.bancada.position.copy(p);
    const yaw = Math.atan2(pc.x - p.x, pc.z - p.z);
    this.bancada.rotation.set(0, yaw, 0);
    this.giro.rotation.y = -.55;                              // de 3/4: frente do rover virada para você
    this.bancada.visible = true; this.mira.visible = false;
    // painel à esquerda da bancada, virado para você
    const dir = v3().subVectors(pc, p).setY(0).normalize();
    const lado = v3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    this.painel.mesh.position.copy(p).addScaledVector(lado, -.40).addScaledVector(dir, .06);
    this.painel.mesh.position.y = p.y + .24;
    this.painel.mesh.lookAt(pc.x, this.painel.mesh.position.y - .05, pc.z);
    this.painel.mesh.visible = true;
    this.colocando = false;
    this.msg = { t: this.sc.ligado ? 'Mostre as peças para a câmera do Quest: eu digo se é a certa.' : 'Câmera desligada: ligue em "Câmera" para escanear as peças.', cor: COR.fraco, ate: 0 };
    this.ponteiros.vibrar(null, .4, 40);
    this._desenhar(true);
  }

  _clique(b) {
    this.ponteiros.vibrar(null, .3, 25);
    const mt = this.mt;
    switch (b.id) {
      case 'ant': mt.anterior(); this._mudouPasso(); break;
      case 'prox': mt.proximo(); this._mudouPasso(); break;
      case 'rep': mt.replay(); break;
      case 'mover': this.colocando = true; this.bancada.visible = false; this.msg = { t: 'Aponte para a mesa e aperte o gatilho para colocar de novo.', cor: COR.amarelo, ate: 0 }; break;
      case 'zoom': this.escala = this.escala === 1 ? 2 : 1; this.giro.scale.setScalar(this.escala); break;
      case 'girar': this.giro.rotation.y += Math.PI / 4; break;
      case 'cam': this._camera(); break;
      case 'irpasso': if (this._irPara) { mt.ir(this._irPara); this._mudouPasso(); } break;
      case 'sair': this.sair(); return;
    }
    this._desenhar(true);
  }

  async _camera() {
    try {
      if (!this.sc.ligado) await this.sc.ligar();
      else if (this.sc.cameras.length > 1) await this.sc.trocarCamera();
      else this.sc.desligar();
      this.msg = { t: this.sc.ligado ? `Câmera ligada (${this.sc.nomeCamera}). Mostre uma peça com adesivo.` : 'Câmera desligada.', cor: COR.azul, ate: 0 };
    } catch (e) {
      this.msg = { t: this.sc.erro || 'Não consegui ligar a câmera. Saia do AR, ligue a câmera na tela inicial e entre de novo.', cor: COR.vermelho, ate: 0 };
    }
    this._desenhar(true);
  }

  _detectou(id) { this._avaliar([id]); }
  _avaliar(ids) {
    const r = this.mt.avaliar(ids);
    if (!r) return;
    this._irPara = r.tipo === 'outro' ? r.irPara : null;
    this.msg = { t: r.texto, cor: r.tipo === 'ok' ? COR.verde : r.tipo === 'outro' ? COR.laranja : COR.azul, ate: 0 };
    if (r.tipo === 'ok') this.ponteiros.vibrar(null, r.completo ? 1 : .7, r.completo ? 160 : 80);
    this._desenhar(true);
  }
  _mudouPasso() {
    this._irPara = null;
    this.msg = { t: this.sc.ligado ? 'Mostre as peças deste passo para a câmera do Quest.' : 'Câmera desligada: ligue em "Câmera" para escanear.', cor: COR.fraco, ate: 0 };
    if (this.sc.estaveis.size) this._avaliar([...this.sc.estaveis]);
  }

  // ---------- painel ----------
  _desenhar(forcar) {
    const P = this.painel, x = P.x, mt = this.mt, ps = mt.passo;
    if (!forcar && !P.sujo) return;
    P.fundo();
    // cabeçalho
    x.fillStyle = COR.amarelo; x.font = `700 24px ${FONTE}`;
    x.fillText(`PASSO ${mt.k} DE ${mt.total}`, 32, 50);
    const prog = mt.k / mt.total;
    retArred(x, 270, 34, 300, 12, 6); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
    retArred(x, 270, 34, 300 * prog, 12, 6); x.fillStyle = COR.amarelo; x.fill();
    x.fillStyle = COR.texto; x.font = `700 40px ${FONTE}`; x.fillText(cortar(x, ps.titulo, 640), 32, 102);
    // texto do passo
    x.font = `400 23px ${FONTE}`; x.fillStyle = '#d9d9de';
    let y = 142 + texto(x, ps.texto, 32, 142, 640, 30, 6) + 10;
    // peças de MDF
    if (ps.mdf.length) {
      x.fillStyle = COR.fraco; x.font = `700 20px ${FONTE}`; x.fillText('PEÇAS DE MDF', 32, y + 14); y += 30;
      for (const p of ps.mdf) {
        if (y > 640) { x.fillStyle = COR.fraco; x.fillText('…', 32, y + 20); break; }
        const ok = mt.feitoNoPasso(p.code);
        x.beginPath(); x.arc(46, y + 13, 12, 0, Math.PI * 2);
        x.fillStyle = ok ? COR.verde : p.id == null ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.14)'; x.fill();
        if (ok) { x.strokeStyle = '#08130c'; x.lineWidth = 4; x.beginPath(); x.moveTo(40, y + 13); x.lineTo(45, y + 19); x.lineTo(53, y + 7); x.stroke(); }
        x.fillStyle = COR.texto; x.font = `700 23px ${FONTE}`; x.fillText(`${p.code}`, 68, y + 21);
        x.fillStyle = COR.fraco; x.font = `400 21px ${FONTE}`;
        const nome = `${p.qtd}× ${p.nome}` + (p.id == null ? ` · sem adesivo: ${p.dica || 'pelo formato'}` : '');
        x.fillText(cortar(x, nome, 560), 140, y + 21);
        y += 34;
      }
    }
    if (ps.comprados.length && y < 640) {
      x.fillStyle = COR.fraco; x.font = `700 20px ${FONTE}`; x.fillText('TAMBÉM', 32, y + 18);
      x.font = `400 21px ${FONTE}`; x.fillStyle = '#cfcfd4';
      y += 26; texto(x, ps.comprados.join(' · '), 32, y + 18, 640, 28, 2);
    }
    // janela do scanner
    const SX = 700, SY = 30, SW = 370, SH = 278;
    retArred(x, SX, SY, SW, SH, 18); x.fillStyle = '#000'; x.fill();
    const sc = this.sc;
    if (sc.ligado && sc.video.readyState >= 2) {
      x.save(); retArred(x, SX, SY, SW, SH, 18); x.clip();
      const vw = sc.video.videoWidth, vh = sc.video.videoHeight, k = Math.max(SW / vw, SH / vh);
      const dw = vw * k, dh = vh * k, dx = SX + (SW - dw) / 2, dy = SY + (SH - dh) / 2;
      x.drawImage(sc.video, dx, dy, dw, dh);
      for (const m of sc.ultimo.marcadores || []) {
        const pc = POR_ID[m.id], cor = m.id === TESTE_ID ? COR.azul : !pc ? '#888' : mt.passo.mdf.some(q => q.code === pc.code) ? COR.verde : COR.laranja;
        x.beginPath(); m.c.forEach(([u, v], i) => { const X = dx + u * dw, Y = dy + v * dh; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath();
        x.lineWidth = 5; x.strokeStyle = cor; x.stroke();
        const [u0, v0] = m.c[0]; x.fillStyle = cor; x.font = `800 26px ${FONTE}`;
        x.fillText(m.id === TESTE_ID ? 'TESTE' : pc ? pc.code : '?', dx + u0 * dw, dy + v0 * dh - 8);
      }
      x.restore();
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(SX + 10, SY + SH - 34, 210, 26);
      x.fillStyle = '#ddd'; x.font = `500 17px ${FONTE}`; x.fillText(`scanner · ${Math.round(sc.ultimo.ms || 0)} ms`, SX + 18, SY + SH - 15);
    } else {
      x.fillStyle = COR.fraco; x.font = `500 22px ${FONTE}`; x.textAlign = 'center';
      x.fillText(sc.ligado ? 'abrindo a câmera…' : 'câmera desligada', SX + SW / 2, SY + SH / 2 - 6);
      x.font = `400 18px ${FONTE}`; x.fillText(sc.ligado ? '' : 'toque em "Câmera" para escanear', SX + SW / 2, SY + SH / 2 + 22);
      x.textAlign = 'left';
    }
    // mensagem
    retArred(x, SX, SY + SH + 14, SW, 220, 16); x.fillStyle = 'rgba(255,255,255,.05)'; x.fill();
    x.fillStyle = this.msg.cor; x.font = `600 22px ${FONTE}`;
    texto(x, this.msg.t, SX + 18, SY + SH + 48, SW - 36, 29, 7);
    // botões
    P.limparBotoes();
    const by = 680, bh = 58;
    P.botao('ant', 32, by, 130, bh, '◀ Voltar', { off: mt.k <= 1 });
    P.botao('prox', 172, by, 150, bh, 'Próximo ▶', { off: mt.k >= mt.total, cor: mt.completo() ? '#1f6b3f' : null });
    P.botao('rep', 332, by, 120, bh, 'Animar', {});
    P.botao('girar', 462, by, 100, bh, 'Girar', {});
    P.botao('zoom', 572, by, 100, bh, this.escala === 1 ? 'Zoom' : '1:1', {});
    P.botao('mover', 682, by, 110, bh, 'Mover', {});
    P.botao('cam', 802, by, 130, bh, this.sc.ligado ? (this.sc.cameras.length > 1 ? 'Trocar câm.' : 'Câmera ✓') : 'Câmera', { fs: 24 });
    P.botao('sair', 942, by, 126, bh, 'Sair', { cor: '#4a1f1f' });
    if (this._irPara) P.botao('irpasso', SX + SW - 190, SY + SH + 168, 172, 50, `Ir ao passo ${this._irPara}`, { fs: 22, cor: '#5a3a12' });
    P.desenharBotoes();
    P.publicar();
  }

  // ---------- quadro a quadro ----------
  frame(t, frame, dt) {
    const r = this.renderer;
    if (frame && this.colocando && this.hitSrc) {
      const res = frame.getHitTestResults(this.hitSrc);
      if (res.length) {
        const pose = res[0].getPose(r.xr.getReferenceSpace());
        if (pose) { this.mira.matrix.fromArray(pose.transform.matrix); this.mira.visible = true; }
      } else this.mira.visible = false;
    } else if (this.colocando && !this.hitSrc) {
      // sem hit-test: a mira fica 55 cm à frente
      const cam = r.xr.getCamera(), pc = cam.getWorldPosition(v3()), dir = cam.getWorldDirection(v3()); dir.y = 0; dir.normalize();
      const p = pc.addScaledVector(dir, .55); p.y = Math.max(.45, p.y - .5);
      this.mira.matrix.makeTranslation(p.x, p.y, p.z); this.mira.visible = true;
    }
    this.mt.atualizar(dt);
    this.ponteiros.atualizar();
    // painel: redesenha quando muda algo e ~6 vezes por segundo se a câmera estiver ligada
    if (this.painel.mesh.visible) {
      if (this.painel.sujo) this._desenhar(true);
      else if (this.sc.ligado && t - this._tPainel > 160) { this._tPainel = t; this._desenhar(true); }
    }
    r.render(this.cena, this.cam);
  }
}

/* =============================== PILOTAGEM (Quest) =============================== */
export class PilotagemXR {
  constructor({ renderer, link, aoSair }) {
    this.renderer = renderer; this.link = link; this.aoSair = aoSair;
    this.cena = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, 1, .01, 50);
    // telão com o vídeo da webcam do rover (a textura recebe os quadros como ImageBitmap)
    this.tex = new THREE.Texture(); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.flipY = false;
    const geo = new THREE.PlaneGeometry(1.6, 1.2); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));          // ImageBitmap não aceita flipY
    this.tela = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false }));
    this.tela.position.set(0, 1.42, -1.9); this.cena.add(this.tela);
    const moldura = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 1.26), new THREE.MeshBasicMaterial({ color: 0x0b0b0d }));
    moldura.position.set(0, 1.42, -1.902); this.cena.add(moldura);
    this.hud = new Painel(1200, 412, 1.05);
    this.hud.mesh.position.set(0, .66, -1.55); this.hud.mesh.rotation.x = -.42; this.cena.add(this.hud.mesh);
    this.ponteiros = new Ponteiros(renderer, this.cena);
    this.ponteiros.alvos = [this.hud.mesh];
    this.ponteiros.onClique = b => this._clique(b);
    this.ponteiros.onInicio = c => this._maoInicio(c);
    this.ponteiros.onFim = c => this._maoFim(c);
    this.turbo = false; this.mao = null; this.cmd = { acel: 0, dir: 0 };
    this.suc = 0; this._tSuc = 0;                                            // turbina de sucção (0 – 1, de 20 em 20%)
    this._tHud = 0; this._n = -1;
  }

  async entrar() {
    const { session, ar } = await abrirSessao(this.renderer, true, []);
    this.session = session;
    this.cena.background = ar ? null : new THREE.Color(0x101014);
    session.addEventListener('end', () => { this.ponteiros.destruir(); this.link.soltar(); this.link.video(false); this.aoSair && this.aoSair(); });
    this.link.video(true);
    this._hud();
  }
  sair() { if (this.session) this.session.end(); }

  _clique(b) {
    this.ponteiros.vibrar(null, .3, 25);
    if (b.id === 'sair') return this.sair();
    if (b.id === 'turbo') this.turbo = !this.turbo;
    if (b.id === 'parar') { this.link.parar(); this.suc = 0; }
    if (b.id === 'sp' || b.id === 'sm' || b.id === 's0') {
      this.suc = b.id === 's0' ? 0 : Math.round(Math.max(0, Math.min(1, this.suc + (b.id === 'sp' ? .2 : -.2))) * 10) / 10;
      this._tSuc = performance.now(); this.link.succao(this.suc);
    }
    if (b.id === 'tm') this.link.trim(-5);
    if (b.id === 'tp') this.link.trim(5);
    this._hud();
  }

  // pilotar com a mão: faça a pinça no ar e empurre (frente/trás) e arraste (esquerda/direita)
  _maoInicio(c) { if (c.userData.src && c.userData.src.hand) this.mao = { c, p0: c.getWorldPosition(v3()) }; }
  _maoFim(c) { if (this.mao && this.mao.c === c) this.mao = null; }

  _entrada() {
    let acel = 0, dir = 0, ativo = false;
    const zm = v => Math.abs(v) < .12 ? 0 : (v - Math.sign(v) * .12) / .88;
    for (const c of this.ponteiros.ctrls) {
      const s = c.userData.src; if (!s || !s.gamepad) continue;
      const g = s.gamepad, ax = g.axes || [], bt = g.buttons || [];
      const sx = zm(ax[2] || 0), sy = zm(ax[3] || 0), gat = bt[0] ? bt[0].value : 0;
      if (s.handedness === 'left') { acel += -sy; acel -= gat; if (bt[4] && bt[4].pressed) this.link.parar(); }
      else { dir += sx; acel += gat; if (bt[4] && bt[4].pressed && !this._a) this.turbo = !this.turbo; this._a = bt[4] && bt[4].pressed; }
      if (sx || sy || gat > .05) ativo = true;
    }
    if (this.mao) {
      const cam = this.renderer.xr.getCamera(), fwd = cam.getWorldDirection(v3()).setY(0).normalize();
      const dirLado = v3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      const d = this.mao.c.getWorldPosition(v3()).sub(this.mao.p0);
      acel = Math.max(-1, Math.min(1, d.dot(fwd) / .12));
      dir = Math.max(-1, Math.min(1, d.dot(dirLado) / .10));
      ativo = true;
    }
    this.cmd = { acel: Math.max(-1, Math.min(1, acel)), dir: Math.max(-1, Math.min(1, dir)) };
    if (ativo) this.link.pilotar(this.cmd.acel, this.cmd.dir, this.turbo);
    else this.link.pilotar(0, 0, this.turbo);
  }

  _hud() {
    const P = this.hud, x = P.x, e = this.link.estado, pi = e && e.pi, pl = e && e.piloto, cam = e && e.camera;
    P.fundo();
    const on = this.link.online;
    x.fillStyle = on ? COR.verde : COR.vermelho; x.beginPath(); x.arc(40, 44, 10, 0, 7); x.fill();
    x.fillStyle = COR.texto; x.font = `700 28px ${FONTE}`; x.fillText(on ? 'Rover conectado' : 'Sem conexão com o rover', 62, 54);
    x.font = `400 22px ${FONTE}`; x.fillStyle = COR.fraco;
    const info = [];
    if (pi && pi.temp != null) info.push(`${String(pi.temp).replace('.', ',')} °C`);
    if (pi && pi.wifi) info.push(`Wi-Fi ${pi.wifi.dbm} dBm`);
    if (this.link.rtt != null) info.push(`ping ${Math.round(this.link.rtt)} ms`);
    if (cam) info.push(cam.ok ? `câmera ${String(cam.fps).replace('.', ',')} fps` : `câmera: ${cam.erro || 'desligada'}`);
    x.fillText(info.join('  ·  '), 420, 52);
    // velocidade e direção
    const acel = pl ? pl.acel : 0, dir = pl ? pl.dir : 0;
    x.fillStyle = COR.fraco; x.font = `700 20px ${FONTE}`; x.fillText('VELOCIDADE', 40, 110); x.fillText('DIREÇÃO', 460, 110);
    x.fillStyle = COR.texto; x.font = `800 54px ${FONTE}`; x.fillText(`${kmh(acel).toFixed(1).replace('.', ',')}`, 40, 170);
    x.font = `500 24px ${FONTE}`; x.fillText(`km/h ${acel < -.01 ? '(ré)' : ''}`, 150, 170);
    retArred(x, 460, 132, 300, 26, 13); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill();
    x.fillStyle = COR.amarelo; x.beginPath(); x.arc(610 + dir * 140, 145, 15, 0, 7); x.fill();
    x.fillStyle = COR.fraco; x.font = `400 19px ${FONTE}`;
    x.fillText(pl && pl.parado ? `parado: ${pl.parado}` : this.turbo ? 'TURBO' : 'normal', 800, 152);
    x.fillText('Controle esq.: frente/ré · dir.: direção · gatilhos aceleram · A turbo · X parar · sem controle: pinça e empurre', 40, 214);
    P.limparBotoes();
    P.botao('sair', 40, 248, 160, 62, 'Sair', { cor: '#4a1f1f' });
    P.botao('parar', 220, 248, 220, 62, 'PARAR', { cor: '#8a1d1a', fs: 30 });
    P.botao('turbo', 460, 248, 200, 62, this.turbo ? 'Turbo ligado' : 'Turbo', { cor: this.turbo ? '#7a5a00' : null });
    P.botao('tm', 680, 248, 230, 62, '◀ Centro do servo', { fs: 22 });
    P.botao('tp', 930, 248, 230, 62, 'Centro do servo ▶', { fs: 22 });
    // turbina de sucção
    const sc = pl && pl.succao;
    if (sc && sc.alvo === 0 && this.suc > 0 && performance.now() - this._tSuc > 1500) this.suc = 0;   // o rover desligou (PARAR ou sinal)
    const nv = sc ? sc.nivel : 0;
    x.fillStyle = COR.fraco; x.font = `700 20px ${FONTE}`; x.fillText('SUCÇÃO', 40, 362);
    retArred(x, 470, 334, 300, 46, 14); x.fillStyle = 'rgba(255,255,255,.08)'; x.fill();
    if (nv > 0) { retArred(x, 470, 334, Math.max(28, 300 * nv), 46, 14); x.fillStyle = COR.amarelo; x.fill(); }
    x.fillStyle = nv > .45 ? '#1b1b1b' : COR.texto; x.font = `700 24px ${FONTE}`; x.textAlign = 'center';
    x.fillText(nv > .005 ? `${Math.round(nv * 100)}%` : 'desligada', 620, 366); x.textAlign = 'left';
    x.fillStyle = COR.fraco; x.font = `400 20px ${FONTE}`;
    x.fillText(nv > .005 && typeof sucKg === 'function' ? `≈ ${sucKg(nv).toFixed(1).replace('.', ',')} kg pra baixo` : 'turbina parada', 930, 366);
    P.botao('s0', 150, 328, 140, 58, 'Desligar', { fs: 22, off: !sc || !sc.escs });
    P.botao('sm', 304, 328, 150, 58, 'Sucção −', { fs: 22, off: !sc || !sc.escs });
    P.botao('sp', 786, 328, 130, 58, '+', { fs: 30, off: !sc || !sc.escs });
    P.desenharBotoes();
    P.publicar();
  }

  frame(t, frame, dt) {
    const r = this.renderer;
    this.ponteiros.atualizar();
    this._entrada();
    const q = this.link.quadro;
    if (q && this.link.quadroN !== this._n) {
      this._n = this.link.quadroN;
      this.tex.image = q; this.tex.needsUpdate = true;
      if (!this.tela.material.map) { this.tela.material.map = this.tex; this.tela.material.color.set(0xffffff); this.tela.material.needsUpdate = true; }
      const ar = q.width / q.height; this.tela.scale.set(ar / (4 / 3), 1, 1);
    }
    if (t - this._tHud > 200 || this.hud.sujo) { this._tHud = t; this._hud(); }
    r.render(this.cena, this.cam);
  }
}
