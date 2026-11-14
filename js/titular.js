// Atena Lab — el titular se mueve con el patrón.
// Parte «Design / Intelligence / Technology» en letras y las trata como partículas del mismo
// sistema de la onda (js/onda.js): el puntero las empuja, el anillo de cada clic las sacude al
// pasar, y vuelven a su sitio con el mismo resorte. Al cargar, entran una tras otra.
// Solo se tocan transform y opacity; en reposo no queda nada puesto y el titular es el de siempre.
(() => {
  const h1 = document.querySelector('.hero h1');
  // Con «reducir movimiento» no se hace nada: el titular queda tal cual
  if (!h1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const spans = [...h1.children].filter(e => e.tagName === 'SPAN' && e.textContent.trim());
  if (!spans.length) return;

  // ───────────────────────── Parámetros (ajustables) ─────────────────────────
  const T = {
    fuerza: 0.34,        // cuánto del empuje que recibe un punto del patrón se lleva una letra (1 = lo mismo)
    tope: 28,            // desplazamiento máximo de una letra, en px (el titular debe leerse siempre)
    giro: 0.2,           // grados que se inclina por cada px que se desplaza de lado
    giroMax: 6,          // inclinación máxima, en grados
    crecer: 0.05,        // cuánto crece la letra en el instante en que la alcanza el anillo de un clic
    // En un equipo lento (el patrón tarda más de «cargaLenta» ms por cuadro) las letras se
    // actualizan uno de cada dos cuadros: así el titular no le quita fluidez al patrón.
    cargaLenta: 5.5, cargaNormal: 4,
    entrada: {
      duracion: 0.55,    // segundos que tarda en entrar cada letra
      porLetra: 0.018,   // retraso entre una letra y la siguiente
      porLinea: 0.10,    // retraso entre una línea y la siguiente
      subir: 0.36,       // desde cuánto más abajo entra (en alturas de letra)
    },
    // Si la onda no estuviera cargada, el resorte usa estos valores (los mismos de js/onda.js)
    resorte: { rigidez: 110, amortiguacion: 0.85, ataque: 3.5 },
  };

  // ───────────────────────── Partir en letras ─────────────────────────
  // Para lectores de pantalla el titular sigue siendo una sola frase
  h1.setAttribute('aria-label', spans.map(s => s.textContent.trim()).join(' '));
  const lineas = [], letras = [];
  spans.forEach((span, nl) => {
    const texto = span.textContent.trim(), grupo = [];
    span.textContent = '';
    span.classList.add('tl-linea');
    span.setAttribute('aria-hidden', 'true');
    [...texto].forEach((ch, i) => {
      const el = document.createElement('span');
      el.className = 'tl-letra';
      el.textContent = ch === ' ' ? ' ' : ch;
      span.appendChild(el);
      const L = {
        el, cx: 0, cy: 0,              // centro de la letra dentro del h1 (su «casa»)
        dx: 0, dy: 0, vx: 0, vy: 0,    // desplazamiento y velocidad
        espera: nl * T.entrada.porLinea + i * T.entrada.porLetra, // cuándo le toca entrar
        puesto: '',                    // último transform escrito (para no repetir)
        opaca: true,
      };
      grupo.push(L); letras.push(L);
    });
    lineas.push({ span, texto, letras: grupo });
  });

  // Al separar las letras se pierde el ajuste fino entre pares (interletrado de la fuente).
  // Se mide cada línea como texto corrido y como letras sueltas, y la diferencia se devuelve
  // como margen de cada letra, en «em» (así vale para cualquier tamaño de pantalla).
  function ajustarEspacios() {
    for (const { span, texto, letras: grupo } of lineas) {
      const sonda = (hijos) => {
        const s = document.createElement('span');
        s.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;animation:none';
        hijos(s);
        h1.appendChild(s);
        return s;
      };
      const corrido = sonda(s => { s.textContent = texto; });
      const suelto = sonda(s => {
        s.className = 'tl-linea';
        for (const ch of texto) {
          const l = document.createElement('span');
          l.className = 'tl-letra'; l.textContent = ch === ' ' ? ' ' : ch;
          s.appendChild(l);
        }
      });
      const em = parseFloat(getComputedStyle(corrido).fontSize) || 16;
      const r = document.createRange(), nodo = corrido.firstChild;
      const xa = [], xb = [];
      let u = 0; // posición en unidades de código (por si hubiera letras de dos unidades)
      [...texto].forEach(ch => {
        r.setStart(nodo, u); r.setEnd(nodo, u + ch.length); u += ch.length;
        xa.push(r.getBoundingClientRect().left);
      });
      [...suelto.children].forEach(l => xb.push(l.getBoundingClientRect().left));
      const anchoA = corrido.getBoundingClientRect().width, anchoB = suelto.getBoundingClientRect().width;
      let previo = 0;
      grupo.forEach((L, i) => {
        const delta = (xa[i] - xa[0]) - (xb[i] - xb[0]); // cuánto debería correrse esta letra
        const m = (delta - previo) / em;
        L.el.style.marginLeft = Math.abs(m) > 0.0005 ? m.toFixed(4) + 'em' : '';
        previo = delta;
      });
      // y que la línea mida de ancho lo mismo que antes
      const cola = (anchoA - anchoB - previo) / em;
      grupo[grupo.length - 1].el.style.marginRight = Math.abs(cola) > 0.0005 ? cola.toFixed(4) + 'em' : '';
      corrido.remove(); suelto.remove();
      span.style.whiteSpace = 'nowrap'; // las letras sueltas no deben partir la línea
    }
  }

  // Dónde queda el centro de cada letra dentro del h1 (posiciones de maquetación: no les afecta el transform)
  let alto = 60;
  function medirCasas() {
    for (const L of letras) {
      L.cx = L.el.offsetLeft - h1.offsetLeft + L.el.offsetWidth / 2;
      L.cy = L.el.offsetTop - h1.offsetTop + L.el.offsetHeight / 2;
    }
    alto = parseFloat(getComputedStyle(h1).fontSize) || 60;
  }

  // ───────────────────────── Entrada ─────────────────────────
  // Solo si el navegador pudo esconder el titular desde el primer momento (css/titular.css);
  // si no, ya se vio entero y hacerlo desaparecer para que «entre» sería un parpadeo.
  let entrando = window.matchMedia('(scripting: enabled)').matches;
  let t0 = 0; // la entrada empieza a contar en el primer cuadro que de verdad se pinta
  if (entrando) for (const L of letras) { L.el.style.opacity = '0'; L.opaca = false; }
  h1.classList.add('tl-listo');
  // Por si la página carga en una pestaña de fondo (ahí no hay cuadros): que el titular no se quede oculto
  setTimeout(() => {
    if (!entrando || t0) return;
    entrando = false;
    for (const L of letras) { L.el.style.opacity = ''; L.opaca = true; }
  }, 1500);

  ajustarEspacios();
  medirCasas();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { ajustarEspacios(); medirCasas(); }); // con la fuente de marca ya cargada
  }

  // ───────────────────────── Un solo ciclo, que duerme en reposo ─────────────────────────
  let raf = 0, ultimo = 0, aLaVista = true, ocio = 0, cuenta = 0, lento = false;
  const F = { x: 0, y: 0, anillo: 0, toca: false };
  const despertar = () => {
    ocio = 0;
    if (raf || !aLaVista) return;
    ultimo = performance.now();
    raf = requestAnimationFrame(cuadro);
    h1.classList.add('tl-activo');
  };
  // El puntero solo despierta al titular si pasa cerca de él
  let caja = h1.getBoundingClientRect();
  const cerca = e => {
    const m = 260;
    if (e.clientX > caja.left - m && e.clientX < caja.right + m && e.clientY > caja.top - m && e.clientY < caja.bottom + m) despertar();
  };

  function cuadro(ahora) {
    raf = 0;
    const dt = Math.min(0.034, Math.max(0.001, (ahora - ultimo) / 1000));
    ultimo = ahora;
    const onda = window.atenaOnda, lienzo = document.getElementById('onda');
    const res = (onda && onda.P && onda.P.resorte) || T.resorte;
    const k0 = res.rigidez, c0 = 2 * res.amortiguacion * Math.sqrt(k0), atk = res.ataque || 1;
    // dónde está el h1 dentro del lienzo de la onda (se lee una vez, antes de escribir nada)
    let ox = 0, oy = 0, hayOnda = false;
    if (onda && onda.fuerzaEn && lienzo) {
      const a = h1.getBoundingClientRect(), b = lienzo.getBoundingClientRect();
      ox = a.left - b.left; oy = a.top - b.top; hayOnda = true;
    }
    if (entrando && !t0) t0 = ahora;
    const tEntrada = (ahora - t0) / 1000, en = T.entrada;
    let vivo = hayOnda && onda.hayOndas();
    let faltanPorEntrar = false;
    // ¿equipo lento? La física corre en todos los cuadros; lo que se espacia es escribirle al navegador
    if (hayOnda && onda.carga) { const c = onda.carga(); if (c > T.cargaLenta) lento = true; else if (c < T.cargaNormal) lento = false; }
    const escribir = !lento || (++cuenta & 1) === 0;

    for (const L of letras) {
      // empuje del puntero y de las ondas de choque: el mismo que sienten los puntos del patrón
      let tx = 0, ty = 0, anillo = 0, toca = false;
      if (hayOnda) {
        onda.fuerzaEn(ox + L.cx, oy + L.cy, F);
        tx = F.x * T.fuerza; ty = F.y * T.fuerza; anillo = F.anillo; toca = F.toca;
        const m = Math.hypot(tx, ty);
        if (m > T.tope) { tx *= T.tope / m; ty *= T.tope / m; }
      }
      // resorte amortiguado: responde rápido al empujón y vuelve con calma
      const k = toca ? k0 * atk : k0, c = toca ? c0 * Math.sqrt(atk) : c0;
      L.vx += (k * (tx - L.dx) - c * L.vx) * dt; L.vy += (k * (ty - L.dy) - c * L.vy) * dt;
      L.dx += L.vx * dt; L.dy += L.vy * dt;
      if (!toca && Math.abs(L.dx) + Math.abs(L.dy) < 0.05 && Math.abs(L.vx) + Math.abs(L.vy) < 0.8) {
        L.dx = L.dy = L.vx = L.vy = 0; // llegó a casa
      } else vivo = true;

      // entrada: sube y aparece
      let sube = 0;
      if (entrando) {
        const p = Math.min(1, Math.max(0, (tEntrada - L.espera) / en.duracion));
        const s = 1 - Math.pow(1 - p, 3);
        sube = (1 - s) * en.subir * alto;
        const op = Math.min(1, p * 2.2);
        if (escribir) {
          if (op >= 1) { if (!L.opaca) { L.el.style.opacity = ''; L.opaca = true; } }
          else L.el.style.opacity = op.toFixed(3);
        }
        if (p < 1 || !L.opaca) faltanPorEntrar = true;
      }
      if (!escribir) continue;

      // escribir (solo transform); en reposo no queda nada puesto
      let tr = '';
      if (L.dx !== 0 || L.dy !== 0 || sube !== 0 || anillo > 0.004) {
        const giro = Math.max(-T.giroMax, Math.min(T.giroMax, L.dx * T.giro));
        tr = `translate3d(${L.dx.toFixed(2)}px,${(L.dy + sube).toFixed(2)}px,0) rotate(${giro.toFixed(2)}deg)`;
        if (anillo > 0.004) tr += ` scale(${(1 + T.crecer * Math.min(1, anillo)).toFixed(4)})`;
      }
      if (tr !== L.puesto) { L.el.style.transform = tr; L.puesto = tr; }
    }

    if (entrando && !faltanPorEntrar) entrando = false;
    if (!escribir) { raf = requestAnimationFrame(cuadro); return; }
    // Todo en su sitio durante medio segundo: a dormir (el ciclo se detiene del todo)
    ocio = vivo || entrando ? 0 : ocio + 1;
    if (ocio < (lento ? 15 : 30)) raf = requestAnimationFrame(cuadro);
    else h1.classList.remove('tl-activo');
  }

  // Despertar: cuando el puntero se mueve o toca, y cuando la onda avisa de un clic
  window.addEventListener('pointermove', cerca, { passive: true });
  window.addEventListener('pointerdown', cerca, { passive: true });
  window.addEventListener('atena:onda', despertar);
  window.addEventListener('scroll', () => { caja = h1.getBoundingClientRect(); despertar(); }, { passive: true }); // la página se mueve bajo el puntero
  let pendiente = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => { medirCasas(); caja = h1.getBoundingClientRect(); despertar(); });
  });

  // Dormir también cuando el titular sale de la vista
  new IntersectionObserver(([e]) => {
    aLaVista = e.isIntersecting;
    caja = h1.getBoundingClientRect();
    if (aLaVista) despertar();
  }).observe(h1);

  despertar(); // la entrada

  // Diagnóstico (consola): atenaTitular.info()
  window.atenaTitular = {
    T,
    info: () => ({
      letras: letras.length, despierto: !!raf, entrando, equipoLento: lento,
      desvioMaximoPx: +Math.max(...letras.map(L => Math.abs(L.dx) + Math.abs(L.dy))).toFixed(2),
      transformsPuestos: letras.filter(L => L.el.style.transform).length,
      opacidadesPuestas: letras.filter(L => L.el.style.opacity).length,
    }),
  };
})();
