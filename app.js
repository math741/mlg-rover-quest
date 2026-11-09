// App do MLG ROVER Ω: tela inicial, pilotagem pela tela, montagem na tela e os modos do Quest.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Link, kmh } from './link.js';
import { Scanner } from './scanner.js';
import { Montagem, POR_ID, TESTE_ID } from './montagem.js';
import { MontagemAR, PilotagemXR, suporteXR } from './xr.js';

const $ = s => document.querySelector(s);
// Aberto pelo GitHub Pages (ou outro site que não é o rover): só a montagem funciona
const SEM_ROVER = /(^|\.)github\.io$/.test(location.hostname) || new URLSearchParams(location.search).has('montagem');
const link = new Link(!SEM_ROVER);
const scanner = new Scanner();
let montagem = null;
let tela = 'inicio';
let modoXR = null;

/* ---------------- renderer único (tela e Quest) ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
const cena = new THREE.Scene();
cena.background = new THREE.Color(0x15161a);
cena.add(new THREE.HemisphereLight(0xffffff, 0x4a4238, 2.3));
const sol = new THREE.DirectionalLight(0xffffff, 1.7); sol.position.set(.5, 1, .7); cena.add(sol);
const grade = new THREE.GridHelper(1, 20, 0x3a3a40, 0x26262b); cena.add(grade);
const camera = new THREE.PerspectiveCamera(38, 1, .01, 20);
camera.position.set(.34, .24, .40);
const orbita = new OrbitControls(camera, renderer.domElement);
orbita.target.set(0, .06, 0); orbita.enableDamping = true; orbita.minDistance = .12; orbita.maxDistance = 2;

function garantirMontagem() {
  if (montagem) return montagem;
  $('#carregando').hidden = false;
  montagem = new Montagem();
  $('#carregando').hidden = true;
  return montagem;
}

/* ---------------- telas ---------------- */
function mostrar(nome) {
  tela = nome;
  for (const s of document.querySelectorAll('.tela')) s.hidden = s.id !== 'tela-' + nome;
  if (nome === 'pilotar') { link.video(true); }
  else { link.soltar(); link.video(false); }
  if (nome === 'montar') {
    const m = garantirMontagem();
    m.obj.removeFromParent(); cena.add(m.obj);
    $('#m3d').appendChild(renderer.domElement);
    redimensionar();
    desenharPasso();
    ligarPreviaScanner(true);
  } else ligarPreviaScanner(false);
}

function redimensionar() {
  if (renderer.xr.isPresenting) return;
  const el = $('#m3d'); if (!el || tela !== 'montar') return;
  const w = el.clientWidth || 600, h = el.clientHeight || 400;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionar);

