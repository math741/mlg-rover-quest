// Conexão com o rover: controle (JSON) e vídeo (JPEG binário) por WebSocket.
export class Link extends EventTarget {
  constructor(ativo = true) {
    super();
    this.ativo = ativo;
    this.estado = null;      // última telemetria
    this.online = false;
    this.rtt = null;
    this.quadro = null;      // último ImageBitmap do vídeo (já virado para textura)
    this.quadroN = 0;
    this._cmd = { acel: 0, dir: 0, turbo: false };
    this._pilotando = false;
    if (!ativo) return;                                      // site da montagem (GitHub Pages): sem rover
    this._abrir();
    setInterval(() => this._ping(), 2000);
    setInterval(() => this._enviarCmd(), 50);              // 20 Hz enquanto pilota
  }
  get url() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host; }

  _abrir() {
    let ws;
    try { ws = new WebSocket(this.url + '/ws'); } catch (e) { setTimeout(() => this._abrir(), 2000); return; }
    this.ws = ws;
    ws.onopen = () => { this.online = true; this._emit('online'); };
    ws.onclose = () => { this.online = false; this._emit('offline'); setTimeout(() => this._abrir(), 1500); };
    ws.onerror = () => {};
    ws.onmessage = ev => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.t === 'estado') { this.estado = d; this._emit('estado'); }
      else if (d.t === 'pong') { this.rtt = performance.now() - d.ts; }
      else if (d.t === 'aviso') this._emit('aviso', d.msg);
    };
  }
  _emit(t, detail) { this.dispatchEvent(new CustomEvent(t, { detail })); }
  _send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  _ping() { this._send({ t: 'ping', ts: performance.now() }); }

  // ---------- pilotagem ----------
  pilotar(acel, dir, turbo = false) { this._cmd = { acel, dir, turbo }; this._pilotando = true; }
  soltar() { this._cmd = { acel: 0, dir: 0, turbo: false }; this._enviarCmd(true); this._pilotando = false; }
  parar() { this._cmd = { acel: 0, dir: 0, turbo: false }; this._send({ t: 'parar' }); }
  trim(delta) { this._send({ t: 'trim', delta }); }
  succao(nivel) { this._send({ t: 'succao', nivel: +Math.max(0, Math.min(1, nivel)).toFixed(3) }); }   // turbina de sucção, 0 – 1
  _enviarCmd(forcar) {
    if (!this._pilotando && !forcar) return;
    const c = this._cmd;
    this._send({ t: 'pilotar', acel: +c.acel.toFixed(3), dir: +c.dir.toFixed(3), turbo: c.turbo, avisar: true });
  }

  // ---------- vídeo ----------
  video(ligar, virar = false) {
    if (!this.ativo) return;
    if (!ligar) { if (this.wv) { this.wv.onclose = null; this.wv.close(); this.wv = null; } return; }
    if (this.wv) return;
    const wv = new WebSocket(this.url + '/ws/video');
    wv.binaryType = 'blob';
    let ocupado = false;
    wv.onmessage = async ev => {
      if (ocupado) return;                                   // ainda decodificando o anterior: pula este
      ocupado = true;
      try {
        const bmp = await createImageBitmap(ev.data, virar ? { imageOrientation: 'flipY' } : {});
        const velho = this.quadro; this.quadro = bmp; this.quadroN++;
        if (velho && velho !== bmp) setTimeout(() => velho.close(), 100);
        this._emit('quadro');
      } catch (e) { /* quadro corrompido: ignora */ }
      ocupado = false;
    };
    wv.onclose = () => { if (this.wv === wv) { this.wv = null; setTimeout(() => this.video(true, virar), 1500); } };
    this.wv = wv;
  }
}

// km/h estimado a partir do acelerador (roda Ø68 direto no TT, ~200 RPM a 5–6 V)
export const kmh = acel => Math.abs(acel) * 200 * Math.PI * 0.068 * 60 / 1000;
