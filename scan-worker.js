// Detecção dos adesivos (ArUco 4x4) fora da thread principal.
importScripts('vendor/aruco/cv.js', 'vendor/aruco/aruco.js', 'vendor/aruco/aruco_4x4_1000.js');

// só os 50 primeiros códigos (iguais ao DICT_4X4_50 do OpenCV): distância mínima 4,
// então dá para aceitar 1 bit errado sem confundir uma peça com outra
AR.DICTIONARIES.MLG_4X4 = { nBits: 16, tau: 2, codeList: AR.DICTIONARIES.ARUCO_4X4_1000.codeList.slice(0, 50) };
const detector = new AR.Detector({ dictionaryName: 'MLG_4X4' });
let tela = null, ctx = null;

self.onmessage = e => {
  const { bmp, max } = e.data;
  const esc = Math.min(1, (max || 1280) / bmp.width);
  const w = Math.round(bmp.width * esc), h = Math.round(bmp.height * esc);
  if (!tela || tela.width !== w || tela.height !== h) { tela = new OffscreenCanvas(w, h); ctx = tela.getContext('2d', { willReadFrequently: true }); }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const t0 = performance.now();
  let marcadores = [];
  try {
    marcadores = detector.detect(ctx.getImageData(0, 0, w, h)).map(m => ({ id: m.id, c: m.corners.map(p => [p.x / w, p.y / h]), hd: m.hammingDistance }));
  } catch (err) { /* quadro ruim */ }
  self.postMessage({ marcadores, w, h, ms: performance.now() - t0 });
};
