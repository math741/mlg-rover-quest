/* ================= DADOS DO MLG ROVER Ω · versão 100% MDF ================= */
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const DEG = Math.PI / 180;
const GEO = { L: 165, B: 176, Dw: 68, wW: 26, maxIn: 30, len: 233, h: 101, base: 81, wTot: 202 };

function ackermann(L, B, di) {
  if (di < 1e-4) return { dout: 0, Rc: Infinity, rFi: Infinity, rFo: Infinity, rRi: Infinity, rRo: Infinity };
  const dout = Math.atan(1 / (1 / Math.tan(di) + B / L));
  const rRi = L / Math.tan(di);
  return { dout, Rc: rRi + B / 2, rFi: L / Math.sin(di), rFo: L / Math.sin(dout), rRi, rRo: rRi + B };
}
// perfil evolvente (usado só no ícone de engrenagem)
function gearPts(z, m, bl = 0.06) {
  const a0 = 20 * Math.PI / 180, r = m * z / 2, rb = r * Math.cos(a0), ra = r + m, rf = r - 1.25 * m, t = 2 * Math.PI / z;
  const inv = a => Math.tan(a) - a, th = rho => (Math.PI * m / 2 - bl) / (2 * r) + inv(a0) - inv(Math.acos(rb / Math.max(rho, rb)));
  const r0 = Math.max(rf, rb), rs = rf < rb ? [rf] : [];
  for (let k = 0; k <= 8; k++) rs.push(r0 + (ra - r0) * k / 8);
  const P = (rho, q) => [rho * Math.cos(q), rho * Math.sin(q)], p = [];
  for (let i = 0; i < z; i++) {
    const a = i * t;
    for (const rho of rs) p.push(P(rho, a - th(rho)));
    p.push(P(ra, a));
    for (let k = rs.length - 1; k >= 0; k--) p.push(P(rs[k], a + th(rs[k])));
    const q0 = a + th(rf), q1 = a + t - th(rf);
    for (const k of [.25, .5, .75]) p.push(P(rf, q0 + (q1 - q0) * k));
  }
  return p;
}
const kmh = (rpm, ratio = 1, d = 68) => Math.PI * d / 1000 * rpm * ratio * 0.06;
// sucção: área dentro da saia (cm²), depressão estimada no máximo (Pa) e força para baixo (kgf) com a turbina no nível k (Δp ∝ rotação² ∝ k²)
const SUC_AREA = 243, SUC_AREA0 = 168, SUC_DP = 320, SUC_PESO = .95, SUC_MU = .8;
const sucKg = (k, dp = SUC_DP, area = SUC_AREA) => dp * k * k * area / 1e4 / 9.81;

const PART_GROUPS = [
  { nome: 'Estrutura (MDF 3 mm, corte a laser)', parts: ['chassi', 'carroceria', 'suportes', 'travessa'] },
  { nome: 'Direção Ackermann', parts: ['manga', 'servo', 'suporteServo', 'braco'] },
  { nome: 'Tração 4×4', parts: ['motor', 'rodas'] },
  { nome: 'Eletrônica e energia', parts: ['pi', 'driver', 'powerbank', 'webcam', 'fiacao'] },
  { nome: 'Sucção (fan car)', parts: ['cano', 'turbina', 'helices', 'cruzetas', 'saia', 'esc', 'lipo'] },
  { nome: 'Fixação', parts: ['parafusos', 'porcas'] },
];

