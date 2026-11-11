# Atena Lab

**Design · Intelligence · Technology** — página web de Atena Lab.

Sitio estático (HTML + CSS + JavaScript, sin compilación). Se publica tal cual con GitHub Pages.

## Estructura

```
index.html            portada (onda animada + titular) y secciones Work, Research, Lab, About
css/style.css         estilos: fondo negro, texto metálico, tipografías, versión celular
js/onda.js            la onda de la portada: líneas que se tuercen y se vuelven puntos (canvas)
js/main.js            menú del celular y año del pie
assets/favicon.svg    ícono de la pestaña (la A de Atena)
assets/marca/         referencias de marca: logo, símbolo, tipografía y la idea de portada
```

## Ver la página en tu PC

```
python -m http.server 8840
```

y abre <http://localhost:8840>.

## Decisiones y pendientes

- **Tipografía.** *Atena Sans* existe por ahora como imagen de concepto (`assets/marca/tipografia-atena-sans.webp`), no como archivo de fuente. Mientras tanto, los titulares usan **Michroma** (Google Fonts, geométrica y ancha, la más cercana) y el texto corrido **Manrope**.
- **Logotipo.** El de la cabecera es un **dibujo vectorial aproximado** del logo (`<symbol id="wordmark">` en `index.html`), hecho a mano con trazos. El logo original es una imagen (`assets/marca/logo-atena-lab.webp`); lo ideal es tener el vector oficial (SVG) y reemplazar el símbolo.
- **Contenido.** Work, Research, Lab y About están vacías ("Coming soon") hasta definir textos y proyectos.
- **Onda.** Los parámetros (número de líneas y puntos, dónde se tuerce, velocidad) están arriba de `js/onda.js`, en el objeto `P`. Respeta "reducir movimiento" del sistema (queda quieta) y solo se anima mientras la portada está a la vista.