/* ---------------- telemetria na tela inicial ---------------- */
function atualizarConexao() {
  const e = link.estado, pill = $('#conexao');
  if (SEM_ROVER) { pill.textContent = 'modo montagem (sem rover)'; pill.className = 'pill'; return; }
  if (!link.online) { pill.textContent = 'sem conexão com o rover'; pill.className = 'pill off'; return; }
  const pi = e && e.pi;
  const partes = ['conectado'];
  if (e && e.simulado) partes.push('modo simulado');
  if (pi && pi.temp != null) partes.push(String(pi.temp).replace('.', ',') + ' °C');
  if (pi && pi.wifi) partes.push(pi.wifi.dbm + ' dBm');
  pill.textContent = partes.join(' · '); pill.className = 'pill on';
  if (tela === 'inicio' && e) {
    const c = e.camera, p = e.piloto;
    $('#info').innerHTML = [
      ['Rover', pi ? pi.nome : '—'], ['Rede', pi && pi.rede ? pi.rede : '—'], ['IP', pi && pi.ips && pi.ips.length ? pi.ips.join(', ') : '—'],
      ['Webcam', c ? (c.ok ? `${c.modo} · ${String(c.fps).replace('.', ',')} fps` : c.erro || 'desligada até alguém assistir') : '—'],
      ['Motores', p ? (p.saidas === 'simulado' ? 'simulado (sem GPIO)' : p.saidas) : '—'], ['Ping', link.rtt != null ? Math.round(link.rtt) + ' ms' : '—'],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  }
}
link.addEventListener('estado', atualizarConexao);
link.addEventListener('online', atualizarConexao);
link.addEventListener('offline', atualizarConexao);

/* ---------------- botões da tela inicial ---------------- */
async function iniciarXR(Classe, extra) {
  try {
    const m = Classe === MontagemAR ? garantirMontagem() : null;
    modoXR = new Classe({ renderer, link, montagem: m, scanner, aoSair: () => { modoXR = null; renderer.setAnimationLoop(laco); mostrar('inicio'); } });
    await modoXR.entrar();
  } catch (e) {
    modoXR = null;
    const a = $('#xr-aviso'); a.hidden = false; a.textContent = 'Não consegui entrar no modo imersivo: ' + (e.message || e);
  }
}
$('#b-montar-ar').addEventListener('click', () => iniciarXR(MontagemAR));
$('#b-pilotar-xr').addEventListener('click', () => iniciarXR(PilotagemXR));
$('#b-pilotar').addEventListener('click', () => mostrar('pilotar'));
$('#b-montar').addEventListener('click', () => mostrar('montar'));
$('#b-camera').addEventListener('click', async () => {
  const est = $('#cam-estado');
  try {
    if (scanner.ligado) { await scanner.trocarCamera(); }
    else await scanner.ligar();
    est.textContent = `Câmera ligada: ${scanner.nomeCamera}${scanner.cameras.length > 1 ? ` (${scanner.camIdx + 1} de ${scanner.cameras.length}, toque de novo para trocar)` : ''}`;
    $('#b-camera').textContent = scanner.cameras.length > 1 ? 'Trocar câmera' : 'Câmera ligada ✓';
  } catch (e) { est.textContent = scanner.erro || String(e); }
});

if (SEM_ROVER) {
  for (const id of ['#b-pilotar-xr', '#b-pilotar']) {
    const b = $(id); b.disabled = true;
    b.querySelector('p').textContent = 'Só pelo endereço do rover (https://rover.local:8443 ou https://10.42.0.1:8443), com o Raspberry Pi ligado.';
  }
  $('#info').hidden = true;
  $('#adesivos').hidden = false;
}
suporteXR().then(s => {
  const aviso = $('#xr-aviso');
  if (!s.ar && !s.vr) {
    $('#b-montar-ar').disabled = $('#b-pilotar-xr').disabled = true;
    aviso.hidden = false;
    aviso.textContent = window.isSecureContext
      ? 'Os modos do Quest só aparecem no navegador do Meta Quest. Aqui você pode pilotar e ver a montagem pela tela.'
      : 'Abra pelo endereço com https:// (o navegador bloqueia o modo imersivo e a câmera sem https).';
  }
});

/* ---------------- pilotar pela tela ---------------- */
const joy = { acel: 0, dir: 0 }, teclas = new Set();
let turbo = false;
function prepararJoystick(el, chave) {
  const man = el.querySelector('.manete'), eixo = el.dataset.eixo;
  let id = null;
  const mover = ev => {
    const r = el.getBoundingClientRect();
    let v = eixo === 'y' ? -((ev.clientY - r.top) / r.height * 2 - 1) : ((ev.clientX - r.left) / r.width * 2 - 1);
    v = Math.max(-1, Math.min(1, v * 1.25));
    if (Math.abs(v) < .08) v = 0;
    joy[chave] = v;
    const px = eixo === 'y' ? `translate(0, ${-v * (r.height / 2 - 40)}px)` : `translate(${v * (r.width / 2 - 40)}px, 0)`;
    man.style.transform = px;
  };
  el.addEventListener('pointerdown', ev => { id = ev.pointerId; el.setPointerCapture(id); mover(ev); });
  el.addEventListener('pointermove', ev => { if (ev.pointerId === id) mover(ev); });
  const soltar = ev => { if (ev.pointerId !== id) return; id = null; joy[chave] = 0; man.style.transform = ''; };
  el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
}
prepararJoystick($('#joy-acel'), 'acel');
prepararJoystick($('#joy-dir'), 'dir');
addEventListener('keydown', e => { if (tela !== 'pilotar') return; teclas.add(e.key.toLowerCase()); if (e.key === ' ') { link.parar(); e.preventDefault(); } });
addEventListener('keyup', e => teclas.delete(e.key.toLowerCase()));
setInterval(() => {
  if (tela !== 'pilotar') return;
  const k = t => teclas.has(t);
  let acel = joy.acel + (k('w') || k('arrowup') ? 1 : 0) - (k('s') || k('arrowdown') ? 1 : 0);
  let dir = joy.dir + (k('d') || k('arrowright') ? 1 : 0) - (k('a') || k('arrowleft') ? 1 : 0);
  // controle de videogame no PC (opcional)
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  if (gp) { const z = v => Math.abs(v) < .12 ? 0 : v; acel += -z(gp.axes[1] || 0) + (gp.buttons[7] ? gp.buttons[7].value : 0) - (gp.buttons[6] ? gp.buttons[6].value : 0); dir += z(gp.axes[2] != null ? gp.axes[2] : gp.axes[0] || 0); }
  link.pilotar(Math.max(-1, Math.min(1, acel)), Math.max(-1, Math.min(1, dir)), turbo || k('shift'));
}, 50);
$('#p-sair').addEventListener('click', () => mostrar('inicio'));
$('#p-parar').addEventListener('click', () => link.parar());
$('#p-turbo').addEventListener('click', e => { turbo = !turbo; e.currentTarget.setAttribute('aria-pressed', String(turbo)); });
$('#p-tm').addEventListener('click', () => link.trim(-5));
$('#p-tp').addEventListener('click', () => link.trim(5));
link.addEventListener('aviso', e => {
  const t = $('#aviso-pilotar'); t.textContent = e.detail; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2500);
});
const tv = $('#video'), tvx = tv.getContext('2d');
link.addEventListener('quadro', () => {
  if (tela !== 'pilotar' || !link.quadro) return;
  const q = link.quadro;
  if (tv.width !== q.width || tv.height !== q.height) { tv.width = q.width; tv.height = q.height; }
  tvx.drawImage(q, 0, 0);
  $('#sem-video').hidden = true;
});
setInterval(() => {
  if (tela !== 'pilotar') return;
  const e = link.estado, p = e && e.piloto, pi = e && e.pi;
  $('#hud').innerHTML = [
    ['Velocidade', p ? kmh(p.acel).toFixed(1).replace('.', ',') + ' km/h' : '—'],
    ['Direção', p ? Math.round(p.dir * 30) + '°' : '—'],
    ['Pi', pi && pi.temp != null ? String(pi.temp).replace('.', ',') + ' °C' : '—'],
    ['Ping', link.rtt != null ? Math.round(link.rtt) + ' ms' : '—'],
    ...(p && p.parado && link.online ? [['Parado', p.parado]] : []),
  ].map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
}, 200);