const MDFT = 'Corte a laser · MDF 3 mm';
const PARTS = {
  chassi: { nome: 'Chassi (2 camadas de MDF)', qtd: '2 peças', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Base de tudo. As paredes, o garfo da travessa, o suporte do servo e o para-choque entram em rasgos e são colados. A camada de baixo tem as línguas onde giram os pinos das mangas.',
    specs: [['Medidas', '210 × 81 mm (142 mm de largura nas línguas dos pinos) + abas de 6 mm do para-choque'], ['Espessura', '6 mm (2 × 3 mm coladas)'], ['Pinos das mangas', '2 furos Ø8,4 na camada de baixo (x = 82,5 mm, z = ±61,8 mm)'], ['Rasgos', 'Paredes, painel traseiro, bochechas do garfo e paredes do suporte do servo: atravessam as 2 camadas'], ['Abertura', 'Ø31 para a ventoinha do kit (opcional)'], ['Códigos gravados', 'CH1 (de cima) · CH2 (de baixo)']],
    nota: 'Cole as duas camadas com as bordas alinhadas. Encaixe uma parede seca nos rasgos para servir de guia enquanto a cola seca.' },
  carroceria: { nome: 'Carroceria (caixa de MDF)', qtd: '7 peças', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'A caixa do rover: protege a eletrônica e segura as prateleiras. O teto também faz parte da direção: as asas dele seguram os pinos de cima das mangas.',
    specs: [['Peças', '2 paredes laterais (PL-D e PL-E, espelhadas para o logotipo gravado ficar do lado de fora), painel traseiro (TR), teto/rack (TE), para-choque de 2 camadas (PC), antena (AN)'], ['Altura', '101 mm no teto · 152 mm com a webcam'], ['Fixação', 'Tudo colado, menos o teto: 4 × M3 × 16 em fendas T nas paredes'], ['Janelas', 'Deixam ver a eletrônica e passar os fios dos motores'], ['Logotipo', 'MLG Ω gravado a laser nas duas paredes']],
    nota: 'Só tire o teto com o rover parado: sem ele, as mangas ficam soltas em cima.' },
  suportes: { nome: 'Suportes de MDF', qtd: 'vários', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Peças que seguram a eletrônica, o power bank, a webcam e o pivô da travessa.',
    specs: [['Inclui', 'Garfo do pivô (2 bochechas de 2 camadas, GP), prateleira eletrônica (PR), 4 espaçadores do Pi (ES), bandeja do power bank (BP), 2 travessas do power bank (TB), bolsão e ponte da webcam (WC e WP)'], ['Fixação', 'Coladas nos rasgos das paredes e do chassi'], ['Power bank', 'Preso por 2 travessas que entram pelas fendas das paredes: é só puxar para tirar']] },
  travessa: { nome: 'Travessa traseira (basculante)', qtd: '8 peças', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Viga que segura os dois motores traseiros e gira num parafuso central. Mantém as 4 rodas no chão em terreno irregular.',
    specs: [['Viga', '4 camadas coladas (VB), 12 × 12 mm, passa pelas janelas das paredes'], ['Placas dos motores', '2 camadas por lado: PM1 encostada no TT e PM2 com as porcas cativas'], ['Curso', '±7°'], ['Curso vertical por roda', '±10,7 mm'], ['Pivô', 'M4 × 35 + 2 arruelas + autotravante, nas bochechas do garfo'], ['Motores', 'TT traseiros deitados, 2 × M3 × 25 cada'], ['Amortecedores', 'Nenhum']] },
  manga: { nome: 'Manga de eixo com motor (MDF)', qtd: '2 × 6 peças', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Suporte giratório de cada roda dianteira. Segura o motor TT em pé e gira em dois pinos de MDF: um embaixo, na língua do chassi, e outro em cima, na asa do teto.',
    specs: [['Peças por manga', 'Placa do motor de 2 camadas (MV1 + MV2), fundo (MB), orelha de cima (MT), braço de direção de 2 camadas (MA) e 2 pinos Ø8 (MP)'], ['Pino-mestre', 'No plano do meio do motor (x = 82,5; z = ±61,8 mm): 26 mm para dentro do centro da roda'], ['Ângulo interno máx.', '30°'], ['Ângulo externo real', '21,9° (ideal pelos pinos-mestres: 22,1°)'], ['Braço de direção', '26 mm atrás do pino, 12° para dentro'], ['Motor TT', 'Em pé, 2 × M3 × 25 pelos furos do próprio TT, porcas cativas na MV2'], ['Folga vertical', '0,1 mm entre a língua do chassi e o teto']],
    nota: 'A roda gira junto com o motor, então não precisa de junta universal. O fio do motor sai por cima e entra na caixa pela janela da frente: deixe folga para a curva.' },
  servo: { nome: 'Servo MG90S', qtd: '1×', cat: 'eletronica', tipo: 'Comprado', cor: '#2a2a2e', fonte: 'info',
    func: 'Gira as duas mangas pelas barras de direção.',
    specs: [['Montagem', 'Em pé na placa do suporte (abas por cima), com os 2 parafusos M2 que vêm com ele'], ['Eixo', 'x = 31,1 mm, no centro do carro'], ['Braço', 'O braço duplo que vem com o servo + braço de MDF parafusado por cima (2 furos Ø3,4 a 26 mm do eixo)'], ['Giro na curva máxima', '≈ 25° para cada lado'], ['Sinal', 'PWM 50 Hz, pulso de ~1 a 2 ms'], ['Fios', 'Marrom GND · Vermelho V+ · Laranja sinal'], ['Torque típico', '≈ 1,8 kgf·cm a 4,8 V'], ['Peso típico', '≈ 13,4 g']] },
  suporteServo: { nome: 'Suporte do servo (MDF)', qtd: '3 peças', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Segura o MG90S em pé no chassi: o corpo entra pelo recorte da placa e as abas apoiam por cima.',
    specs: [['Placa (SS)', 'Recorte de 23,1 × 12,5 mm para o corpo de 22,8 × 12,2 mm'], ['Paredes (SW)', '2, coladas nos rasgos do chassi e da placa'], ['Furos-guia', 'Ø1,6 para os parafusos M2 do servo (a rosca se forma no MDF)']] },
  braco: { nome: 'Barras de direção e braço do servo (MDF)', qtd: '2 + 1', cat: 'mdf', tipo: MDFT, cor: '#c4a27a', fonte: 'info',
    func: 'Barras que ligam o braço do servo às mangas. Passam o giro do servo para as duas rodas.',
    specs: [['Barras (BD)', '48,4 mm entre furos (fixo, as duas iguais), 8 mm de largura'], ['Braço do servo (BS)', 'Furos Ø3,4 a 26 mm do eixo e 16 mm entre si'], ['No servo', 'M3 × 12 + autotravante em cada furo'], ['Nas mangas', 'M3 × 16 + autotravante em cada braço'], ['Altura', 'Barras deitadas a 53,5 mm do chão, abaixo da prateleira']] },
  motor: { nome: 'Motor TT (amarelo, eixo duplo)', qtd: '4×', cat: 'eletronica', tipo: 'Comprado', cor: '#f8c623', fonte: 'info',
    func: 'Motor DC com caixa de redução 1:48. A roda encaixa direto no eixo duplo-D: não há engrenagem extra.',
    specs: [['Tensão', '3 – 6 V'], ['Rotação', '≈ 200 RPM sem carga a 6 V (≈ 170 a 5 V)'], ['Frente', 'Em pé na manga: vira junto com a roda'], ['Trás', 'Deitados nas placas da travessa'], ['Fixação', '2 × M3 × 25 pelos furos do próprio TT, porca cativa na camada de dentro'], ['Posições', 'M1 frente esq. · M2 frente dir. · M3 traseira esq. · M4 traseira dir.']] },
  pi: { nome: 'Raspberry Pi Zero 2 W', qtd: '1×', cat: 'eletronica', tipo: 'Comprado', cor: '#1b7a3b', fonte: 'info',
    func: 'Cérebro do rover: roda o AutoGPT 2S, lê a câmera, comanda o servo e os 4 motores.',
    specs: [['Função', 'Controle + IA (AutoGPT 2S)'], ['Processador', 'Quad-core Arm Cortex-A53, 1 GHz'], ['Memória', '512 MB'], ['Sem fio', 'Wi-Fi 2,4 GHz e Bluetooth 4.2'], ['Portas', 'mini-HDMI, micro-USB OTG, micro-USB de energia, microSD, câmera CSI'], ['Montagem', 'Na prateleira, sobre 4 espaçadores de MDF, com 4 × M2,5 × 10; portas viradas para o centro e cartão para a frente'], ['Tamanho', '65 × 30 mm']] },
  driver: { nome: 'Ponte H L9110S', qtd: '1×', cat: 'eletronica', tipo: 'Comprado (você já tem)', cor: '#b52620', fonte: 'extra',
    func: 'Driver dos motores. O canal A move o lado esquerdo e o canal B o lado direito.',
    specs: [['Canais', '2, ~800 mA contínuos por canal (picos de ~1,5 A)'], ['Tensão', '2,5 – 12 V (aqui, 5 V do power bank)'], ['Canal A', 'Lado esquerdo: M1 + M3 em paralelo'], ['Canal B', 'Lado direito: M2 + M4 em paralelo'], ['Controle', 'A-IA / A-IB e B-IA / B-IB: PWM numa entrada e 0 na outra'], ['Queda interna', 'Baixa: os motores recebem quase os 5 V'], ['Fixação', '2 abraçadeiras de nylon pelos rasgos da prateleira (serve para qualquer furação)']],
    nota: 'Com 2 motores por canal, evite travar as rodas: no arranque cada TT puxa até ~1,5 A e a placa esquenta.' },
  powerbank: { nome: 'Power Bank Kaidi KD-998', qtd: '1×', cat: 'eletronica', tipo: 'Comprado', cor: '#18181b', fonte: 'info',
    func: 'Fonte de energia de todo o rover.',
    specs: [['Capacidade', '10.000 mAh (≈ 37 Wh nominais)'], ['Saída', '5 V · USB-A e USB-C'], ['Alimenta', 'USB-C → Pi · USB-A → L9110S, motores e servo'], ['Medidas no modelo', '97 × 67 × 17 mm'], ['Posição', 'Bandeja traseira, acima da travessa basculante'], ['Fixação', '2 travessas de MDF que entram pelas fendas das paredes']] },
  webcam: { nome: 'Webcam USB', qtd: '1×', cat: 'eletronica', tipo: 'Comprado', cor: '#111113', fonte: 'info',
    func: 'Olhos do rover: imagem em tempo real para o AutoGPT 2S e para o Meta Quest 3S.',
    specs: [['Corpo', '70 × 26 × 23 mm (lente Ø16,6 saliente 3 mm)'], ['Montagem', 'No teto, na frente: base dobrada no bolsão de MDF, presa pela ponte em U (0,4 mm de pressão)'], ['Ângulo', 'O pescoço da própria câmera continua inclinando e girando'], ['Cabo', 'Desce por um furo do teto até a porta micro-USB OTG do Pi (com adaptador OTG)']] },
  fiacao: { nome: 'Fiação e cabos', qtd: '—', cat: 'eletronica', tipo: 'Complementar', cor: '#d32f2f', fonte: 'extra',
    func: 'Cabos que ligam energia, sinais e motores.',
    specs: [['Energia', '2 cabos USB do power bank (Pi e L9110S)'], ['Sinais', '5 jumpers do GPIO (A-IA, A-IB, B-IA, B-IB e GND) + 3 do servo'], ['Motores', '4 pares vermelho/preto; os da frente com folga para a curva']] },
  rodas: { nome: 'Rodas amarelas (Ø 68 mm)', qtd: '4×', cat: 'mecanica', tipo: 'Comprado', cor: '#f5b50a', fonte: 'info',
    func: 'Rodas com aro amarelo e pneu de borracha com cravos.',
    specs: [['Diâmetro', '68 mm'], ['Largura', '26 mm'], ['Perímetro', '213,6 mm por volta'], ['Encaixe', 'Direto no eixo duplo-D do TT (cubo do lado de dentro, ~5 mm de encaixe); use o parafuso da roda']],
    nota: 'Comprada (você já tem).' },
  cano: { nome: 'Cano de esgoto Ø50 (34 mm)', qtd: '1 pedaço', cat: 'mecanica', tipo: 'Comprado (sobra de obra)', cor: '#eeede8', fonte: 'extra',
    func: 'Duto da turbina. Fica em pé no meio do chassi, em cima do furo Ø31, entre o garfo da travessa e o suporte do servo, colado com cola quente em volta toda.',
    specs: [['Cano', 'PVC de esgoto 50 mm: Ø50 por fora, ~Ø46,8 por dentro'], ['Altura', '34 mm (corte reto e lixe)'], ['Folgas', '3,2 mm do garfo · 2 mm do suporte do servo · 8 mm da bandeja de cima'], ['Furos', '2 × Ø4 para os fios: a 6 mm da base (frente-esquerda) e a 5 mm da boca (frente-direita)'], ['Entalhe', '10 × 10,5 mm na boca, virado para trás: encaixa na porca do pivô da travessa']],
    nota: 'Vede o furo de baixo com cola quente: qualquer fresta abaixo das hélices rouba sucção. O entalhe e o furo de cima ficam acima das hélices, onde o ar já está saindo: não atrapalham.' },
  turbina: { nome: 'Motores do DJI Neo 2 (2 dos seus 4)', qtd: '2×', cat: 'eletronica', tipo: 'Você já tem', cor: '#0d0d0f', fonte: 'extra',
    func: 'Os 2 motores brushless da turbina, um em cima do outro, girando em sentidos opostos. O de baixo fica em pé na cruzeta de baixo e o de cima, pendurado na de cima.',
    specs: [['Tipo', 'Brushless de 3 fios: precisa de ESC'], ['Medida usada no projeto', 'Ø14 × 8 mm, eixo Ø1,5 (confira os seus)'], ['Fixação', 'Parafusos pelos 3 rasgos da cruzeta ou cola quente na base'], ['Sentido (visto de cima)', 'De baixo: horário · de cima: anti-horário. Trocar 2 dos 3 fios inverte']],
    nota: 'Os outros 2 motores ficam de reserva.' },
  helices: { nome: 'Hélices de 45 mm (3 pás)', qtd: '1 CW + 1 CCW', cat: 'mecanica', tipo: 'Comprado', cor: '#f26b1d', fonte: 'extra',
    func: 'Puxam o ar de baixo do rover e jogam para cima. Girando em sentidos opostos, a de cima desfaz o redemoinho da de baixo e a pressão sobe.',
    specs: [['Diâmetro', '45 mm (no máximo 46: o cano tem ~46,8 por dentro)'], ['Par', 'CCW no motor de baixo e CW no de cima'], ['Montagem', 'As duas com a parte escrita virada para baixo'], ['Furo', 'O do eixo do motor (1,5 mm no projeto)']],
    nota: 'Se as hélices do próprio Neo 2 couberem no cano (até Ø46), use elas.' },
  cruzetas: { nome: 'Cruzetas dos motores (MDF)', qtd: '2 peças', cat: 'mdf', tipo: 'Corte a laser · MDF 3 mm (chapa 2)', cor: '#c4a27a', fonte: 'info',
    func: 'Seguram cada motor no centro do cano. Os 3 braços encostam por dentro do cano e são colados nele; o ar passa entre os braços.',
    specs: [['Diâmetro', '46,4 mm (0,2 mm de folga no cano)'], ['Furo central', 'Ø5,2 para a presilha do eixo'], ['Rasgos', '3, de 1,8 mm: servem para furos de 7,2 a 14,8 mm de distância'], ['Código', 'SM (2 iguais)']] },
  saia: { nome: 'Saia de sucção (asas de MDF + EVA)', qtd: '2 asas + 0,75 m de EVA', cat: 'mdf', tipo: 'Corte a laser (chapa 2) + EVA 2 mm', cor: '#1b1c1f', fonte: 'info',
    func: 'Fecha a área embaixo do rover para a turbina conseguir baixar a pressão ali. As 2 asas de MDF aumentam essa área de 168 para 243 cm².',
    specs: [['Asas (SA)', '2 iguais, 80 × 60 mm, coladas embaixo do chassi (12,5 mm de cola), entre as rodas'], ['EVA', '2 mm, preto: tiras de 15 mm no chassi e de 12 mm nas asas'], ['Folga do chão', '~1 mm'], ['Área dentro da saia', '243 cm²']],
    nota: 'Cole o EVA com cola de contato ou cola quente. Se raspar demais no chão, apare 1 mm com tesoura.' },
  esc: { nome: '2 ESCs de 12 A (BLHeli_S)', qtd: '2×', cat: 'eletronica', tipo: 'Comprado', cor: '#2a59c9', fonte: 'extra',
    func: 'Controladores dos motores brushless. Recebem do Pi um pulso igual ao de servo e giram cada motor na velocidade pedida.',
    specs: [['Corrente', '12 A (folga: cada motor deve puxar uns 3 – 6 A)'], ['Bateria', '2 – 4S'], ['Sinal', 'PWM 50 Hz, 1000 – 2000 µs (aceita os 3,3 V do Pi)'], ['Firmware', 'BLHeli_S ou SimonK (Bluejay não serve: só aceita DShot)'], ['Posição', 'De pé, colados com fita dupla face por dentro das paredes, ao lado do servo']],
    nota: 'O fio vermelho do plugue do ESC (5 V) não vai no Pi: ligue só o sinal e o GND.' },
  lipo: { nome: 'Bateria LiPo 2S 850 mAh (só da turbina)', qtd: '1×', cat: 'eletronica', tipo: 'Comprado', cor: '#1d3f8a', fonte: 'extra',
    func: 'Energia só da turbina: os motores do Neo 2 puxam muito mais corrente do que o power bank dá. Fica no teto, presa com 2 fitas de velcro pelos rasgos do rack.',
    specs: [['Tensão', '7,4 V (2S)'], ['Capacidade', '850 mAh, 25 – 30C'], ['Medidas', '≈ 58 × 30 × 13 mm, ≈ 50 g'], ['Conector', 'XT30: é a chave geral da turbina'], ['Carga', 'Só com carregador de LiPo com balanceamento']],
    nota: 'Não descarregue abaixo de 3,5 V por célula e não deixe carregando sem ninguém olhando.' },
  parafusos: { nome: 'Parafusos M3, M4 e M2,5', qtd: '—', cat: 'fixacao', tipo: 'Comprado', cor: '#c7cbcf', fonte: 'extra',
    func: 'Poucos parafusos: quase tudo é encaixe colado. Eles ficam nos motores, nas barras de direção, no teto, no Pi e no pivô da travessa.',
    specs: [['Cabeça panela M3', '—'], ['Outros', '—'], ['Ferramentas', 'Chave Phillips pequena e chave Allen de 3 mm']] },
  porcas: { nome: 'Porcas e arruelas', qtd: '—', cat: 'fixacao', tipo: 'Comprado', cor: '#c7cbcf', fonte: 'extra',
    func: 'Porcas M3 cativas nas placas dos motores e nas fendas T do teto, autotravantes nos pivôs.',
    specs: [['Porca M3', '—'], ['Autotravante', '—'], ['Outras', '—']] },
};

