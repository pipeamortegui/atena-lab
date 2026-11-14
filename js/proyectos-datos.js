// Atena Lab — DATOS de la barra de proyectos (sección Work)
//
// Este es el único archivo que hay que tocar para cambiar lo que muestra la barra.
// Cada renglón entre llaves { } es una tarjeta, y salen en la pantalla en este mismo orden.
//
//   titulo  → nombre del proyecto (se escribe en mayúsculas solo; aquí va normal).
//   dato    → una línea corta debajo del nombre: lugar, año o tipo. Ej.: "Bogotá · 2026".
//   imagen  → ruta de la portada, guardada en assets/proyectos/.
//             Formato vertical 5:7. Tamaño recomendado: 1000 × 1400 px, en .webp o .jpg,
//             ojalá por debajo de 250 KB. Si la foto tiene otra proporción no se deforma:
//             se recorta sola desde el centro.
//   enlace  → opcional. Dirección a la que lleva la tarjeta cuando está al centro
//             (una página del proyecto, un PDF, un sitio). Si no hay, se deja "".
//
// La barra funciona con 3 a 20 proyectos. Para añadir uno: copiar un renglón completo,
// pegarlo donde corresponda y cambiarle los textos. Cuidar las comas al final de cada renglón.
//
// Ojo: index.html guarda una copia de respaldo de estas tarjetas (dentro de <ul class="pb-track">)
// para los navegadores sin JavaScript. Al cambiar los proyectos aquí, hay que actualizar también esa copia.
//
// LO QUE HAY HOY SON TARJETAS DE MUESTRA (no son proyectos reales): se reemplazan todas.

window.ATENA_PROYECTOS = [
  { titulo: "Project 01", dato: "Coming soon", imagen: "assets/proyectos/muestra-01.svg", enlace: "" },
  { titulo: "Project 02", dato: "Coming soon", imagen: "assets/proyectos/muestra-02.svg", enlace: "" },
  { titulo: "Project 03", dato: "Coming soon", imagen: "assets/proyectos/muestra-03.svg", enlace: "" },
  { titulo: "Project 04", dato: "Coming soon", imagen: "assets/proyectos/muestra-04.svg", enlace: "" },
  { titulo: "Project 05", dato: "Coming soon", imagen: "assets/proyectos/muestra-05.svg", enlace: "" },
  { titulo: "Project 06", dato: "Coming soon", imagen: "assets/proyectos/muestra-06.svg", enlace: "" },
  { titulo: "Project 07", dato: "Coming soon", imagen: "assets/proyectos/muestra-07.svg", enlace: "" },
];
