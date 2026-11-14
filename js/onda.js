// Atena Lab — la onda de la portada.
// Un haz de líneas finísimas entra en abanico desde abajo a la izquierda, se aprieta en un
// nudo de luz y sale hacia la derecha convertido en una superficie de puntos que se curva:
// diseño → inteligencia → tecnología.
//
// La forma son dos hojas que se cruzan en el nudo:
//   · la hoja principal: a la izquierda, el abanico bajo el pliegue brillante; a la derecha,
//     la superficie de puntos entre el borde de arriba (la cresta) y el filo de abajo;
//   · el envés: a la izquierda, las líneas tenues que se abren por encima del pliegue;
//     a la derecha, los puntos sueltos que cuelgan por debajo del filo.
// Cada punto (y cada muestra de línea) es una partícula con su «casa» sobre la forma, más un
// desplazamiento y una velocidad propios: el puntero las empuja, el clic lanza una onda de
// choque, y todas vuelven a casa con un resorte amortiguado.
//
// Se dibuja con WebGL (sin bibliotecas); si el navegador no lo tiene, con Canvas 2D.
// Para probar ajustes en vivo, en la consola: atenaOnda.P (parámetros) y atenaOnda.info() (medidas).
(() => {
  let canvas = document.getElementById('onda');
  if (!canvas) return;
  let gl = null, ctx = null; // se dibuja con WebGL; si no hay, con Canvas 2D
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────────────────────── Parámetros (ajustables) ─────────────────────────
  // Las medidas «de diseño» van de 0 a 1: x sobre el ancho de la portada, y sobre el alto.
  const P = {
    // — Forma: curvas de control como listas de puntos [x, y], de izquierda a derecha —
    // Arriba de la hoja principal: el pliegue brillante del abanico → nudo → arco hasta la cresta.
    supPrincipal: [
      [-0.13, 0.975], [-0.05, 0.950], [0.05, 0.917], [0.10, 0.900], [0.14, 0.884], [0.18, 0.868],
      [0.22, 0.852], [0.26, 0.834], [0.30, 0.816], [0.34, 0.795], [0.38, 0.771], [0.405, 0.754],
      [0.42, 0.737], [0.44, 0.710], [0.46, 0.682], [0.48, 0.654], [0.50, 0.628], [0.52, 0.602],
      [0.54, 0.574], [0.56, 0.543], [0.58, 0.513], [0.60, 0.483], [0.62, 0.451], [0.64, 0.417],
      [0.67, 0.370], [0.70, 0.330], [0.73, 0.295], [0.76, 0.264], [0.79, 0.238], [0.82, 0.218],
      [0.85, 0.203], [0.88, 0.192], [0.91, 0.186], [0.946, 0.183], [1.00, 0.189], [1.08, 0.215],
      [1.21, 0.280],
    ],
    // Abajo de la hoja principal: la línea más empinada del abanico → nudo → filo brillante.
    infPrincipal: [
      [-0.13, 1.600], [0.20, 1.105], [0.27, 1.000], [0.30, 0.955], [0.33, 0.908], [0.36, 0.862],
      [0.38, 0.831], [0.40, 0.804], [0.42, 0.780], [0.44, 0.759], [0.46, 0.742], [0.48, 0.729],
      [0.50, 0.718], [0.52, 0.709], [0.55, 0.697], [0.58, 0.684], [0.61, 0.673], [0.64, 0.666],
      [0.67, 0.664], [0.70, 0.669], [0.73, 0.678], [0.76, 0.692], [0.79, 0.708], [0.82, 0.729],
      [0.85, 0.752], [0.88, 0.779], [0.91, 0.807], [0.94, 0.839], [0.97, 0.870], [1.00, 0.900],
      [1.08, 0.985], [1.21, 1.120],
    ],
    // Línea más alta del envés, a la izquierda del nudo (las líneas tenues de arriba del abanico).
    supEnves: [
      [-0.13, 0.675], [0.00, 0.680], [0.15, 0.690], [0.22, 0.700], [0.25, 0.706], [0.30, 0.720],
      [0.35, 0.734], [0.38, 0.743], [0.405, 0.754],
    ],
    cruce: [0.398, 0.462],     // tramo de x donde el envés cruza la hoja principal (el nudo)
    nudo: [0.44, 0.725],       // centro del nudo (para el halo y como eje de las deformaciones)

    // — Líneas —
    hilos: 38,                 // hilos de la hoja principal: líneas a la izquierda, filas de puntos a la derecha
    hilosEnves: 14,            // hilos del envés
    muestras: 96,              // partículas por línea
    grosor: 1.2,               // grosor de línea en px
    abanico: 1.35,             // > 1: las líneas del abanico se juntan hacia el pliegue
    ondulacion: 0.004,         // vaivén de las líneas del envés
    aPuntos: [0.50, 0.63],     // tramo de x donde las líneas se apagan y quedan los puntos
    resplandor: 0.14,          // brillo difuso a lo largo de los dos bordes
    nucleo: 0.32,              // blanco macizo del nudo (0 = solo líneas)

    // — Superficie de puntos (tramo derecho) —
    puntosX: [0.47, 1.16],     // de dónde a dónde corren las filas de puntos
    puntosCentro: 140,         // puntos por fila en el centro de la superficie
    puntosBorde: 340,          // puntos por fila en los bordes (diminutos y juntos: parecen línea)
    crecerCentro: 0.20,        // menor = los puntos se separan más al alejarse del nudo (centro)
    crecerBorde: 1.5,          // ídem en los bordes (grande = casi parejos)
    pliegue: 0.64,             // cuánto se aprietan las filas contra los dos bordes (0 = parejas)
    radio: [0.5, 2.8],         // radio del punto: mínimo, y lo que crece lejos del nudo
    bajoAncho: 0.17,           // hasta dónde cuelga el envés bajo el filo en el borde derecho
    puntosBajo: 64,            // puntos por fila del envés
    radioBajo: 2.1,            // radio de los puntos del envés
    dispersion: 0.45,          // cuántos puntos se apagan al azar en el extremo derecho
    temblor: 3.5,              // desorden (px) de los puntos en el extremo derecho

    // — Movimiento propio —
    velocidad: 0.35,           // reloj general
    deriva: 0.010,             // los puntos fluyen despacio hacia la derecha
    respiracion: 0.010,        // ondulación lenta de la superficie

    // — Halo del nudo —
    halo: 0.22,

    // — Mouse: empuje local —
    empuje: {
      radio: 0.15,             // radio de influencia, como fracción del lado menor de la pantalla
      fuerza: 0.42,            // cuánto se apartan (fracción del radio)
      arrastre: 0.05,          // cuánto las arrastra la velocidad del puntero
      brillo: 0.5,             // cuánto se iluminan las partículas empujadas
    },
    // — Resorte de vuelta a casa —
    resorte: {
      rigidez: 110,            // fuerza con que vuelven (más = vuelven antes)
      amortiguacion: 0.85,     // 1 = sin rebote
      ataque: 3.5,             // al recibir un empujón responden este tanto más rápido de lo que vuelven
    },
    // — Mouse: deformación de toda la forma (como la figura que cambia de proporción) —
    forma: {
      amplitud: 0.16,          // puntero arriba/abajo: la cresta sube o baja
      estirar: 0.07,           // puntero a los lados: la forma se estira o se encoge
      torsion: 0.30,           // puntero a los lados: las filas ruedan hacia un borde u otro
      abanico: 0.12,           // puntero arriba/abajo: el abanico se abre o se cierra
      suavidad: 0.22,          // segundos que tarda en seguir al puntero
      ecos: [0.5, 0.85, 1.3],  // retraso (s) de cada eco de la silueta
      ecoAlfa: 0.16,           // opacidad máxima de los ecos
    },
    // — Clic o toque: onda de choque —
    choque: {
      velocidad: 0.72,         // avance del anillo por segundo, en diagonales de pantalla
      ancho: 0.045,            // grosor del anillo, en diagonales
      fuerza: 0.02,            // desplazamiento que provoca, en diagonales
      brillo: 1.6,             // cuánto ilumina a su paso
      vida: 1.3,               // segundos que dura
      maximo: 6,               // ondas que conviven
    },

    // — Rendimiento: si el equipo no da abasto, se pintan menos puntos —
    rendimiento: {
      presupuesto: 11,         // ms de cálculo por cuadro que se toleran (un cuadro a 60 por segundo dura 16,7)
      calidadMinima: 0.4,      // hasta qué fracción de los puntos se puede bajar
    },

    // — Celular (ancho < 760): el patrón abajo y el titular arriba —
    celular: {
      desde: 0.31, ventana: 0.70, // franja de x del diseño que se muestra
      alto: 0.585,                // fracción inferior de la pantalla que ocupa el patrón
      escala: 0.6,                // tamaño de puntos y líneas
      hilos: 26, hilosEnves: 12, muestras: 70, densidad: 0.5, // menos partículas
    },
  };

  // ───────────────────────────── Utilidades ─────────────────────────────
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  // Azar repetible: el patrón sale igual en cada carga
  let semilla = 20261114;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; };

  // Curva suave y(x) que pasa por una lista de puntos (Hermite cúbica)
  function curva(pts) {
    const n = pts.length, m = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? (pts[i][1] - pts[i - 1][1]) / (pts[i][0] - pts[i - 1][0]) : null;
      const b = i < n - 1 ? (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]) : null;
      m[i] = a === null ? b : b === null ? a : (a + b) / 2;
    }
    return x => {
      let i = 0;
      while (i < n - 2 && x > pts[i + 1][0]) i++;
      const x0 = pts[i][0], x1 = pts[i + 1][0], h = x1 - x0, u = (x - x0) / h;
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * pts[i][1] + (u3 - 2 * u2 + u) * h * m[i]
           + (-2 * u3 + 3 * u2) * pts[i + 1][1] + (u3 - u2) * h * m[i + 1];
    };
  }

  // Tablas en x (se consultan por interpolación: mucho más barato que evaluar las curvas)
  const K = 400, XA = -0.13, XB = 1.21, KINV = K / (XB - XA);
  const tabla = () => new Float32Array(K + 2);
  const S0 = tabla(), I0 = tabla(), U0 = tabla(); // curvas en reposo: arriba, abajo, arriba del envés
  const MEZ = tabla();  // 0 = reparto de abanico (izquierda), 1 = reparto de superficie (derecha)
  const CRU = tabla();  // 0 = envés arriba del pliegue (izquierda), 1 = envés bajo el filo (derecha)
  const DER = tabla();  // peso de la parte derecha para las deformaciones
  const IZQ = tabla();  // peso del abanico
  const GX = tabla();   // crecimiento del punto al alejarse del nudo
  const ENT = tabla();  // aparición de los puntos junto al nudo
  const CAE = tabla();  // apagado al azar en el extremo derecho
  const TEM = tabla();  // desorden en el extremo derecho
  const BAJ = tabla();  // cuánto cuelga el envés bajo el filo
  {
    const cs = curva(P.supPrincipal), ci = curva(P.infPrincipal), cu = curva(P.supEnves);
    const xu = P.supEnves[P.supEnves.length - 1][0];
    for (let k = 0; k <= K + 1; k++) {
      const x = XA + k / KINV;
      S0[k] = cs(x); I0[k] = ci(x); U0[k] = x < xu ? cu(x) : S0[k];
      MEZ[k] = smooth(0.38, 0.56, x);
      CRU[k] = smooth(P.cruce[0], P.cruce[1], x);
      DER[k] = smooth(0.46, 0.82, x);
      IZQ[k] = 1 - smooth(0.26, 0.41, x);
      GX[k] = Math.pow(clamp01((x - 0.49) / 0.46), 0.8);
      ENT[k] = smooth(P.puntosX[0] + 0.005, P.puntosX[0] + 0.125, x);
      CAE[k] = P.dispersion * smooth(0.80, 1.04, x);
      TEM[k] = smooth(0.62, 1.05, x);
      BAJ[k] = P.bajoAncho * Math.pow(clamp01((x - 0.44) / 0.56), 0.9);
    }
  }
  // Curvas del cuadro actual (ya deformadas) y las de cada eco
  const St = tabla(), It = tabla(), Ut = tabla();
  const ONS = tabla(), ONC = tabla(); // seno y coseno de la respiración de la superficie, por columna
  const Se = tabla(), Ie = tabla();

  // ───────────────────────────── Estado ─────────────────────────────
  let W = 0, H = 0, dpr = 1, narrow = null, diag = 1;
  let sx = 1, sy = 1, ox = 0, oy = 0, esc = 1;   // paso de medidas de diseño a píxeles
  let t = 0, last = performance.now(), running = true;

  // Puntero (en píxeles del canvas)
  const ptr = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, on: false, fresh: false };
  // Deformación general: la actual y las de los ecos (cada una sigue al puntero con más retraso)
  const def = { x: 0, y: 0 };
  const ecos = P.forma.ecos.map(tau => ({ x: 0, y: 0, tau }));
  // Ondas de choque vivas
  const ondas = [];
  const oX = new Float32Array(8), oY = new Float32Array(8), oR = new Float32Array(8), oA = new Float32Array(8);
  const oLo = new Float32Array(8), oHi = new Float32Array(8);
  let nOndas = 0;
  let quieto = true; // nada desplazado: se puede saltar la física
  let calidad = 1;   // fracción de los puntos que se pinta (baja sola si el equipo va lento)

  // Líneas: nLin líneas de M muestras cada una
  let nLin = 0, nPri = 0, M = 0, nL = 0;       // nPri: cuántas líneas son de la hoja principal
  let hEnves, hSI, hSD, hW, hBorde;            // por línea: ¿envés?, reparto izq./der., posición, ¿borde?
  let lX, lA;                                  // por muestra: x de diseño y alfa
  let lhx, lhy, ldx, ldy, lvx, lvy, lgl, lpx, lpy;
  // Puntos: nFil filas, cada una con su número de puntos
  let nFil = 0, nD = 0;
  let fN, fIni, fQ, fTh, fEnves, fSI, fSD, fW, fG, fA, fFase, fNace; // por fila
  let dRx, dRy, dRz, dRk;                                     // azar fijo de cada punto
  let dhx, dhy, ddx, ddy, dvx, dvy, dgl, dal, dra;
  let dX, dK, dFr, dS, dTb;                                   // dónde va cada punto sobre su fila (paso lento)

  // Reparto de los hilos a lo ancho de la hoja principal
  const repIzq = w => Math.pow(w, P.abanico);                                             // abanico
  const repDer = w => w * (1 - P.pliegue) + P.pliegue * (1 - Math.cos(Math.PI * w)) / 2;  // superficie
  // Escorzo de la superficie: 1 en el centro (de frente), pequeño en los bordes (de canto)
  const escorzo = w => Math.sin(Math.PI * w);

  function construir() {
    semilla = 20261114;
    const c = P.celular;
    const dens = (narrow ? c.densidad : 1) * calidad;
    const nA = narrow ? c.hilos : P.hilos, nB = narrow ? c.hilosEnves : P.hilosEnves;
    nPri = nA; nLin = nA + nB;
    M = narrow ? c.muestras : P.muestras;
    nL = nLin * M;

    // — Líneas —
    hEnves = new Uint8Array(nLin); hSI = new Float32Array(nLin); hSD = new Float32Array(nLin);
    hW = new Float32Array(nLin); hBorde = new Uint8Array(nLin);
    lX = new Float32Array(nL); lA = new Float32Array(nL);
    lhx = new Float32Array(nL); lhy = new Float32Array(nL);
    ldx = new Float32Array(nL); ldy = new Float32Array(nL);
    lvx = new Float32Array(nL); lvy = new Float32Array(nL);
    lgl = new Float32Array(nL); lpx = new Float32Array(nL); lpy = new Float32Array(nL);
    const [p0, p1] = P.aPuntos;
    for (let l = 0, i = 0; l < nLin; l++) {
      const enves = l >= nA;
      const w = enves ? (l - nA) / (nB - 1) : l / (nA - 1);
      hEnves[l] = enves ? 1 : 0; hW[l] = w;
      let x0 = -0.03, x1 = p1 + 0.01, cola = 0; // cola: cuánto sigue la línea más allá de los puntos
      if (enves) {
        hSI[l] = w * 0.93;          // a la izquierda: de la línea más alta (0) hacia el pliegue (1)
        hSD[l] = 0.2 + 0.8 * w;     // a la derecha: cuánto cuelga bajo el filo
        x1 = 0.475;
      } else {
        hSI[l] = repIzq(w); hSD[l] = repDer(w);
        if (l === 0) { x1 = 0.92; cola = 1; hBorde[l] = 1; }                       // borde de arriba
        else if (l === nA - 1) { x1 = 1.10; cola = 1; hBorde[l] = 1; }             // el filo
        else if (l === nA - 2 || l === nA - 3) { x1 = 1.10; cola = 0.55; }         // dobles del filo
      }
      for (let k = 0; k < M; k++, i++) {
        const x = x0 + (x1 - x0) * k / (M - 1);
        lX[i] = x;
        let a;
        if (enves) {
          // tenues arriba, más vivas hacia el pliegue; las de arriba se apagan antes hacia la izquierda
          a = (0.2 + 0.5 * Math.pow(w, 1.3)) * smooth(0.17 - 0.17 * w, 0.35 - 0.22 * w, x);
          a += 0.4 * smooth(0.36, 0.41, x);
          a *= 1 - smooth(0.425, 0.468, x); // el envés se pierde dentro del nudo; a la derecha son solo puntos
        } else {
          // casi invisibles en el borde izquierdo, vivas al acercarse al nudo
          a = 0.07 + 0.88 * smooth(0.0, 0.25, x);
          if (l % 2 === 1) a *= smooth(0.27, 0.39, x);     // en el abanico solo corre una de cada dos
          if (l === 0) a *= 0.35 + 0.65 * smooth(0.12, 0.30, x); // el pliegue solo brilla cerca del nudo
          a += 0.25 * smooth(0.33, 0.43, x);               // el nudo: casi blanco puro
          const fin = 1 - smooth(p0, p1, x);
          if (cola > 0) {
            const lejos = l === 0 ? 1 - smooth(0.62, 0.90, x) : 1 - 0.35 * smooth(0.6, 1.0, x);
            a *= Math.max(fin, cola * lejos);
          } else a *= fin;
        }
        lA[i] = Math.min(1, a);
      }
    }

    // — Puntos —
    const filasB = Math.round(nB / 2);
    nFil = nA + filasB;
    fN = new Int32Array(nFil); fIni = new Int32Array(nFil + 1);
    fQ = new Float32Array(nFil); fTh = new Float32Array(nFil); fEnves = new Uint8Array(nFil);
    fSI = new Float32Array(nFil); fSD = new Float32Array(nFil); fW = new Float32Array(nFil);
    fG = new Float32Array(nFil); fA = new Float32Array(nFil); fFase = new Float32Array(nFil);
    fNace = new Float32Array(nFil);
    const lx = P.puntosX[1] - P.puntosX[0];
    nD = 0;
    for (let r = 0; r < nFil; r++) {
      let q;
      if (r < nA) {
        const w = r / (nA - 1), g = escorzo(w);
        fW[r] = w; fSI[r] = repIzq(w); fSD[r] = repDer(w); fG[r] = g;
        fN[r] = Math.round((P.puntosBorde + (P.puntosCentro - P.puntosBorde) * Math.pow(g, 0.7)) * dens);
        q = 1 / (1 / P.crecerBorde + (1 / P.crecerCentro - 1 / P.crecerBorde) * g);
        fA[r] = 0.8 + 0.2 * g;
      } else {
        const w = (r - nA + 0.5) / filasB; // 0..1 hacia abajo
        fEnves[r] = 1; fW[r] = w; fSD[r] = 0.2 + 0.8 * w;
        fG[r] = 0.9 + 0.2 * azar();
        fN[r] = Math.round(P.puntosBajo * (1 - 0.2 * w) * dens);
        q = 0.30;
        fA[r] = 0.95 - 0.25 * w;
        // una de cada tres filas nace junto al nudo; las demás, más lejos, cuando ya caben
        const j = r - nA;
        fNace[r] = j % 3 === 0 ? 0.497 + 0.012 * j : 0.60 + 0.02 * j;
      }
      fN[r] = Math.max(8, fN[r]);
      fQ[r] = q; fTh[r] = Math.atan(lx / q);
      fFase[r] = azar();          // cada fila arranca corrida: la trama no hace columnas
      fIni[r] = nD; nD += fN[r];
    }
    fIni[nFil] = nD;
    dRx = new Float32Array(nD); dRy = new Float32Array(nD); dRz = new Float32Array(nD); dRk = new Float32Array(nD);
    dhx = new Float32Array(nD); dhy = new Float32Array(nD);
    ddx = new Float32Array(nD); ddy = new Float32Array(nD);
    dvx = new Float32Array(nD); dvy = new Float32Array(nD);
    dgl = new Float32Array(nD); dal = new Float32Array(nD); dra = new Float32Array(nD);
    datosPuntos = new Float32Array(nD * 4);
    dX = new Float32Array(nD); dK = new Uint16Array(nD); dFr = new Float32Array(nD);
    dS = new Float32Array(nD); dTb = new Float32Array(nD);
    todasLasFilas = true;
    for (let i = 0; i < nD; i++) {
      dRx[i] = azar() * 2 - 1; dRy[i] = azar() * 2 - 1; dRz[i] = azar();
      dRk[i] = 0.8 + 0.4 * azar(); // cada punto vuelve a casa a su ritmo
    }
    quieto = true;
  }

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    diag = Math.hypot(W, H);
    const antes = narrow;
    narrow = W < 760;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height); else ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (narrow) {
      const c = P.celular;
      sx = W / c.ventana; ox = -c.desde * sx;
      sy = H * c.alto; oy = H - sy;
      esc = c.escala;
    } else {
      sx = W; ox = 0; sy = H; oy = 0;
      esc = Math.max(0.72, Math.min(1.35, W / 1706));
    }
    if (antes !== narrow) construir();
    todasLasFilas = true;
    if (gl) montarGL();
  }

  // ─────────────────────── La forma en cada cuadro ───────────────────────
  // Curvas deformadas por la respiración (tiempo) y por la posición del puntero (m)
  function curvas(m, S, I, U) {
    const f = P.forma, r = P.respiracion;
    for (let k = 0; k <= K + 1; k++) {
      const x = XA + k / KINV, d = DER[k], z = IZQ[k];
      const a = S0[k] + r * d * Math.sin(x * 5.1 - t * 0.9);
      const b = I0[k] + r * 0.45 * d * Math.sin(x * 4.2 - t * 0.7 + 1.3);
      const abre = 1 + f.abanico * m.y * z;
      S[k] = b + (a - b) * (1 - f.amplitud * m.y * d);  // la cresta sube o baja
      I[k] = a + (b - a) * abre;                         // el abanico se abre o se cierra
      if (U) { U[k] = a + (U0[k] - S0[k]) * abre; ONS[k] = Math.sin(x * 7.5 - t * 0.8); ONC[k] = Math.cos(x * 7.5 - t * 0.8); }
    }
  }

  // Altura de diseño de un hilo en la columna k de las tablas (fr = fracción entre k y k+1)
  function altura(k, fr, enves, sI, sD, tor) {
    const sup = St[k] + (St[k + 1] - St[k]) * fr, inf = It[k] + (It[k + 1] - It[k]) * fr;
    if (enves) {
      const cru = CRU[k];
      let y = 0;
      if (cru < 1) { const u = Ut[k] + (Ut[k + 1] - Ut[k]) * fr; y += (u + (sup - u) * sI) * (1 - cru); }
      if (cru > 0) y += (inf + sD * BAJ[k]) * cru;
      return y;
    }
    const mez = MEZ[k];
    let s = sI + (sD - sI) * mez;
    if (tor !== 0 && mez > 0.01) s = Math.pow(s, 1 + tor * mez);
    return sup + (inf - sup) * s;
  }

  function casaLineas() {
    let tor = P.forma.torsion * def.x; if (Math.abs(tor) < 0.002) tor = 0;
    const est = 1 + P.forma.estirar * def.x, xk = P.nudo[0], ond = P.ondulacion;
    for (let l = 0, i = 0; l < nLin; l++) {
      const enves = hEnves[l], sI = hSI[l], sD = hSD[l], w = hW[l];
      for (let j = 0; j < M; j++, i++) {
        const x = lX[i], q = (x - XA) * KINV, k = q | 0, fr = q - k;
        let y = altura(k, fr, enves, sI, sD, tor);
        // vaivén de las líneas del envés (crece al alejarse del nudo hacia la izquierda)
        if (enves) y += ond * (1 - CRU[k]) * (1 - 0.6 * w) * (1 - smooth(0.25, 0.40, x)) * Math.sin(x * 14 + w * 8 + t * 0.55);
        lhx[i] = ox + sx * (xk + (x - xk) * est);
        lhy[i] = oy + sy * y;
      }
    }
  }

  // Los puntos, en dos pasos. El lento decide en qué x de su fila va cada punto (fluyen muy
  // despacio), con su alfa y su radio: se rehace por turnos, una fila de cada cuatro por cuadro.
  // El rápido pone cada punto a la altura de la forma de este cuadro (que respira y sigue al puntero).
  function filaLenta(r) {
    const xp0 = P.puntosX[0];
    const xFin = (W + 14 - ox) / sx + 0.05; // más allá no se ve: ni se calcula
    const flujo = t * P.deriva, r0 = P.radio[0] * esc, r1 = P.radio[1] * esc;
    const tem = P.temblor * esc, rB = P.radioBajo * esc;
    const n = fN[r], q = fQ[r], th = fTh[r], sI = fSI[r], sD = fSD[r];
    const g = fG[r], enves = fEnves[r], aFila = fA[r], w = fW[r], nace = fNace[r];
    const off = flujo + fFase[r] / n, rg = r1 * Math.sqrt(g), tbFila = tem * (enves ? 1.6 : 0.3 + 0.7 * g);
    let i = fIni[r];
    for (let j = 0; j < n; j++, i++) {
      let f = j / n + off; f -= f | 0;
      const x = xp0 + q * Math.tan(th * f);
      if (x > xFin) { dal[i] = 0; continue; } // punto fuera de la vista
      const qq = (x - XA) * KINV, k = qq | 0;
      // alfa: aparecen junto al nudo, se apagan al final y, al azar, en el extremo derecho
      let a = aFila * (enves ? smooth(nace, nace + 0.03, x) : ENT[k]); // las filas del envés nacen escalonadas
      if (f > 0.93) a *= 1 - smooth(0.93, 0.99, f);
      const cae = CAE[k] + (enves ? 0.02 + 0.26 * w * TEM[k] : 0);
      if (cae > 0.001) a *= smooth(cae - 0.07, cae + 0.07, dRz[i]);
      dal[i] = a;
      if (a < 0.02) continue; // punto apagado
      dX[i] = x; dK[i] = k; dFr[i] = qq - k;
      dS[i] = enves ? sD : sI + (sD - sI) * MEZ[k];
      dTb[i] = tbFila * TEM[k];
      dra[i] = (enves ? rB * g * (1.12 - 0.2 * GX[k]) : r0 + rg * GX[k]) * (0.82 + 0.3 * dRz[i]);
    }
  }

  let turno = 0, todasLasFilas = true;
  function casaPuntos() {
    turno = (turno + 1) & 3;
    for (let r = 0; r < nFil; r++) if (todasLasFilas || (r & 3) === turno) filaLenta(r);
    todasLasFilas = false;

    let tor = P.forma.torsion * def.x; if (Math.abs(tor) < 0.002) tor = 0;
    const est = 1 + P.forma.estirar * def.x, xk = P.nudo[0], resp = P.respiracion * 0.5;
    const bx = ox + sx * xk * (1 - est), mx = sx * est; // x de pantalla = bx + mx · x de diseño
    for (let r = 0; r < nFil; r++) {
      const enves = fEnves[r], w = fW[r];
      const sTor = tor !== 0 ? Math.pow(fSD[r], 1 + tor) : fSD[r]; // lejos del nudo la torsión es igual para toda la fila
      const rc = resp * fG[r] * Math.cos(w * 5), rs = resp * fG[r] * Math.sin(w * 5);
      for (let i = fIni[r], fin = fIni[r + 1]; i < fin; i++) {
        if (dal[i] < 0.02) { dhx[i] = -1e5; continue; } // punto apagado
        const k = dK[i], fr = dFr[i], tb = dTb[i];
        const inf = It[k] + (It[k + 1] - It[k]) * fr;
        let y;
        if (enves) {
          y = inf + dS[i] * BAJ[k];
        } else {
          const sup = St[k] + (St[k + 1] - St[k]) * fr;
          let s = dS[i];
          if (tor !== 0) { const mez = MEZ[k]; s = mez > 0.999 ? sTor : Math.pow(s, 1 + tor * mez); }
          y = sup + (inf - sup) * s + DER[k] * (ONS[k] * rc + ONC[k] * rs); // + la respiración de la superficie
        }
        dhx[i] = bx + mx * dX[i] + dRx[i] * tb;
        dhy[i] = oy + sy * y + dRy[i] * tb;
      }
    }
  }

  // ───────────────────────────── Física ─────────────────────────────
  // Cada partícula persigue su casa (más el empuje del puntero y de las ondas) con un resorte
  // amortiguado. Devuelve la «energía» que queda, para saber cuándo todo volvió a su sitio.
  function fisica(n, hx, hy, dx, dy, vx, vy, br, px, py, rk, dt) {
    const e = P.empuje, R = Math.max(60, e.radio * Math.min(W, H)), R2 = R * R;
    const fuerza = e.fuerza * R, arr = e.arrastre, brillo = e.brillo;
    const k0 = P.resorte.rigidez, c0 = 2 * P.resorte.amortiguacion * Math.sqrt(k0);
    const atk = P.resorte.ataque, atc = Math.sqrt(atk);
    const mx = ptr.x, my = ptr.y, mvx = ptr.vx * arr, mvy = ptr.vy * arr, con = ptr.on;
    const A = P.choque.fuerza * diag, ch = P.choque.brillo, anc = 1 / (P.choque.ancho * diag);
    // de cada onda: entre qué distancias (al cuadrado) está el anillo
    for (let o = 0; o < nOndas; o++) {
      const lo = Math.max(0, oR[o] - 2.6 / anc), hi = oR[o] + 2.6 / anc;
      oLo[o] = lo * lo; oHi[o] = hi * hi;
    }
    let energia = 0;
    for (let i = 0; i < n; i++) {
      const x = hx[i], y = hy[i];
      if (x < -9e4) { dx[i] = dy[i] = vx[i] = vy[i] = br[i] = 0; continue; } // punto apagado
      let tx = 0, ty = 0, g = 0, ix = 0, iy = 0, tocada = false;
      if (con) {
        const ex = x - mx, ey = y - my, d2 = ex * ex + ey * ey;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 0.01; let w = 1 - d / R; w *= w;
          tx = (ex / d) * fuerza * w + mvx * w; ty = (ey / d) * fuerza * w + mvy * w;
          g = w * brillo; tocada = true;
        }
      }
      for (let o = 0; o < nOndas; o++) {
        const ex = x - oX[o], ey = y - oY[o], d2 = ex * ex + ey * ey;
        if (d2 > oLo[o] && d2 < oHi[o]) {
          const d = Math.sqrt(d2) + 0.01, u = (d - oR[o]) * anc;
          const band = Math.exp(-u * u) * oA[o], p = band * A / d;
          tx += ex * p; ty += ey * p;             // empujón que el resorte sigue (deja estela)
          ix += ex * p * 0.8; iy += ey * p * 0.8; // desplazamiento inmediato (el anillo nítido)
          g += band * ch; tocada = true;
        }
      }
      let ex2 = dx[i], ey2 = dy[i], wx = vx[i], wy = vy[i];
      if (!tocada && ex2 === 0 && ey2 === 0 && wx === 0 && wy === 0) { // en casa y sin que nada la toque
        br[i] = 0;
        if (px) { px[i] = x; py[i] = y; }
        continue;
      }
      let k = k0, c = c0;
      if (rk) { k *= rk[i]; c *= Math.sqrt(rk[i]); } // cada punto, a su ritmo
      if (tocada) { k *= atk; c *= atc; }             // empujada: responde rápido; suelta: vuelve con calma
      wx += (k * (tx - ex2) - c * wx) * dt; wy += (k * (ty - ey2) - c * wy) * dt;
      ex2 += wx * dt; ey2 += wy * dt;
      const lejos = Math.abs(ex2) + Math.abs(ey2);
      if (!tocada && lejos < 0.03 && Math.abs(wx) + Math.abs(wy) < 0.6) ex2 = ey2 = wx = wy = 0; // llegó a casa
      dx[i] = ex2; dy[i] = ey2; vx[i] = wx; vy[i] = wy;
      br[i] = g + Math.min(0.5, lejos * 0.012);
      if (px) { px[i] = x + ex2 + ix; py[i] = y + ey2 + iy; }
      else { hx[i] = x + ex2 + ix; hy[i] = y + ey2 + iy; }
      energia += lejos + (Math.abs(wx) + Math.abs(wy)) * 0.05;
    }
    return energia;
  }

  function actualizar(dt) {
    // El puntero: velocidad suavizada
    if (ptr.on) {
      const ivx = ptr.fresh ? 0 : (ptr.x - ptr.px) / Math.max(dt, 0.004);
      const ivy = ptr.fresh ? 0 : (ptr.y - ptr.py) / Math.max(dt, 0.004);
      ptr.vx += (ivx - ptr.vx) * 0.25; ptr.vy += (ivy - ptr.vy) * 0.25;
      ptr.fresh = false;
    } else { ptr.vx = ptr.vy = 0; }
    ptr.px = ptr.x; ptr.py = ptr.y;

    // Deformación general: sigue al puntero con suavidad; los ecos, con más retraso
    const mxo = ptr.on ? (ptr.x / W - 0.5) * 2 : 0, myo = ptr.on ? (ptr.y / H - 0.5) * 2 : 0;
    const kk = 1 - Math.exp(-dt / P.forma.suavidad);
    def.x += (mxo - def.x) * kk; def.y += (myo - def.y) * kk;
    for (const e of ecos) {
      const ke = 1 - Math.exp(-dt / e.tau);
      e.x += (mxo - e.x) * ke; e.y += (myo - e.y) * ke;
    }

    // Ondas de choque: radio y fuerza de cada una en este cuadro
    const ahora = performance.now();
    nOndas = 0;
    for (let i = ondas.length - 1; i >= 0; i--) {
      const edad = (ahora - ondas[i].t0) / 1000;
      if (edad > P.choque.vida) { ondas.splice(i, 1); continue; }
      oX[nOndas] = ondas[i].x; oY[nOndas] = ondas[i].y;
      oR[nOndas] = edad * P.choque.velocidad * diag;
      oA[nOndas] = smooth(0, 0.06, edad) * (1 - smooth(P.choque.vida * 0.45, P.choque.vida, edad));
      nOndas++;
    }

    curvas(def, St, It, Ut);
    casaLineas();
    casaPuntos();

    const activo = ptr.on || nOndas > 0 || !quieto;
    if (activo) {
      const e1 = fisica(nL, lhx, lhy, ldx, ldy, lvx, lvy, lgl, lpx, lpy, null, dt);
      const e2 = fisica(nD, dhx, dhy, ddx, ddy, dvx, dvy, dgl, null, null, dRk, dt);
      quieto = !ptr.on && nOndas === 0 && (e1 + e2) / (nL + nD) < 0.004;
      if (quieto) {
        ldx.fill(0); ldy.fill(0); lvx.fill(0); lvy.fill(0); lgl.fill(0);
        ddx.fill(0); ddy.fill(0); dvx.fill(0); dvy.fill(0); dgl.fill(0);
      }
    } else {
      lpx.set(lhx); lpy.set(lhy);
    }
  }

  // ─────────────────────── Dibujo con WebGL ───────────────────────
  // Todo el patrón se pinta en dos golpes: las «cintas» (líneas, resplandores, nudo y halos, hechos
  // de triángulos) y los puntos. La luz se suma: donde se amontonan las líneas sale blanco.
  // Si el navegador no tiene WebGL, más abajo está el mismo dibujo hecho con Canvas 2D.
  let glC = null, glP = null;                 // los dos programas: cintas y puntos
  let bufFijo, bufVivo, bufInd, bufPuntos;    // memorias en la tarjeta gráfica
  let vFijo, vVivo, nInd = 0, datosPuntos;    // lo que se les envía
  let lE;                                     // medio ancho (más el borde suave) de cada muestra de línea, en px
  let perdido = false;                        // el navegador puede quitar el contexto un momento
  const N_ECO = 51, N_NUC = 49, N_LUZ = 12;   // muestras de cada eco y del nudo; número de luces
  const CURVAS_ECO = [0, 0.3, 0.62, 1];       // qué filas de la superficie dibuja cada eco

  function prepararGL() {
    const g = gl;
    const programa = (vs, fs, attrs) => {
      const p = g.createProgram();
      for (const [tipo, texto] of [[g.VERTEX_SHADER, vs], [g.FRAGMENT_SHADER, fs]]) {
        const sh = g.createShader(tipo);
        g.shaderSource(sh, texto); g.compileShader(sh);
        if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(sh));
        g.attachShader(p, sh);
      }
      attrs.forEach((nombre, i) => g.bindAttribLocation(p, i, nombre));
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
      return { p, u: g.getUniformLocation(p, 'u'), r: g.getUniformLocation(p, 'r') };
    };
    // Cintas. Cada vértice trae d = (x, y, alfa) y e = (u, v, medida, tipo):
    //   tipo 0, línea nítida de medio ancho «medida» px · tipo 1, resplandor que se apaga hacia los lados
    //   tipo 2, luz redonda (medida = qué tan rápido se apaga) · tipo 3, relleno liso
    glC = programa(`
      attribute vec3 d; attribute vec4 e; uniform vec2 u; varying vec4 ve; varying float va;
      void main() { gl_Position = vec4(d.x * u.x - 1.0, 1.0 - d.y * u.y, 0.0, 1.0); ve = e; va = d.z; }`, `
      precision mediump float; uniform float r; varying vec4 ve; varying float va;
      void main() {
        float c = 1.0;
        if (ve.w < 0.5) { float m = ve.z * r; c = clamp(m + 0.5 - abs(ve.y) * (m + 1.0), 0.0, 1.0); }
        else if (ve.w < 1.5) { float q = 1.0 - abs(ve.y); c = q * q; }
        else if (ve.w < 2.5) {
          c = pow(max(0.0, 1.0 - length(ve.xy)), ve.z);
          // un grano mínimo para que el degradado no haga escalones sobre el negro
          c += step(0.002, c * va) * (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / (255.0 * max(va, 0.01));
        }
        gl_FragColor = vec4(c * va);
      }`, ['d', 'e']);
    // Puntos. Cada uno llega como p = (x, y, radio, alfa) en píxeles de pantalla
    glP = programa(`
      attribute vec4 p; uniform vec3 u; varying float vr; varying float va;
      void main() {
        gl_Position = vec4(p.x * u.x - 1.0, 1.0 - p.y * u.y, 0.0, 1.0);
        vr = p.z * u.z; va = p.w; gl_PointSize = 2.0 * vr + 2.0;
      }`, `
      precision mediump float; varying float vr; varying float va;
      void main() {
        float d = length(gl_PointCoord - 0.5) * (2.0 * vr + 2.0);
        gl_FragColor = vec4(clamp(vr - d + 0.5, 0.0, 1.0) * va);
      }`, ['p']);
    bufFijo = g.createBuffer(); bufVivo = g.createBuffer(); bufInd = g.createBuffer(); bufPuntos = g.createBuffer();
    g.disable(g.DEPTH_TEST);
    g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE); // la luz se suma
    g.clearColor(0, 0, 0, 0);
  }

  // Arma lo que no cambia de un cuadro a otro: qué es cada vértice y cómo se unen en triángulos
  function montarGL() {
    const g = gl, borde = 1 / dpr; // 1 px físico de borde suave
    const cintas = [];             // [muestras, medida, tipo] de cada tira
    lE = new Float32Array(nL);
    for (let l = 0; l < nLin; l++) cintas.push([M, -1, 0]); // -1: el medio ancho va muestra a muestra (abajo)
    cintas.push([M, 0, 1], [M, 0, 1]);                                           // resplandor de los dos bordes
    for (let i = 0; i < ecos.length * CURVAS_ECO.length; i++) cintas.push([N_ECO, Math.max(0.25, 0.4 * esc), 0]);
    cintas.push([N_NUC, 0, 3]);                                                  // relleno del nudo
    let nV = N_LUZ * 4, nI = N_LUZ * 6;
    for (const c of cintas) { nV += c[0] * 2; nI += (c[0] - 1) * 6; }
    vFijo = new Float32Array(nV * 4); vVivo = new Float32Array(nV * 3);
    const ind = new Uint16Array(nI);
    let o = 0, v = 0, q = 0;
    for (const [n, med, tipo] of cintas) {
      for (let k = 0; k < n; k++, v += 2) {
        let medida = med;
        if (med < 0) { // línea: el borde de arriba y el filo engordan del nudo hacia la derecha
          const i = v >> 1, l = (i / M) | 0;
          const gordo = hBorde[l] ? 1 + 0.9 * smooth(0.37, 0.47, lX[i]) : 1;
          medida = Math.max(0.25, gordo * P.grosor * esc / 2);
          lE[i] = medida + borde;
        }
        vFijo[o++] = 0; vFijo[o++] = 1; vFijo[o++] = medida; vFijo[o++] = tipo;
        vFijo[o++] = 0; vFijo[o++] = -1; vFijo[o++] = medida; vFijo[o++] = tipo;
        if (k < n - 1) { ind[q++] = v; ind[q++] = v + 1; ind[q++] = v + 2; ind[q++] = v + 1; ind[q++] = v + 3; ind[q++] = v + 2; }
      }
    }
    for (let i = 0; i < N_LUZ; i++, v += 4) {       // luces: 3 del halo (se apagan despacio) y las del nudo
      const medida = i < 3 ? 2.6 : 2.0;
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { vFijo[o++] = a; vFijo[o++] = b; vFijo[o++] = medida; vFijo[o++] = 2; }
      ind[q++] = v; ind[q++] = v + 1; ind[q++] = v + 2; ind[q++] = v + 1; ind[q++] = v + 3; ind[q++] = v + 2;
    }
    nInd = nI;
    g.bindBuffer(g.ARRAY_BUFFER, bufFijo); g.bufferData(g.ARRAY_BUFFER, vFijo, g.STATIC_DRAW);
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, bufInd); g.bufferData(g.ELEMENT_ARRAY_BUFFER, ind, g.STATIC_DRAW);
  }

  function dibujarGL() {
    const g = gl, v = vVivo;
    let o = 0;
    // Una línea como tira de triángulos: a cada lado de cada muestra, medio ancho E.
    // Con E = 0 es la línea misma (su ancho va muestra a muestra); con E > 0, su resplandor.
    const cinta = (l, E, kA) => {
      for (let k = 0, i = l * M; k < M; k++, i++) {
        const i0 = k > 0 ? i - 1 : i, i1 = k < M - 1 ? i + 1 : i;
        let tx = lpx[i1] - lpx[i0], ty = lpy[i1] - lpy[i0];
        const inv = (E || lE[i]) / (Math.sqrt(tx * tx + ty * ty) + 1e-6);
        tx *= inv; ty *= inv;
        let a = lA[i];
        const br = lgl[i];
        if (br > 0) a = Math.min(1, a * (1 + 1.4 * br) + 0.12 * br);
        a *= E ? kA * smooth(0.22, 0.44, lX[i]) : kA; // el resplandor nace cerca del nudo
        const x = lpx[i], y = lpy[i];
        v[o] = x - ty; v[o + 1] = y + tx; v[o + 2] = a; v[o + 3] = x + ty; v[o + 4] = y - tx; v[o + 5] = a;
        o += 6;
      }
    };
    for (let l = 0; l < nLin; l++) cinta(l, 0, 1);
    // resplandor difuso del borde de arriba (con el pliegue) y del filo
    const kR = calidad > 0.7 ? P.resplandor * 2.5 : 0;
    cinta(0, 15 * esc, kR); cinta(nPri - 1, 15 * esc, kR);

    // ecos: la silueta de la forma tal como estaba hace un instante (solo se ven al mover el puntero)
    const f = P.forma, xk = P.nudo[0], eEco = Math.max(0.25, 0.4 * esc) + 1 / dpr;
    for (const e of ecos) {
      const w = clamp01(Math.hypot(e.x - def.x, e.y - def.y) * 2.2) * f.ecoAlfa;
      const n = CURVAS_ECO.length * N_ECO * 6;
      if (w < 0.008) { for (let j = 2; j < n; j += 3) v[o + j] = 0; o += n; continue; }
      curvas(e, Se, Ie, null);
      const est = 1 + f.estirar * e.x;
      for (const s of CURVAS_ECO) {
        for (let j = 0; j < N_ECO; j++) {
          const x = 0.5 + j * 0.012, q = (x - XA) * KINV, k = q | 0, fr = q - k;
          const sup = Se[k] + (Se[k + 1] - Se[k]) * fr, inf = Ie[k] + (Ie[k + 1] - Ie[k]) * fr;
          const X = ox + sx * (xk + (x - xk) * est), Y = oy + sy * (sup + (inf - sup) * s);
          v[o] = X; v[o + 1] = Y - eEco; v[o + 2] = w; v[o + 3] = X; v[o + 4] = Y + eEco; v[o + 5] = w;
          o += 6;
        }
      }
    }

    // el nudo: relleno blanco entre los dos bordes de la hoja principal, que se desvanece a los lados
    const est = 1 + f.estirar * def.x;
    const X = x => ox + sx * (xk + (x - xk) * est);
    const sup = x => { const q = (x - XA) * KINV, k = q | 0; return oy + sy * (St[k] + (St[k + 1] - St[k]) * (q - k)); };
    const inf = x => { const q = (x - XA) * KINV, k = q | 0; return oy + sy * (It[k] + (It[k + 1] - It[k]) * (q - k)); };
    const campana = x => { const u = (x - xk) / (x < xk ? 0.09 : 0.11); return Math.exp(-u * u); };
    for (let j = 0; j < N_NUC; j++) {
      const x = 0.30 + j * 0.36 / (N_NUC - 1), a = P.nucleo * campana(x), xx = X(x);
      v[o] = xx; v[o + 1] = sup(x); v[o + 2] = a; v[o + 3] = xx; v[o + 4] = inf(x); v[o + 5] = a;
      o += 6;
    }
    // luces: el halo del nudo y las manchas suaves a lo largo de la banda
    const luz = (x, y, R, a) => {
      v[o] = x - R; v[o + 1] = y - R; v[o + 2] = a; v[o + 3] = x + R; v[o + 4] = y - R; v[o + 5] = a;
      v[o + 6] = x - R; v[o + 7] = y + R; v[o + 8] = a; v[o + 9] = x + R; v[o + 10] = y + R; v[o + 11] = a;
      o += 12;
    };
    const halo = (dxn, dyn, radio, a) => luz(ox + sx * (xk + dxn * est), oy + sy * (P.nudo[1] + dyn), Math.max(sx, sy) * radio, a);
    halo(0, 0, 0.30, P.halo); halo(0.06, -0.075, 0.16, P.halo * 0.8); halo(-0.05, 0.04, 0.12, P.halo * 0.6);
    for (let j = 0; j < N_LUZ - 3; j++) {
      const x = xk - 0.07 + j * 0.025, a = P.nucleo * 0.34 * campana(x), s0 = sup(x), i0 = inf(x);
      luz(X(x), (s0 + i0) / 2, (i0 - s0) * 0.5 + 46 * esc, a);
    }

    g.clear(g.COLOR_BUFFER_BIT);
    g.useProgram(glC.p);
    g.uniform2f(glC.u, 2 / W, 2 / H); g.uniform1f(glC.r, dpr);
    g.bindBuffer(g.ARRAY_BUFFER, bufVivo); g.bufferData(g.ARRAY_BUFFER, v, g.DYNAMIC_DRAW);
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.FLOAT, false, 0, 0);
    g.bindBuffer(g.ARRAY_BUFFER, bufFijo);
    g.enableVertexAttribArray(1); g.vertexAttribPointer(1, 4, g.FLOAT, false, 0, 0);
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, bufInd);
    g.drawElements(g.TRIANGLES, nInd, g.UNSIGNED_SHORT, 0);

    // los puntos, de un solo golpe
    const d = datosPuntos;
    let n = 0;
    for (let i = 0; i < nD; i++) {
      let a = dal[i];
      if (a < 0.02) continue;
      const x = dhx[i], y = dhy[i];
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
      let r = dra[i];
      const br = dgl[i];
      if (br > 0) { a = Math.min(1, a * (1 + 1.2 * br) + 0.2 * br); r *= 1 + 0.4 * Math.min(br, 1.5); }
      d[n++] = x; d[n++] = y; d[n++] = r; d[n++] = a;
    }
    g.useProgram(glP.p);
    g.uniform3f(glP.u, 2 / W, 2 / H, dpr);
    g.disableVertexAttribArray(1);
    g.bindBuffer(g.ARRAY_BUFFER, bufPuntos); g.bufferData(g.ARRAY_BUFFER, d.subarray(0, n), g.DYNAMIC_DRAW);
    g.vertexAttribPointer(0, 4, g.FLOAT, false, 0, 0);
    g.drawArrays(g.POINTS, 0, n >> 2);
  }

  // Pide WebGL para el lienzo; si no hay (o falla al prepararlo), Canvas 2D
  function iniciarLienzo() {
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
      if (gl) {
        prepararGL();
        canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); perdido = true; });
        canvas.addEventListener('webglcontextrestored', () => {
          try { prepararGL(); montarGL(); perdido = false; } catch (err) { /* sigue sin dibujar */ }
        });
        return;
      }
    } catch (err) {
      // el lienzo ya quedó casado con WebGL: se cambia por uno igual para poder usar Canvas 2D
      const nuevo = canvas.cloneNode(false);
      canvas.replaceWith(nuevo); canvas = nuevo;
      gl = null;
    }
    ctx = canvas.getContext('2d');
  }

  // ─────────────────── Respaldo: dibujo con Canvas 2D ───────────────────
  const NB = 16; // niveles de transparencia: se dibuja todo lo de un nivel de una sola vez
  const NL = 5;  // niveles del resplandor de los bordes

  function dibujaHalo() {
    const est = 1 + P.forma.estirar * def.x, xk = P.nudo[0];
    const luz = (dxn, dyn, radio, alfa) => {
      const x = ox + sx * (xk + dxn * est), y = oy + sy * (P.nudo[1] + dyn);
      const R = Math.max(sx, sy) * radio;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,255,255,${alfa})`);
      g.addColorStop(0.3, `rgba(255,255,255,${alfa * 0.3})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    };
    ctx.globalAlpha = 1;
    luz(0, 0, 0.30, P.halo);
    luz(0.06, -0.075, 0.16, P.halo * 0.8);
    luz(-0.05, 0.04, 0.12, P.halo * 0.6);
  }

  // El nudo: un relleno blanco entre los dos bordes de la hoja principal, con su resplandor
  function dibujaNucleo() {
    if (P.nucleo <= 0) return;
    const est = 1 + P.forma.estirar * def.x, xk = P.nudo[0];
    const X = x => ox + sx * (xk + (x - xk) * est);
    const sup = x => { const q = (x - XA) * KINV, k = q | 0; return oy + sy * (St[k] + (St[k + 1] - St[k]) * (q - k)); };
    const inf = x => { const q = (x - XA) * KINV, k = q | 0; return oy + sy * (It[k] + (It[k + 1] - It[k]) * (q - k)); };
    const campana = x => { const u = (x - xk) / (x < xk ? 0.09 : 0.11); return Math.exp(-u * u); };
    // relleno, en tiras verticales que se desvanecen hacia los lados
    const x0 = 0.30, x1 = 0.66, n = 48, paso = (x1 - x0) / n;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * paso, xb = xa + paso, a = P.nucleo * campana(xa + paso / 2);
      if (a < 0.004) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(X(xa), sup(xa)); ctx.lineTo(X(xb), sup(xb));
      ctx.lineTo(X(xb), inf(xb)); ctx.lineTo(X(xa), inf(xa));
      ctx.fill();
    }
    // resplandor: manchas de luz suaves a lo largo de la banda
    ctx.globalAlpha = 1;
    for (let x = xk - 0.07; x <= xk + 0.13; x += 0.025) {
      const a = P.nucleo * 0.34 * campana(x), cx0 = X(x), cy0 = (sup(x) + inf(x)) / 2;
      const R = (inf(x) - sup(x)) * 0.5 + 46 * esc;
      const g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, R);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.45, `rgba(255,255,255,${a * 0.4})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx0 - R, cy0 - R, 2 * R, 2 * R);
    }
  }

  // Ecos: la silueta de la forma tal como estaba hace un instante (solo se ven al mover el puntero)
  function dibujaEcos() {
    const f = P.forma, xk = P.nudo[0];
    ctx.lineWidth = Math.max(0.5, 0.8 * esc);
    ctx.strokeStyle = '#fff';
    for (const e of ecos) {
      const w = clamp01(Math.hypot(e.x - def.x, e.y - def.y) * 2.2) * f.ecoAlfa;
      if (w < 0.008) continue;
      curvas(e, Se, Ie, null);
      const est = 1 + f.estirar * e.x;
      ctx.globalAlpha = w;
      ctx.beginPath();
      for (const s of [0, 0.3, 0.62, 1]) {
        let primero = true;
        for (let x = 0.5; x <= 1.1; x += 0.012) {
          const q = (x - XA) * KINV, k = q | 0, fr = q - k;
          const sup = Se[k] + (Se[k + 1] - Se[k]) * fr, inf = Ie[k] + (Ie[k + 1] - Ie[k]) * fr;
          const X = ox + sx * (xk + (x - xk) * est), Y = oy + sy * (sup + (inf - sup) * s);
          primero ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          primero = false;
        }
      }
      ctx.stroke();
    }
  }

  function dibujaLineas() {
    const paths = [], bordes = [], luz = [];
    for (let b = 0; b < NB; b++) { paths.push(new Path2D()); bordes.push(new Path2D()); }
    for (let b = 0; b < NL; b++) luz.push(new Path2D());
    const lim = H + 40;
    for (let l = 0; l < nLin; l++) {
      let prev = -1, prevL = -1;
      const tram = ((l * 0.618) % 1) - 0.5; // cada línea cambia de nivel en un sitio distinto: sin bandas
      const borde = hBorde[l];
      for (let k = 0, i = l * M; k < M - 1; k++, i++) {
        let a = (lA[i] + lA[i + 1]) * 0.5;
        if (a < 0.012 || (lpy[i] > lim && lpy[i + 1] > lim)) { prev = prevL = -1; continue; }
        const g = lgl[i];
        if (g > 0) a = Math.min(1, a * (1 + 1.4 * g) + 0.12 * g);
        let b = (a * NB + tram) | 0; if (b >= NB) b = NB - 1; else if (b < 0) b = 0;
        if (b !== prev) { paths[b].moveTo(lpx[i], lpy[i]); if (borde) bordes[b].moveTo(lpx[i], lpy[i]); }
        paths[b].lineTo(lpx[i + 1], lpy[i + 1]);
        if (borde) {
          bordes[b].lineTo(lpx[i + 1], lpy[i + 1]);
          const bl = Math.min(NL - 1, (a * NL) | 0);
          if (bl !== prevL) luz[bl].moveTo(lpx[i], lpy[i]);
          luz[bl].lineTo(lpx[i + 1], lpy[i + 1]);
          prevL = bl;
        }
        prev = b;
      }
    }
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    // resplandor difuso de los dos bordes
    if (P.resplandor > 0 && calidad > 0.7) {
      for (let ancho = 30; ancho > 3; ancho *= 0.84) { // de ancho a fino: se suman en un degradado suave
        ctx.lineWidth = ancho * esc;
        for (let b = 1; b < NL; b++) { ctx.globalAlpha = P.resplandor * 0.19 * (b + 0.5) / NL; ctx.stroke(luz[b]); }
      }
    }
    ctx.lineWidth = Math.max(0.5, P.grosor * esc);
    for (let b = 0; b < NB; b++) { ctx.globalAlpha = (b + 0.6) / NB; ctx.stroke(paths[b]); }
    ctx.lineWidth = Math.max(0.8, P.grosor * 1.9 * esc); // el pliegue y el filo, más gruesos
    for (let b = 0; b < NB; b++) { ctx.globalAlpha = (b + 0.6) / NB; ctx.stroke(bordes[b]); }
  }

  function dibujaPuntos() {
    const paths = [];
    for (let b = 0; b < NB; b++) paths.push(new Path2D());
    const TAU = Math.PI * 2;
    for (let i = 0; i < nD; i++) {
      let a = dal[i];
      if (a < 0.02) continue;
      const x = dhx[i], y = dhy[i];
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
      let r = dra[i];
      const g = dgl[i];
      if (g > 0) { a = Math.min(1, a * (1 + 1.2 * g) + 0.2 * g); r *= 1 + 0.4 * Math.min(g, 1.5); }
      const p = paths[Math.min(NB - 1, (a * NB) | 0)];
      if (r < 0.9) p.rect(x - r, y - r, r * 2, r * 2); // tan pequeños que un cuadrito basta (y es más rápido)
      else { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
    }
    ctx.fillStyle = '#fff';
    for (let b = 0; b < NB; b++) { ctx.globalAlpha = (b + 0.6) / NB; ctx.fill(paths[b]); }
  }

  function dibujar2D() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    dibujaHalo();
    dibujaNucleo();
    dibujaEcos();
    dibujaLineas();
    dibujaPuntos();
  }

  const dibujar = () => { if (!gl) dibujar2D(); else if (!perdido) dibujarGL(); };

  // ───────────────────────────── Ciclo ─────────────────────────────
  let msMedia = 0, cpsMedia = 60; // medición: costo por cuadro y cuadros por segundo
  let lentos = 0;                 // cuadros seguidos por encima del presupuesto
  let raf = 0;
  const pedir = () => { if (!raf) raf = requestAnimationFrame(loop); };

  function loop(now) {
    raf = 0;
    if (!running) return;
    const real = (now - last) / 1000;
    const dt = Math.min(0.034, Math.max(0.001, real));
    last = now;
    t += dt * P.velocidad;
    const a = performance.now();
    actualizar(dt);
    dibujar();
    msMedia += (performance.now() - a - msMedia) * 0.05;
    // Red de seguridad: si calcular cada cuadro cuesta demasiado durante un segundo, baja la densidad
    lentos = msMedia > P.rendimiento.presupuesto ? lentos + 1 : 0;
    if (lentos > 60 && calidad > P.rendimiento.calidadMinima) {
      calidad = Math.max(P.rendimiento.calidadMinima, calidad - 0.2);
      lentos = 0; msMedia *= 0.6;
      construir();
    }
    if (real > 0 && real < 0.5) cpsMedia += (1 / real - cpsMedia) * 0.05;
    pedir();
  }

  function cuadroQuieto() { actualizar(0.016); dibujar(); }

  iniciarLienzo();
  medir();
  window.addEventListener('resize', () => { medir(); if (reduce) cuadroQuieto(); });

  // Cuánto está de lejos de su casa la partícula más desplazada (0 = todo en su sitio)
  const desvio = () => {
    let m = 0;
    for (let i = 0; i < nL; i++) m = Math.max(m, Math.abs(ldx[i]), Math.abs(ldy[i]));
    for (let i = 0; i < nD; i++) m = Math.max(m, Math.abs(ddx[i]), Math.abs(ddy[i]));
    return m;
  };

  // Diagnóstico (consola): atenaOnda.info()
  window.atenaOnda = {
    P, // los parámetros, para probar ajustes en vivo desde la consola
    info: () => ({
      particulas: nL + nD, puntos: nD, muestrasDeLinea: nL,
      msPorCuadro: +msMedia.toFixed(2), cuadrosPorSegundo: +cpsMedia.toFixed(1),
      lienzo: `${canvas.width}×${canvas.height}`, dibujo: gl ? 'WebGL' : 'Canvas 2D',
      desvioMaximoPx: +desvio().toFixed(2), calidad: +calidad.toFixed(2), enMarcha: running,
    }),
  };

  // Con «reducir movimiento»: un cuadro quieto, sin interacción animada
  if (reduce) { cuadroQuieto(); return; }

  // ───────────────────────────── Interacción ─────────────────────────────
  const zona = canvas.parentElement;
  // En táctil: el arrastre vertical sigue desplazando la página; el horizontal mueve el patrón
  zona.style.touchAction = 'pan-y pinch-zoom';

  let cx = 0, cy = 0; // última posición del puntero en la ventana
  const ubicar = e => {
    const r = canvas.getBoundingClientRect();
    cx = e.clientX; cy = e.clientY;
    ptr.x = cx - r.left; ptr.y = cy - r.top;
    const dentro = ptr.x >= 0 && ptr.x <= r.width && ptr.y >= 0 && ptr.y <= r.height;
    if (dentro && !ptr.on) ptr.fresh = true;
    ptr.on = dentro;
    return dentro;
  };
  const chocar = () => {
    if (ondas.length >= P.choque.maximo) ondas.shift();
    ondas.push({ x: ptr.x, y: ptr.y, t0: performance.now() });
  };
  let toque = null; // para distinguir un toque de un arrastre

  window.addEventListener('pointermove', e => { ubicar(e); }, { passive: true });
  window.addEventListener('pointerdown', e => {
    if (!ubicar(e)) return;
    if (e.pointerType === 'touch') toque = { x: e.clientX, y: e.clientY, t: performance.now() };
    else if (e.button === 0) chocar();
  }, { passive: true });
  window.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return;
    if (toque && ubicar(e) && performance.now() - toque.t < 450
        && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 14) chocar();
    toque = null; ptr.on = false;
  }, { passive: true });
  window.addEventListener('pointercancel', () => { toque = null; ptr.on = false; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; });
  window.addEventListener('blur', () => { ptr.on = false; });
  // Al desplazar la página el puntero no se mueve, pero la portada sí
  window.addEventListener('scroll', () => { if (ptr.on) ubicar({ clientX: cx, clientY: cy }); }, { passive: true });

  // Solo anima mientras la portada está a la vista
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) { last = performance.now(); pedir(); }
  }).observe(canvas);

  pedir();
})();