const BOM = [
  ['Chapa de MDF cru 3 mm, 60 × 40 cm', '1 (+1 de reserva)', 'Todas as 54 peças cabem numa chapa · corte a laser (~18 m de corte)', null],
  ['Motor TT (amarelo, eixo duplo)', '4', '3 – 6 V · você já tem', 'motor'],
  ['Ponte H L9110S', '1', '2 canais · você já tem', 'driver'],
  ['Raspberry Pi Zero 2 W', '1', 'Controle e IA (AutoGPT)', 'pi'],
  ['Servo MG90S', '1', 'Direção (engrenagens de metal)', 'servo'],
  ['Webcam USB Full HD', '1', 'Visão em tempo real · corpo 70 × 26 × 23 mm', 'webcam'],
  ['Power Bank Kaidi KD-998', '1', '10.000 mAh (5 V)', 'powerbank'],
  ['Rodas amarelas (Ø 68 mm)', '4', 'Compatíveis com eixo TT · você já tem', 'rodas'],
  ['Parafusos M3, M4 e M2,5', '—', 'Lista exata na aba Encaixes', 'parafusos'],
  ['Porcas e arruelas', '—', 'Lista exata na aba Encaixes', 'porcas'],
  ['Cola branca PVA (cola de madeira)', '1 frasco pequeno', 'Para todos os encaixes de MDF', null],
  ['Lixa 220 + verniz ou tinta spray', '—', 'Lixe o queimado das bordas que encaixam e sele o MDF contra umidade', null],
  ['Abraçadeiras de nylon pequenas', '2', 'Prendem a L9110S na prateleira', null],
  ['Parafina ou grafite em pó', 'um pouco', 'Nos pinos das mangas e no pivô da travessa', null],
  ['Kit de sucção', '—', 'Lista completa com preços na aba Sucção', 'cano'],
];
const EXTRAS = [
  ['Cartão microSD (16 GB ou mais)', 'Sistema do Raspberry Pi'],
  ['Barra de pinos 2×20', 'O GPIO do Pi Zero 2 W vem sem pinos soldados'],
  ['Adaptador OTG micro-USB → USB-A', 'Para ligar a webcam no Pi'],
  ['2 cabos USB', 'Um USB-C para micro-USB (Pi) e um qualquer para cortar e alimentar a L9110S'],
  ['Fio vermelho e preto', 'Cerca de 1,2 m de cada para os 4 motores (os da frente sobem até o teto)'],
  ['Jumpers fêmea-fêmea (≈ 8)', 'GPIO → L9110S e servo'],
  ['Capacitor 470–1000 µF (≥ 10 V)', 'Perto da L9110S, segura a tensão quando os motores arrancam'],
  ['Chave liga/desliga', 'Corta a energia dos motores'],
];
const SPECS = [
  ['Tração', '4×4 (4 motores TT, roda direto no eixo)'], ['Direção', 'Ackermann (servo MG90S, motores da frente viram junto com a roda)'], ['Material', 'MDF 3 mm em tudo: 1 chapa de 60 × 40 cm, corte a laser'],
  ['Controle', 'Raspberry Pi Zero 2 W (IA + controle)'], ['Visão', 'Webcam USB (tempo real)'], ['Alimentação', 'Power Bank Kaidi KD-998 – 10.000 mAh'], ['Driver', 'Ponte H L9110S (2 canais)'],
  ['Velocidade (teórica)', '≈ 2,56 km/h a 6 V · ≈ 2,2 km/h com 5 V'], ['Autonomia (estimada)', '≈ 2,5 – 6 h (uso variável)'],
  ['Peso (estimado)', '≈ 0,95 kg (0,83 kg sem a turbina de sucção)'], ['Sucção', 'Turbina de 2 motores do DJI Neo 2: ≈ 0,8 kg puxando para baixo (estimado)'], ['Medidas', '233 × 202 × 101 mm (152 mm com a webcam)'],
];
const FEATURES = [
  ['4×4', 'Tração integral (4 motores TT)', 'i4x4'], ['100% MDF', '1 chapa de 60 × 40 cm, corte a laser', 'imdf'],
  ['Direção Ackermann', 'Servo MG90S', 'iwheel'], ['Visão em tempo real', 'Webcam USB', 'icam'],
  ['Raspberry Pi Zero 2 W', 'Controle + IA', 'ipi'], ['Power Bank Kaidi KD-998', '10.000 mAh', 'ibatt'], ['Controle VR', 'Meta Quest 3S', 'ivr'], ['Sucção', '≈ 0,8 kg pra baixo', 'ifan'],
];
const CHECKS = [
  ['ok', 'Tudo cabe numa chapa', '54 peças (29 desenhos diferentes) numa chapa de 60 × 40 cm, com 51% de aproveitamento. São ~18 m de corte, uns 15 a 20 min de laser. Nenhuma peça passa de 21,6 × 15 cm: cabe até em laser pequeno de 30 × 20 cm.'],
  ['ok', 'Velocidade confere', 'π × 68 mm × 200 RPM = 2,56 km/h (TT a 6 V, sem carga). Com os 5 V do power bank na L9110S, ~170 RPM e ~2,2 km/h.'],
  ['ok', 'Ligação de direção real', 'Servo → 2 barras de MDF de 48,4 mm → braços de 26 mm a 12°. Com 30° na roda de dentro, a de fora fica em 21,9° (ideal pelos pinos-mestres: 22,1°); o servo gira só 25°.'],
  ['ok', 'Nada encosta em nenhuma posição', 'Varredura com a direção de ponta a ponta e a travessa em ±7°: mangas, motores, rodas, barras, chassi, paredes, prateleira e teto não se tocam (checagem por malha 3D).'],
  ['ok', 'Motor da frente vira junto', 'O pino-mestre fica no plano do meio do motor TT, 26 mm para dentro do centro da roda. Com isso o motor em pé gira quase no lugar e não precisa de junta universal.'],
  ['warn', 'Espessura do MDF varia', 'MDF "3 mm" pode vir de 2,7 a 3,2 mm. Corte primeiro a peça de teste (TESTE) e veja qual rasgo encaixa justo. Se precisar, peça para a loja compensar o corte.'],
  ['warn', 'Pinos de MDF gastam', 'As mangas giram em pinos de MDF Ø8 em furos Ø8,4. Passe parafina ou grafite. Se gastarem, troque o pino por um parafuso M8 curto ou um pedaço de vareta de 8 mm.'],
  ['warn', 'MDF e água', 'MDF cru incha com umidade. Passe verniz, seladora ou tinta spray antes de montar e evite poças e grama molhada.'],
  ['warn', '2 motores por canal na L9110S', 'Cada canal aguenta ~800 mA contínuos. Rodando, 2 TT puxam ~0,3 – 0,5 A; travados, até ~3 A: a placa esquenta e pode desligar. Evite travar as rodas e acelere aos poucos (rampa no PWM).'],
  ['warn', 'Servo parado é o pior caso', 'Com o pino-mestre a 26 mm do centro da roda, virar o rover parado arrasta o pneu: ~0,12 N·m nas duas rodas, perto do limite do MG90S (~0,18 N·m). Andando, vira fácil. Prefira esterçar em movimento.'],
  ['warn', 'Pi e motores na mesma bateria', 'Picos de corrente dos motores podem reiniciar o Pi. Use USB-C só para o Pi e USB-A para L9110S e servo, GND comum e um capacitor de 470–1000 µF na L9110S.'],
  ['info', 'Por que não tem mais câmbio', 'Engrenagem pequena, mola e rolamento não dão para fazer em MDF. A roda vai direto no eixo do TT, que já tem redução de 1:48 dentro da caixa amarela.'],
  ['info', 'Suspensão basculante', '±7° na bitola de 176 mm = ±10,7 mm por roda. As 4 rodas ficam no chão com até ~21,5 mm de desnível entre as rodas traseiras.'],
  ['info', 'Diferencial eletrônico', 'Na curva máxima, o lado de dentro percorre um raio ~35% menor. Como cada lado tem um canal da L9110S, o Pi pode baixar o PWM do lado interno.'],
  ['ok', 'A turbina cabe no lugar', 'O cano Ø50 fica entre o garfo da travessa (3,2 mm) e o suporte do servo (2 mm), 8 mm abaixo da bandeja do power bank, e as asas da saia passam a 12 mm das rodas com a direção toda virada. Checagem por malha 3D em todas as posições.'],
  ['ok', 'A chapa 1 não muda', 'As peças novas (2 cruzetas SM e 2 asas SA) vão numa chapinha separada. O furo Ø31 que o chassi já tem é a entrada de ar da turbina.'],
  ['info', 'Quanto a sucção puxa', 'Força = depressão × área. Com 243 cm² de saia e 200 a 450 Pa de depressão (estimativa para 2 hélices de 45 mm em série), são 0,5 a 1,1 kg puxando o rover contra o chão: perto do peso dele (~0,95 kg). Na prática: quase o dobro de aderência na curva e rampa bem mais inclinada.'],
  ['warn', 'Não anda de cabeça para baixo', 'Para grudar no teto a força teria que passar do peso com folga; para subir parede lisa, precisaria de ~1,2 kg. Com ~0,8 kg isso não acontece. Use a sucção para curva, rampa e arrancada.'],
  ['warn', 'O piso faz diferença', 'A saia de EVA veda bem em piso liso (cerâmica, madeira, mesa). Em grama, terra ou carpete o ar entra por baixo da saia e a força cai muito.'],
  ['warn', 'LiPo pede cuidado', 'Carregue só com carregador de LiPo com balanceamento, nunca abaixo de 3,5 V por célula, e solte o XT30 quando não estiver usando.'],
  ['info', 'Autonomia plausível', '37 Wh nominais dão ≈ 31 Wh úteis a 5 V. Com 5–8 W rodando (Pi + webcam + motores), são 4–6 h; em uso pesado, perto de 2,5 h.'],
];
const WEIGHT = [['Peças de MDF (1 chapa)', 265], ['Sucção: LiPo, ESCs, motores, cano, saia', 120], ['Power bank', 220], ['4 motores TT', 120], ['4 rodas', 100], ['Webcam', 50], ['Servo MG90S', 13], ['Raspberry Pi Zero 2 W', 10], ['Ponte H L9110S', 5], ['Parafusos, cola e cabos', 50]];
const PINS = [
  ['GPIO12', '32', 'L9110S A-IA', 'PWM do lado esquerdo'], ['GPIO5', '29', 'L9110S A-IB', 'Sentido do lado esquerdo'],
  ['GPIO13', '33', 'L9110S B-IA', 'PWM do lado direito'], ['GPIO6', '31', 'L9110S B-IB', 'Sentido do lado direito'],
  ['GPIO18', '12', 'Servo MG90S (laranja)', 'PWM 50 Hz da direção'], ['GND', '34', 'GND da L9110S e do servo', 'Terra comum'],
  ['GPIO23', '16', 'ESC do motor de baixo (sinal)', 'PWM 50 Hz da turbina'], ['GPIO24', '18', 'ESC do motor de cima (sinal)', 'PWM 50 Hz da turbina'], ['GND', '14', 'GND dos 2 ESCs', 'O fio vermelho dos ESCs não liga'],
];

