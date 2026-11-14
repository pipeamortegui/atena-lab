// Atena Lab — barra de proyectos curva (sección Work)
// Carrusel 3D propio, sin bibliotecas. Lee la lista de js/proyectos-datos.js,
// arma las tarjetas y las acomoda en arco. Se navega con clic, arrastre (mouse o dedo),
// rueda horizontal o trackpad, flechas del teclado y los botones anterior / siguiente.
// Además avanza sola de un proyecto al siguiente, en bucle (ver AVANCE aquí abajo).
(() => {
  'use strict';

  // ---------- Avance automático: lo único que hay que tocar para cambiar su ritmo o apagarlo ----------
  const AVANCE = {
    activo: true,     // false = la barra no avanza sola (y desaparece el botón de pausa)
    cadaMs: 4000,     // tiempo entre un giro y el siguiente, en milisegundos (4000 = 4 segundos)
    esperaMs: 7000,   // después de que alguien navega a mano, cuánto espera antes de retomar
  };

  const raiz = document.getElementById('proyectos');
  if (!raiz) return;
  const escena = raiz.querySelector('.pb-stage');
  const pista = raiz.querySelector('.pb-track');
  const controles = raiz.querySelector('.pb-controles');
  const elActual = raiz.querySelector('.pb-actual');
  const elTotal = raiz.querySelector('.pb-total');
  const elVoz = raiz.querySelector('.pb-voz');
  const datos = (Array.isArray(window.ATENA_PROYECTOS) ? window.ATENA_PROYECTOS : []).filter(p => p && p.titulo);
  const n = datos.length;
  if (!escena || !pista || !n) return;

  // ---------- Forma del arco (todo en «anchos de tarjeta», así escala con la pantalla) ----------
  // Fondo, giro y velo crecen rápido en las primeras tarjetas y se van frenando: valor = tope × (1 − e^(−ritmo × distancia)).
  // La separación suma además un tramo parejo por tarjeta (sepPaso), para que las lejanas no se monten unas sobre otras.
  const FORMA = {
    sepPaso: .677, sepTope: .346,     // separación entre tarjetas
    fondoTope: 3.8, fondoRitmo: .36,  // cuánto se alejan (y por eso se ven más pequeñas)
    giroTope: 52, giroRitmo: .75,     // grados que giran hacia el centro
    veloTope: .7, veloRitmo: .45,     // cuánto se oscurecen
  };
  const VISIBLES = { escritorio: 4.5, celular: 2.5 };   // hasta qué distancia del centro se dibujan tarjetas
  const PERSPECTIVA = 3.6;  // distancia del ojo, en anchos de tarjeta
  const RESORTE = 10;       // rapidez del encaje: con 10, el giro se asienta en unos 600 ms

  const mqCelular = window.matchMedia('(max-width: 760px)');
  const mqQuieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mod = (a, m) => ((a % m) + m) % m;
  const envolver = d => d - n * Math.round(d / n);   // distancia más corta dando la vuelta
  const dos = v => String(v).padStart(2, '0');
  const curva = (tope, ritmo, t) => tope * (1 - Math.exp(-ritmo * t));
  const separacion = t => FORMA.sepPaso * t + curva(FORMA.sepTope, 1, t);   // en anchos de tarjeta, ya proyectada en pantalla

  // ---------- Tarjetas ----------
  const items = [];
  const tarjetas = [];
  const imagenes = [];
  const fragmento = document.createDocumentFragment();
  datos.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'pb-item';
    li.setAttribute('aria-posinset', i + 1);
    li.setAttribute('aria-setsize', n);

    const tarjeta = document.createElement(p.enlace ? 'a' : 'button');
    tarjeta.className = 'pb-card';
    if (p.enlace) {
      tarjeta.href = p.enlace;
      if (/^https?:\/\//i.test(p.enlace)) { tarjeta.target = '_blank'; tarjeta.rel = 'noopener'; }
    } else {
      tarjeta.type = 'button';
    }
    tarjeta.draggable = false;

    if (p.imagen) {
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async';
      img.width = 1000; img.height = 1400;
      img.alt = ''; img.draggable = false;
      img.src = p.imagen;
      tarjeta.appendChild(img);
      imagenes.push(img);
    } else {
      imagenes.push(null);
    }

    const pie = document.createElement('span');
    pie.className = 'pb-cap';
    const titulo = document.createElement('span');
    titulo.className = 'pb-titulo';
    titulo.textContent = p.titulo;
    pie.appendChild(titulo);
    if (p.dato) {
      const dato = document.createElement('span');
      dato.className = 'pb-dato';
      dato.textContent = p.dato;
      pie.appendChild(dato);
    }
    const velo = document.createElement('span');
    velo.className = 'pb-velo';
    tarjeta.append(pie, velo);

    li.appendChild(tarjeta);
    fragmento.appendChild(li);
    items.push(li);
    tarjetas.push(tarjeta);
  });
  pista.replaceChildren(fragmento);
  if (elTotal) elTotal.textContent = dos(n);

  // ---------- Estado ----------
  let pos = 0;          // posición continua (2.4 = entre la tarjeta 3 y la 4)
  let vel = 0;          // tarjetas por segundo
  let objetivo = 0;     // tarjeta entera donde debe encajar
  let actual = -1;      // índice marcado como activo (0 … n−1)
  let visibles = VISIBLES.escritorio;
  let W = 0, P = 0, paso = 1, limite = 1;
  let raf = 0, tPrev = 0;
  let cerca = false;    // la barra ya estuvo cerca de la pantalla: se pueden precargar vecinas
  let tVoz = 0;

  function medir() {
    visibles = mqCelular.matches ? VISIBLES.celular : VISIBLES.escritorio;
    const ancho = (items.find(el => el.offsetWidth) || items[0]).offsetWidth;   // una tarjeta que se esté dibujando
    if (ancho) W = ancho;
    P = PERSPECTIVA * W;
    pista.style.perspective = P + 'px';
    paso = Math.max(1, W * separacion(1));   // píxeles entre el centro y la primera vecina
    limite = Math.min(n / 2, visibles);
  }

  // Acomoda cada tarjeta según su distancia al centro.
  function pintar() {
    if (!W) return;
    for (let i = 0; i < n; i++) {
      const el = items[i];
      const d = envolver(i - pos);
      const t = Math.abs(d);
      const opacidad = Math.max(0, Math.min(1, (limite - t) / .5));
      if (opacidad <= 0 && i !== actual) { el.style.display = 'none'; continue; }   // fuera de alcance: no se dibuja ni carga su imagen
      const lado = d < 0 ? -1 : 1;
      const z = -W * curva(FORMA.fondoTope, FORMA.fondoRitmo, t);       // se aleja
      const x = lado * W * separacion(t) * (P - z) / P;                // se corrige para que la perspectiva no la encoja
      const giro = -lado * curva(FORMA.giroTope, FORMA.giroRitmo, t);  // gira hacia el centro
      el.style.display = '';
      el.style.opacity = opacidad.toFixed(3);
      el.style.zIndex = String(200 - Math.round(t * 20));
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${giro.toFixed(3)}deg)`;
      el.style.setProperty('--pb-velo', curva(FORMA.veloTope, FORMA.veloRitmo, t).toFixed(3));
    }
  }

  // Marca cuál es la tarjeta activa: contador, aria-current y cuál recibe el foco con Tab.
  function marcar(idx, anunciar = true) {
    if (idx === actual) return;
    const primera = actual < 0;   // al cargar no se anuncia nada: solo cuando alguien navega
    actual = idx;
    for (let i = 0; i < n; i++) {
      const activa = i === idx;
      items[i].classList.toggle('es-activa', activa);
      if (activa) items[i].setAttribute('aria-current', 'true'); else items[i].removeAttribute('aria-current');
      tarjetas[i].tabIndex = activa ? 0 : -1;
    }
    if (elActual) elActual.textContent = dos(idx + 1);
    if (elVoz && !primera && anunciar) {   // los giros automáticos no se anuncian: saturarían a un lector de pantalla
      clearTimeout(tVoz);
      tVoz = setTimeout(() => { elVoz.textContent = `${datos[idx].titulo}, ${idx + 1} of ${n}`; }, 350);
    }
    precargar();
  }

  // Las imágenes cargan con loading="lazy"; las vecinas de la activa se piden antes para que no lleguen en blanco.
  function precargar() {
    if (!cerca) return;
    const alcance = Math.floor(visibles);
    for (let i = 0; i < n; i++) {
      const img = imagenes[i];
      if (img && img.loading !== 'eager' && Math.abs(envolver(i - actual)) <= alcance) img.loading = 'eager';
    }
  }

  // ---------- Movimiento: resorte con amortiguación crítica (frena sin rebotar) ----------
  function detener() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; vel = 0;
  }
  function reposar() {
    const k = mod(objetivo, n);
    pos = k; objetivo = k; vel = 0;
  }
  function cuadro(ahora) {
    const dt = Math.max(0, (ahora - tPrev) / 1000);
    tPrev = ahora;
    const x = pos - objetivo;
    const e = Math.exp(-RESORTE * dt);
    const b = vel + RESORTE * x;
    pos = objetivo + (x + b * dt) * e;
    vel = (b - RESORTE * (x + b * dt)) * e;
    if (Math.abs(pos - objetivo) < .0006 && Math.abs(vel) < .006) {
      raf = 0;
      reposar();
    } else {
      raf = requestAnimationFrame(cuadro);
    }
    pintar();
  }
  function irA(k, velocidadInicial, automatico = false) {
    objetivo = k;
    if (typeof velocidadInicial === 'number') vel = velocidadInicial;
    marcar(mod(k, n), !automatico);
    if (mqQuieto.matches || document.hidden) {   // sin animación de giro: salta directo
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      reposar();
      pintar();
      return;
    }
    if (!raf) { tPrev = performance.now(); raf = requestAnimationFrame(cuadro); }
  }
  const mover = pasos => irA(objetivo + pasos);

  // ---------- Avance automático ----------
  // Un solo temporizador, que se vuelve a armar después de cada giro: así nunca se acumulan giros atrasados.
  // Gira solo si nada lo impide: ni pausa, ni puntero encima de las tarjetas, ni foco de teclado dentro,
  // ni dedo o botón apretado, ni la barra fuera de la pantalla, ni la pestaña oculta, ni «reducir movimiento».
  const btnPausa = raiz.querySelector('.pb-pausa');
  let tAvance = 0;
  let noAntesDe = 0;       // tras una navegación a mano, no retomar antes de este instante
  let pausado = false;     // lo decidió la persona con el botón de pausa
  let encima = false;      // puntero del mouse sobre las tarjetas
  let tocando = false;     // dedo o botón del mouse apretado sobre la barra
  let enVista = !('IntersectionObserver' in window);
  const hayAvance = () => AVANCE.activo && n > 1 && !mqQuieto.matches;
  const focoDeTeclado = () => {
    const a = document.activeElement;
    if (!a || a === btnPausa || !raiz.contains(a)) return false;
    try { return a.matches(':focus-visible'); } catch (_) { return true; }
  };
  const puedeGirar = () => hayAvance() && !pausado && enVista && !document.hidden && !encima && !tocando && !focoDeTeclado();
  function armar(ms) {
    clearTimeout(tAvance);
    tAvance = 0;
    if (puedeGirar()) tAvance = setTimeout(girar, ms);
  }
  function girar() {
    tAvance = 0;
    if (!puedeGirar()) return;
    irA(objetivo + 1, undefined, true);   // siempre hacia adelante: de la última pasa a la primera sin rebobinar
    armar(AVANCE.cadaMs);
  }
  // Se llama cada vez que cambia algo que lo frena o lo suelta: vuelve a contar desde cero.
  const retomar = () => armar(Math.max(AVANCE.cadaMs, noAntesDe - performance.now()));
  // Alguien navegó a mano: se le deja más tiempo con la tarjeta que eligió.
  const manual = () => { noAntesDe = performance.now() + AVANCE.esperaMs; retomar(); };
  function pintarPausa() {
    raiz.classList.toggle('con-avance', hayAvance());
    raiz.classList.toggle('en-pausa', pausado);
    if (btnPausa) btnPausa.setAttribute('aria-label', pausado ? 'Resume auto-advance' : 'Pause auto-advance');
  }

  // ---------- Clic: una lateral viene al centro; la central abre su enlace si lo tiene ----------
  let bloquearClic = false;
  escena.addEventListener('click', e => {       // el clic que cierra un arrastre no cuenta
    if (!bloquearClic) return;
    bloquearClic = false;
    e.preventDefault(); e.stopPropagation();
  }, true);
  pista.addEventListener('click', e => {
    const tarjeta = e.target.closest('.pb-card');
    if (!tarjeta) return;
    const i = tarjetas.indexOf(tarjeta);
    if (i < 0 || i === mod(objetivo, n)) return;
    e.preventDefault();
    irA(objetivo + envolver(i - objetivo));
  });

  // ---------- Arrastre con mouse o dedo, con inercia y encaje ----------
  let arr = null;
  escena.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    bloquearClic = false;
    arr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos0: pos, activo: false, muestras: [] };
    tocando = true;
    retomar();
  });
  escena.addEventListener('pointermove', e => {
    if (!arr || e.pointerId !== arr.id) return;
    if (!arr.activo) {
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { arr = null; return; }   // el botón se soltó fuera de la barra
      const dx = e.clientX - arr.x0, dy = e.clientY - arr.y0;
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;   // aún no es un arrastre horizontal
      arr.activo = true;
      arr.pos0 = pos; arr.origen = Math.round(pos);
      bloquearClic = true;
      detener();
      try { escena.setPointerCapture(arr.id); } catch (_) { /* sin captura también funciona */ }
      raiz.classList.add('arrastrando');
    }
    pos = arr.pos0 - (e.clientX - arr.x0) / paso;
    arr.muestras.push({ t: e.timeStamp, p: pos });
    if (arr.muestras.length > 12) arr.muestras.shift();
    marcar(mod(Math.round(pos), n));
    pintar();
  });
  function soltar(e) {
    if (!arr || e.pointerId !== arr.id) return;
    const a = arr;
    arr = null;
    if (!a.activo) return;
    raiz.classList.remove('arrastrando');
    try { escena.releasePointerCapture(a.id); } catch (_) { /* ya estaba suelta */ }
    // Velocidad de los últimos 120 ms: de ahí sale la inercia.
    const m = a.muestras.filter(s => e.timeStamp - s.t <= 120);
    let v = 0;
    if (m.length >= 2) {
      const dt = Math.max(.04, (m[m.length - 1].t - m[0].t) / 1000);   // el piso evita velocidades disparatadas con pocas muestras
      v = (m[m.length - 1].p - m[0].p) / dt;
    }
    v = Math.max(-10, Math.min(10, v));                                 // un golpe fuerte suma, como mucho, dos tarjetas
    let destino = Math.round(pos + v * .2);
    if (destino === a.origen && Math.abs(v) > .9) destino += Math.sign(v);   // un toque rápido y corto también pasa una
    irA(destino, v);
    manual();
  }
  escena.addEventListener('pointerup', soltar);
  escena.addEventListener('pointercancel', soltar);
  escena.addEventListener('dragstart', e => e.preventDefault());

  // ---------- Rueda horizontal o trackpad (la vertical se deja pasar: mueve la página) ----------
  let tRueda = 0, ruedaOrigen = 0;
  escena.addEventListener('wheel', e => {
    const ax = Math.abs(e.deltaX);
    if (!ax || ax <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    let dx = e.deltaX;
    if (e.deltaMode === 1) dx *= 32; else if (e.deltaMode === 2) dx *= W;
    if (!tRueda) { detener(); ruedaOrigen = Math.round(pos); }
    manual();
    pos += dx / (paso * 1.15);
    marcar(mod(Math.round(pos), n));
    pintar();
    clearTimeout(tRueda);
    tRueda = setTimeout(() => {
      tRueda = 0;
      let destino = Math.round(pos);
      if (destino === ruedaOrigen && Math.abs(pos - ruedaOrigen) > .1) destino += Math.sign(pos - ruedaOrigen);
      irA(destino);
    }, 140);
  }, { passive: false });

  // ---------- Teclado (cuando el foco está dentro de la barra) ----------
  raiz.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    let destino;
    if (e.key === 'ArrowRight') destino = objetivo + 1;
    else if (e.key === 'ArrowLeft') destino = objetivo - 1;
    else if (e.key === 'Home') destino = objetivo + envolver(0 - objetivo);
    else if (e.key === 'End') destino = objetivo + envolver(n - 1 - objetivo);
    else return;
    e.preventDefault();
    const focoEnTarjeta = pista.contains(document.activeElement);
    irA(destino);
    manual();
    if (focoEnTarjeta) {
      items[actual].style.display = '';
      tarjetas[actual].focus({ preventScroll: true });
    }
  });

  // ---------- Botones ----------
  const btnPrev = raiz.querySelector('.pb-prev');
  const btnNext = raiz.querySelector('.pb-next');
  if (btnPrev) btnPrev.addEventListener('click', () => mover(-1));
  if (btnNext) btnNext.addEventListener('click', () => mover(1));
  if (controles && n < 2) controles.style.display = 'none';

  // ---------- Qué frena y qué suelta el avance automático ----------
  raiz.addEventListener('click', e => {                 // cualquier clic en la barra es navegación a mano…
    if (btnPausa && btnPausa.contains(e.target)) return; // …menos el del propio botón de pausa
    manual();
  });
  if (btnPausa) btnPausa.addEventListener('click', () => {
    pausado = !pausado;
    pintarPausa();
    retomar();
  });
  escena.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') { encima = true; retomar(); } });
  escena.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { encima = false; retomar(); } });
  const finToque = () => { if (tocando) { tocando = false; retomar(); } };
  window.addEventListener('pointerup', finToque);
  window.addEventListener('pointercancel', finToque);
  raiz.addEventListener('focusin', () => setTimeout(retomar, 0));
  raiz.addEventListener('focusout', () => setTimeout(retomar, 0));
  document.addEventListener('visibilitychange', retomar);
  const alCambiarQuieto = () => { pintarPausa(); retomar(); };
  if (mqQuieto.addEventListener) mqQuieto.addEventListener('change', alCambiarQuieto);
  else if (mqQuieto.addListener) mqQuieto.addListener(alCambiarQuieto);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entradas => {
      enVista = entradas[entradas.length - 1].intersectionRatio >= .3;   // cuenta como «a la vista» con un tercio de la barra en pantalla
      if (!enVista) encima = false;
      retomar();
    }, { threshold: [0, .3] }).observe(escena);
  }

  // ---------- Arranque ----------
  raiz.classList.add('es-3d');
  medir();
  marcar(0);
  pintar();
  pintarPausa();
  retomar();

  if ('ResizeObserver' in window) new ResizeObserver(() => { medir(); pintar(); }).observe(escena);
  else window.addEventListener('resize', () => { medir(); pintar(); });

  if ('IntersectionObserver' in window) {
    const vigia = new IntersectionObserver(entradas => {
      if (entradas.some(en => en.isIntersecting)) { cerca = true; precargar(); vigia.disconnect(); }
    }, { rootMargin: '600px 0px' });
    vigia.observe(raiz);
  } else {
    cerca = true; precargar();
  }
})();