/* ---------------- montagem na tela ---------------- */
const msgM = $('#m-msg');
function desenharPasso(reavaliar = true) {
  const m = montagem; if (!m) return;
  if (reavaliar) {                                     // peças que já estão na frente da câmera contam no passo novo
    mensagem(scanner.ligado ? 'Mostre as peças deste passo para a câmera.' : 'Ligue a câmera para conferir as peças pelo adesivo.');
    if (scanner.estaveis.size) { const r = m.avaliar([...scanner.estaveis]); if (r) mensagem(r.texto, r.tipo); }
  }
  const ps = m.passo;
  $('#m-passo').textContent = `PASSO ${m.k} DE ${m.total}`;
  $('#m-prog').style.width = (m.k / m.total * 100) + '%';
  $('#m-titulo').textContent = ps.titulo;
  $('#m-texto').textContent = ps.texto;
  $('#m-pecas').innerHTML = ps.mdf.length ? ps.mdf.map(p => `<li class="${m.feitoNoPasso(p.code) ? 'ok' : ''}"><b>${p.code}</b><span>${p.qtd}× ${p.nome}${p.id == null ? `<br><em>sem adesivo: ${p.dica || 'reconheça pelo formato'}</em>` : ''}</span></li>`).join('') : '<li><span>Nenhuma peça de MDF neste passo.</span></li>';
  $('#m-comprados').textContent = ps.comprados.length ? 'Também: ' + ps.comprados.join(' · ') : '';
  $('#m-ant').disabled = m.k <= 1; $('#m-prox').disabled = m.k >= m.total;
}
function mensagem(t, cls = '') { msgM.textContent = t; msgM.className = 'msg ' + cls; }
$('#m-ant').addEventListener('click', () => { montagem.anterior(); desenharPasso(); });
$('#m-prox').addEventListener('click', () => { montagem.proximo(); desenharPasso(); });
$('#m-rep').addEventListener('click', () => montagem.replay());
$('#m-sair').addEventListener('click', () => mostrar('inicio'));
$('#m-cam').addEventListener('click', async () => {
  try { if (scanner.ligado) await scanner.trocarCamera(); else await scanner.ligar(); ligarPreviaScanner(true); mensagem('Câmera ligada: mostre uma peça com adesivo.'); }
  catch (e) { mensagem(scanner.erro || String(e), 'outro'); }
});
function ligarPreviaScanner(on) {
  const box = $('#m-scan');
  box.hidden = !(on && scanner.ligado);
  if (!box.hidden && scanner.video.parentNode !== box) box.prepend(scanner.video);
  $('#m-cam').textContent = scanner.ligado ? (scanner.cameras.length > 1 ? 'Trocar câmera' : 'Câmera ✓') : 'Câmera';
}
scanner.addEventListener('mudou', () => ligarPreviaScanner(tela === 'montar'));
scanner.addEventListener('leitura', () => {
  if (tela !== 'montar') return;
  const cv = $('#m-overlay'), box = $('#m-scan'), x = cv.getContext('2d');
  cv.width = box.clientWidth; cv.height = box.clientHeight;
  x.clearRect(0, 0, cv.width, cv.height);
  const vw = scanner.video.videoWidth, vh = scanner.video.videoHeight; if (!vw) return;
  const k = Math.max(cv.width / vw, cv.height / vh), dw = vw * k, dh = vh * k, dx = (cv.width - dw) / 2, dy = (cv.height - dh) / 2;
  for (const mk of scanner.ultimo.marcadores) {
    const pc = POR_ID[mk.id];
    const cor = mk.id === TESTE_ID ? '#5aa9ff' : !pc ? '#888' : montagem && montagem.passo.mdf.some(q => q.code === pc.code) ? '#38d27a' : '#ff9b3d';
    x.beginPath(); mk.c.forEach(([u, v], i) => i ? x.lineTo(dx + u * dw, dy + v * dh) : x.moveTo(dx + u * dw, dy + v * dh)); x.closePath();
    x.lineWidth = 4; x.strokeStyle = cor; x.stroke();
    x.fillStyle = cor; x.font = '800 18px system-ui'; x.fillText(mk.id === TESTE_ID ? 'TESTE' : pc ? pc.code : '?', dx + mk.c[0][0] * dw, dy + mk.c[0][1] * dh - 6);
  }
});
function avaliarVistos(ids) {
  if (tela !== 'montar' || !montagem) return;
  const r = montagem.avaliar(ids);
  if (!r) return;
  mensagem(r.texto, r.tipo);
  if (r.tipo === 'ok' && navigator.vibrate) navigator.vibrate(60);
  desenharPasso(false);
}
scanner.addEventListener('peca', e => avaliarVistos([e.detail]));

/* ---------------- laço de desenho ---------------- */
let tAnt = 0;
function laco(t, frame) {
  const dt = Math.min(.1, (t - tAnt) / 1000 || 0); tAnt = t;
  if (modoXR && renderer.xr.isPresenting) { modoXR.frame(t, frame, dt); return; }
  if (tela === 'montar' && montagem) {
    montagem.atualizar(dt);
    orbita.update();
    renderer.render(cena, camera);
  }
}
renderer.setAnimationLoop(laco);
mostrar('inicio');
atualizarConexao();
window.ROVER = { link, scanner, get montagem() { return montagem; }, get xr() { return modoXR; }, renderer, mostrar, THREE };