/* ---------- fixação, juntas e tolerâncias ---------- */
const FNAME = { shcs: 'Parafuso M4 cabeça cilíndrica (ISO 4762)', nyloc: 'Porca M4 autotravante (ISO 10511)', washer: 'Arruela M4 (ISO 7089)', p3: 'Parafuso M3 cabeça panela Phillips', n3: 'Porca M3', y3: 'Porca M3 autotravante', p25: 'Parafuso M2,5 cabeça panela', n25: 'Porca M2,5', m2: 'Parafuso M2 × 8 do servo (vem com o MG90S)' };
const BOUGHT = ['p3', 'shcs', 'p25', 'n3', 'y3', 'nyloc', 'n25', 'washer'];
const fname = (t, L) => (t === 'shcs' || t === 'p3' || t === 'p25') ? FNAME[t].replace(/M(\d(,\d)?)/, `M$1 × ${L}`) : (FNAME[t] || t);
const JOINTS = {
  J01: { nome: 'Pivô da travessa basculante', n: 1, fix: [['shcs', 35, 1], ['nyloc', 0, 1], ['washer', 0, 2]], enc: 'O M4 atravessa as 2 bochechas do garfo e a viga de 4 camadas; uma arruela de 0,8 mm de cada lado da viga.', tq: 'Encostar e voltar 1/8 de volta: a travessa tem que cair sozinha de um lado para o outro' },
  J02: { nome: 'Motor TT → placa (manga ou travessa)', n: 4, fix: [['p3', 25, 2], ['n3', 0, 2]], enc: 'Cabeça do lado da roda (2,4 mm, livre do aro), parafuso pelos furos do próprio TT e porca cativa no sextavado da camada de dentro. Nada passa da placa.', tq: 'Firme, sem esmagar a caixa do TT' },
  J03: { nome: 'Barras de direção → braço do servo', n: 1, fix: [['p3', 12, 2], ['y3', 0, 2]], enc: 'Barra deitada por cima do braço de MDF; autotravante por baixo.', tq: 'Giro livre sem folga' },
  J04: { nome: 'Barra de direção → braço da manga', n: 2, fix: [['p3', 16, 1], ['y3', 0, 1]], enc: 'Barra por cima do braço de 2 camadas; a autotravante fica fora da placa da manga.', tq: 'Giro livre sem folga' },
  J05: { nome: 'Servo → suporte', n: 1, fix: [['m2', 8, 2]], enc: 'Corpo pelo recorte da placa, abas por cima e os 2 parafusos M2 do próprio servo nos furos-guia Ø1,6.', tq: 'Encostar' },
  J06: { nome: 'Teto → paredes (removível)', n: 1, fix: [['p3', 16, 4], ['n3', 0, 4]], enc: 'Porca M3 entra de lado na fenda T da parede; o parafuso desce pelo teto. Encaixe as abas das paredes nos rasgos do teto e os pinos de cima das mangas nos furos das asas antes de apertar.', tq: 'Firme' },
  J07: { nome: 'Raspberry Pi → prateleira', n: 1, fix: [['p25', 10, 4], ['n25', 0, 4]], enc: 'Espaçador de MDF de 3 mm em cada furo; porca por baixo da prateleira.', tq: 'Encostar' },
  C1: { nome: 'Chassi: 2 camadas', n: 1, fix: [], enc: 'Cola branca em toda a face; alinhe pelos rasgos.', tq: 'Peso em cima por 1 h' },
  C2: { nome: 'Paredes, painel traseiro, garfo e suporte do servo → chassi', n: 1, fix: [], enc: 'Abas de 6 mm atravessam as 2 camadas do chassi e ficam rentes embaixo. Cola branca.', tq: 'Confira o esquadro antes de secar' },
  C3: { nome: 'Prateleira, bandeja do power bank e para-choque', n: 1, fix: [], enc: 'Abas nos rasgos das paredes (prateleira e bandeja) e abas do chassi nos rasgos do para-choque. Cola branca.', tq: '—' },
  C4: { nome: 'Mangas e travessa (subconjuntos colados)', n: 1, fix: [], enc: 'Placas de 2 camadas, fundo, orelha e braço nas mangas; viga de 4 camadas nas placas dos motores. Cola branca.', tq: 'Monte os motores só depois da cola seca' },
  P1: { nome: 'Pivôs das mangas (pinos de MDF)', n: 2, fix: [], enc: 'Pino Ø8 colado embaixo do fundo e outro em cima da orelha. Giram nos furos Ø8,4 da língua do chassi e da asa do teto.', tq: 'Parafina; folga vertical de 0,1 mm' },
};
const STEPS = [
  ['Chassi', 'Lixe de leve o queimado das bordas que encaixam. Cole as 2 camadas (CH1 por cima, CH2 por baixo) alinhadas pelos rasgos e deixe secar com peso em cima.'],
  ['Garfo do pivô e suporte do servo', 'Cole as bochechas do garfo (2 camadas cada, GP) e as 2 paredes do suporte do servo (SW) nos rasgos do chassi. Cole a placa do suporte (SS) por cima das paredes.'],
  ['Travessa traseira com os motores', 'Cole as 4 camadas da viga (VB) e as placas dos motores (PM1 por fora, PM2 por dentro) nas pontas. Com a cola seca, ponha 2 porcas M3 nos sextavados de cada PM2 e prenda os motores TT deitados com M3 × 25. Monte o pivô: M4 × 35, uma arruela de cada lado da viga e autotravante. Passe a viga pelas janelas das paredes no passo 5.'],
  ['Servo', 'Desça o MG90S pelo recorte da placa do suporte e prenda as abas com os 2 parafusos M2 que vêm com ele. Centralize o servo (pulso de 1,5 ms) e parafuse o braço de MDF (BS) por cima do braço duplo do servo, apontando para a frente.'],
  ['Paredes e painel traseiro', 'Encaixe a viga da travessa nas janelas e cole as 2 paredes (PL-D à direita e PL-E à esquerda, logotipo para fora) e o painel traseiro (TR) nos rasgos do chassi. Confira o esquadro.'],
  ['Turbina de sucção', 'No cano: 2 furos Ø4 (a 6 mm da base e a 5 mm da boca) e um entalhe de 10 × 10,5 mm na boca. Prenda um motor em pé numa cruzeta (SM) e o outro pendurado na outra; hélice CCW no de baixo e CW no de cima, as duas com a escrita para baixo. Passe os fios pelos furos, empurre as cruzetas (uma rente à base, outra rente à boca) e cole os braços. Cole o cano em cima do furo do chassi com o entalhe na porca do pivô da travessa e passe cola quente em volta toda. Cole os 2 ESCs de pé por dentro das paredes, ao lado do servo, e solde os 3 fios de cada motor.'],
  ['Prateleira e bandeja do power bank', 'Cole a prateleira (PR) e a bandeja do power bank (BP) nos rasgos das paredes.'],
  ['Raspberry Pi e L9110S', 'Pi sobre 4 espaçadores de MDF (ES) com M2,5 × 10 e porcas por baixo. L9110S presa com 2 abraçadeiras pelos rasgos da prateleira.'],
  ['Mangas e barras de direção', 'Cole cada manga: placa de 2 camadas (MV1 por fora, MV2 por dentro), fundo (MB), orelha de cima (MT), braço de 2 camadas (MA) e os 2 pinos (MP). Prenda o motor TT em pé (M3 × 25, porcas cativas na MV2). Encaixe o pino de baixo no furo da língua do chassi e ligue as barras (BD): M3 × 12 no servo e M3 × 16 nas mangas, com autotravantes.'],
  ['Power bank', 'Deite o power bank na bandeja com as saídas para a frente e passe as 2 travessas (TB) pelas fendas das paredes.'],
  ['Teto, para-choque e antena', 'Ponha 4 porcas M3 nas fendas T das paredes. Desça o teto (TE) encaixando os pinos de cima das mangas nos furos das asas e as abas das paredes nos rasgos, e aperte os 4 × M3 × 16. Cole o para-choque (2 camadas, PC) nas abas do chassi e a antena (AN) no rasgo do teto.'],
  ['Webcam', 'Cole o bolsão (WC) na frente do teto e a ponte em U (WP) nos rasgos. Feche a base da webcam (clipe dobrado) e empurre-a por baixo da ponte, com a lente para a frente. Passe o cabo pelo furo do teto.'],
  ['Fiação e rodas', 'Ligue os cabos conforme o diagrama elétrico (os fios dos motores da frente com folga para a curva) e encaixe as rodas direto nos eixos dos TT, com o parafuso da roda.'],
  ['Saia e bateria da turbina', 'Vire o rover e cole as 2 asas (SA) embaixo do chassi, rentes às laterais. Cole as tiras de EVA em volta: 15 mm de altura no chassi e 12 mm nas asas, a ~1 mm do chão. No teto, prenda a LiPo com 2 fitas de velcro pelos rasgos do rack e desça o cabo do XT30 pelo rasgo da frente até os 2 ESCs. Sinais dos ESCs no GPIO23 (pino 16) e GPIO24 (pino 18), GND no pino 14. Teste primeiro sem as hélices.'],
];
const TOL = [
  ['Espessura do MDF', '3,0 mm', 'Meça a chapa; corte a peça de teste antes de tudo'],
  ['Rasgo para aba de MDF', '3,0 mm no desenho (~3,1 – 3,2 depois do laser)', 'Justo com cola branca'],
  ['Aba de 2 camadas', '6,0 mm', 'Atravessa as 2 camadas do chassi e fica rente embaixo'],
  ['Furo para M4', 'Ø4,4 mm', 'Pivô da travessa e pinos de MDF'],
  ['Furo para M3', 'Ø3,4 mm', 'Motores, barras de direção e teto'],
  ['Porca cativa M3', 'Sextavado 5,6 mm entre faces', 'A porca de 5,5 × 2,4 entra com o dedo e não gira'],
  ['Fenda T do teto', 'Rasgo 3,4 × 14 mm + janela 5,6 × 2,6 mm', 'A porca M3 entra de lado'],
  ['Pino da manga', 'Ø8,0 em furo Ø8,4', 'Gira livre; passe parafina'],
  ['Folga vertical da manga', '0,1 mm', 'Se prender, lixe o fundo da manga; se ficar folgada, ponha uma arruela'],
  ['Furo M2,5 (Pi)', 'Ø2,7 mm', 'Com espaçador de MDF de 3 mm'],
  ['Furo-guia M2 (servo)', 'Ø1,6 mm', 'O parafuso do servo forma a rosca no MDF'],
  ['Recorte do servo', '23,1 × 12,5 mm', 'O corpo de 22,8 × 12,2 mm entra por cima'],
  ['Bolsão da webcam', '35,5 × 54 mm + ponte em U de 39,6 × 16,2 mm', 'A ponte trava a base dobrada com 0,4 mm de pressão'],
  ['Eixo do TT na roda', '~5 mm de encaixe', 'Use o parafuso da roda'],
  ['Peças que se movem', '≥ 0,8 mm', 'Mangas, travessa, barras e motores'],
  ['Largura do corte (kerf)', '0,1 – 0,2 mm', 'A loja pode compensar; a peça de teste mostra se precisa'],
];

