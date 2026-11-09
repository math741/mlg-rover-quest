// Câmera (do Quest ou do celular) → detector de adesivos no worker → eventos "peca".
// No Quest 3S o navegador entrega as câmeras da frente pelo getUserMedia.
export class Scanner extends EventTarget {
  constructor() {
    super();
    this.video = document.createElement('video');
    this.video.muted = true; this.video.playsInline = true; this.video.autoplay = true;
    this.ligado = false;
    this.erro = null;
    this.ultimo = { marcadores: [], ms: 0, w: 0, h: 0, t: 0 };
    this.vistos = new Map();       // id → { n, t }
    this.estaveis = new Set();
    this.cameras = [];
    this.camIdx = 0;
    this.hz = 8;
    this.worker = new Worker('./scan-worker.js');
    this.worker.onmessage = e => this._resultado(e.data);
    this._ocupado = false;
  }

  async listarCameras() {
    try { this.cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch { this.cameras = []; }
    return this.cameras;
  }

  async ligar(idx) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.erro = 'Este navegador não deixa usar a câmera (precisa de https).'; throw new Error(this.erro); }
    this.desligar();
    const cams = await this.listarCameras();
    if (idx != null) this.camIdx = idx;
    const dev = cams[this.camIdx] && cams[this.camIdx].deviceId;
    const video = { width: { ideal: 1280 }, height: { ideal: 960 }, frameRate: { ideal: 30 } };
    if (dev) video.deviceId = { exact: dev }; else video.facingMode = 'environment';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (e) {
      this.erro = e.name === 'NotAllowedError' ? 'Permissão da câmera negada.' : 'Não consegui abrir a câmera (' + (e.name || e) + ').';
      throw e;
    }
    this.video.srcObject = this.stream;
    try { await this.video.play(); } catch { /* alguns navegadores tocam sozinhos */ }
    await this.listarCameras();                                      // depois da permissão os nomes aparecem
    const trilha = this.stream.getVideoTracks()[0];
    const ajustes = trilha ? trilha.getSettings() : {};
    this.nomeCamera = (trilha && trilha.label) || 'câmera';
    this.tamanho = [ajustes.width || this.video.videoWidth, ajustes.height || this.video.videoHeight];
    this.ligado = true; this.erro = null;
    this._laco();
    this.dispatchEvent(new Event('mudou'));
  }

  async trocarCamera() {
    await this.listarCameras();
    if (this.cameras.length < 2) return;
    await this.ligar((this.camIdx + 1) % this.cameras.length);
  }

  desligar() {
    this.ligado = false;
    if (this.stream) for (const t of this.stream.getTracks()) t.stop();
    this.stream = null;
    this.dispatchEvent(new Event('mudou'));
  }

  async _laco() {
    while (this.ligado) {
      const t0 = performance.now();
      if (!this._ocupado && this.video.readyState >= 2 && this.video.videoWidth) {
        try {
          const bmp = await createImageBitmap(this.video);
          this._ocupado = true;
          this.worker.postMessage({ bmp, max: 1280 }, [bmp]);
        } catch { /* vídeo ainda não pronto */ }
      }
      const espera = Math.max(10, 1000 / this.hz - (performance.now() - t0));
      await new Promise(r => setTimeout(r, espera));
    }
  }

  _resultado(d) {
    this._ocupado = false;
    const agora = performance.now();
    this.ultimo = { ...d, t: agora };
    // estabiliza: precisa aparecer em 2 leituras seguidas; some depois de 1,2 s sem ver
    const nesta = new Set(d.marcadores.map(m => m.id));
    for (const id of nesta) {
      const v = this.vistos.get(id) || { n: 0, t: 0 };
      v.n = agora - v.t < 600 ? v.n + 1 : 1; v.t = agora;
      this.vistos.set(id, v);
      if (v.n >= 2 && !this.estaveis.has(id)) { this.estaveis.add(id); this.dispatchEvent(new CustomEvent('peca', { detail: id })); }
      else if (v.n >= 2) this.dispatchEvent(new CustomEvent('ainda', { detail: id }));
    }
    for (const id of [...this.estaveis]) {
      if (agora - this.vistos.get(id).t > 1200) { this.estaveis.delete(id); this.dispatchEvent(new CustomEvent('sumiu', { detail: id })); }
    }
    this.dispatchEvent(new Event('leitura'));
  }
}
