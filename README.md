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
assets/fuentes/       Atena Sans (6 pesos, lisa) y Atena Sans Metal (Regular y SemiBold), en WOFF2
assets/marca/         referencias de marca: logo, símbolo, tipografía y la idea de portada
```

## Ver la página en tu PC

```
python -m http.server 8840
```

y abre <http://localhost:8840>.

## Decisiones y pendientes

- **Tipografía.** Los titulares, el menú y los rótulos usan **Atena Sans**, la fuente de marca (versión 1.020, `assets/fuentes/`). Los titulares grandes usan **Atena Sans Metal**, la misma letra con cuerpo metálico: es una fuente de color, así que el metal lo pinta la fuente; el degradado de `--metal` en el CSS queda de respaldo para navegadores que no dibujan fuentes de color. El texto corrido sigue en **Manrope** (Google Fonts). La fuente se genera por código fuera de este repositorio (carpeta `tipografias/atena-sans` del proyecto de modelado); aquí solo viven los archivos WOFF2. Para actualizarla se vuelven a copiar.
- **Logotipo.** El de la cabecera y el pie es `assets/marca/logo-atena-lab.svg`: vector generado con la misma fuente («ATENA» en Extended, «LAB» en Light, cada letra en la posición medida en el logo original). El original en imagen sigue en `assets/marca/logo-atena-lab.webp` y se usa para la vista previa al compartir el enlace.
- **Contenido.** Work, Research, Lab y About están vacías ("Coming soon") hasta definir textos y proyectos.
- **Onda.** Los parámetros (número de líneas y puntos, dónde se tuerce, velocidad) están arriba de `js/onda.js`, en el objeto `P`. Respeta "reducir movimiento" del sistema (queda quieta) y solo se anima mientras la portada está a la vista.