// contagens de fixadores sempre derivadas da tabela de juntas
{
  const tot = {};
  for (const j of Object.values(JOINTS)) for (const [t, L, n] of j.fix) { const k = t + '|' + L; tot[k] = (tot[k] || 0) + n * j.n; }
  const list = t => Object.keys(tot).filter(k => k.split('|')[0] === t).map(k => [+k.split('|')[1], tot[k]]).sort((a, b) => a[0] - b[0]);
  const sum = ts => Object.entries(tot).filter(([k]) => ts.includes(k.split('|')[0])).reduce((a, [, n]) => a + n, 0);
  PARTS.parafusos.qtd = String(sum(['p3', 'shcs', 'p25']));
  PARTS.parafusos.specs[0][1] = list('p3').map(([L, n], i) => `${i ? '×' : 'M3 ×'} ${L} (${n})`).join(', ');
  PARTS.parafusos.specs[1][1] = `M4 × 35 cabeça cilíndrica (${sum(['shcs'])}) · M2,5 × 10 cabeça panela (${sum(['p25'])}) · os 2 M2 vêm com o servo`;
  PARTS.porcas.qtd = String(sum(['n3', 'y3', 'nyloc', 'n25', 'washer']));
  PARTS.porcas.specs[0][1] = `${sum(['n3'])} (8 cativas nas placas dos motores + 4 nas fendas T do teto)`;
  PARTS.porcas.specs[1][1] = `${sum(['y3'])} × M3 (barras de direção) + ${sum(['nyloc'])} × M4 (pivô)`;
  PARTS.porcas.specs[2][1] = `${sum(['n25'])} porcas M2,5 (Pi) · ${sum(['washer'])} arruelas M4 (pivô)`;
}
