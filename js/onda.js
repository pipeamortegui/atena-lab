// Atena Lab — la onda de la portada.
// Una cinta de líneas que se tuerce (se estrecha en un punto de luz) y, al avanzar
// hacia la derecha, se disuelve en una superficie de puntos: diseño → inteligencia → tecnología.
(() => {
  const canvas = document.getElementById('onda');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Parámetros de la cinta (ajustables)
  const P = {
    lines: 72,        // líneas del tramo izquierdo
    rows: 44,         // filas de puntos del tramo derecho
    cols: 78,         // columnas de puntos
    pinch: 0.42,      // dónde se tuerce la cinta (0 = borde izq., 1 = borde der.)
    toDots: [0.46, 0.66], // tramo donde las líneas pasan a puntos
    speed: 0.35,
  };

  let W = 0, H = 0, dpr = 1, narrow = false;
  let t = 0, last = performance.now(), running = true;
  let px = 0, pxTarget = 0; // reacción suave al puntero

  const clamp01 = x => Math.min(1, Math.max(0, x));
  const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    narrow = W < 760;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Punto de la cinta: u a lo largo (0..1), v a lo ancho (-1..1).
  // Devuelve x, y y la profundidad z (-1 atrás, 1 adelante).
  function point(u, v) {
    const base = narrow ? 0.9 : 0.8;
    const cy = H * (base - 0.42 * smooth(0.3, 1.1, u)) + Math.sin(u * 3 + t * 0.4) * H * 0.018;
    const amp = H * (0.07 + 0.15 * (1 - smooth(0, 0.38, u)))       // abanico de líneas a la izquierda
              + H * (narrow ? 0.18 : 0.24) * smooth(0.4, 1, u);      // superficie de puntos a la derecha
    const ph = (u - P.pinch) * 2.7 + Math.PI / 2 + Math.sin(t * 0.3) * 0.22 + px;
    const c = Math.cos(ph), s = Math.sin(ph);
    return {
      x: -0.06 * W + u * 1.14 * W + v * amp * 0.22 * s,
      y: cy + v * amp * c,
      z: v * s,
    };
  }

  function drawLines() {
    const steps = 150, uEnd = P.toDots[1];
    const chunk = 6;
    ctx.lineWidth = narrow ? 0.6 : 0.75;
    ctx.strokeStyle = '#fff';
    for (let i = 0; i < P.lines; i++) {
      const v = -1 + (2 * i) / (P.lines - 1);
      for (let k = 0; k < steps; k += chunk) {
        const u0 = (k / steps) * uEnd, u1 = (Math.min(k + chunk, steps) / steps) * uEnd;
        const um = (u0 + u1) / 2;
        const pm = point(um, v);
        const glow = Math.exp(-(((um - P.pinch) / 0.09) ** 2));
        const a = (0.14 + 0.6 * glow + 0.22 * (pm.z + 1) / 2)
          * smooth(0, 0.28, um) * (1 - smooth(P.toDots[0], P.toDots[1], um));
        if (a < 0.01) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.beginPath();
        for (let j = 0; j <= chunk; j++) {
          const u = u0 + ((u1 - u0) * j) / chunk;
          const p = point(u, v);
          j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }
  }

  function drawDots() {
    const buckets = 10;
    const paths = Array.from({ length: buckets }, () => new Path2D());
    const u0 = P.toDots[0] + 0.02, span = 1.04 - u0;
    const flow = (t * 0.6) % 1; // los puntos avanzan despacio hacia la derecha
    const scale = Math.max(0.7, Math.min(1.4, W / 1500));
    for (let r = 0; r < P.rows; r++) {
      const v = -1 + (2 * r) / (P.rows - 1);
      for (let c = 0; c < P.cols; c++) {
        const f = (c + flow) / P.cols;
        const u = u0 + f * span;
        const p = point(u, v);
        const depth = (p.z + 1) / 2;
        const a = smooth(P.toDots[0], P.toDots[1] - 0.04, u) * (1 - smooth(0.96, 1, f)) * (0.25 + 0.75 * depth);
        if (a < 0.03) continue;
        const rad = (0.55 + 1.5 * smooth(0.5, 1, u)) * (0.65 + 0.35 * depth) * scale;
        const b = Math.min(buckets - 1, Math.floor(a * buckets));
        paths[b].moveTo(p.x + rad, p.y);
        paths[b].arc(p.x, p.y, rad, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = '#fff';
    for (let b = 0; b < buckets; b++) {
      ctx.globalAlpha = (b + 0.5) / buckets;
      ctx.fill(paths[b]);
    }
  }

  function drawGlow() {
    const p = point(P.pinch, 0);
    const R = Math.max(W, H) * 0.32;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function frame() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow();
    drawLines();
    drawDots();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt * P.speed;
    px += (pxTarget - px) * 0.04;
    frame();
    if (running) requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduce) frame(); });

  if (reduce) { frame(); return; }

  window.addEventListener('pointermove', e => { pxTarget = (e.clientX / window.innerWidth - 0.5) * 0.35; });

  // Solo anima mientras la portada está a la vista
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(loop); }
  }).observe(canvas);

  requestAnimationFrame(loop);
})();
