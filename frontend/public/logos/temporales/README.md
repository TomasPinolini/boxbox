# Logos temporales — SIN LICENCIA VERIFICADA

> **Estos archivos no deben sobrevivir a un lanzamiento real.** Están acá sólo para que la
> entrega del TP se vea completa.

## Qué son

Descargados de [pngwing.com](https://www.pngwing.com/), un agregador que **no otorga
licencia**: redistribuye logos con copyright de terceros y se cubre con un aviso de "uso
personal no comercial" y un procedimiento DMCA. No hay cadena de titularidad que se pueda
citar, a diferencia de los archivos de la carpeta de arriba, que vienen de Wikimedia Commons
con su licencia declarada (ver `../CREDITS.md`).

| Archivo | Escudería | Por qué no está en Commons |
| --- | --- | --- |
| `ferrari.png` | Ferrari | El cavallino es un dibujo figurativo: supera el umbral de originalidad, tiene copyright propio y Commons no puede alojarlo |
| `red-bull-racing.png` | Red Bull Racing | Ídem, los dos toros son figurativos. Recortado al emblema: el wordmark a 24 px no se lee |
| `aston-martin.png` | Aston Martin | Las alas existen en Commons pero sólo apaisadas (2.4:1) |
| `audi.png` | Audi F1 Team | Ídem, los cuatro aros son 2.8:1 y a 24 px no sobreviven |

**Sigue faltando Racing Bulls.** No está ni en Commons ni en pngwing. Lo único parecido que
devuelve la búsqueda es el logo de **Scuderia Toro Rosso** —el equipo predecesor, no el
actual— y un toro de dibujo genérico. Usar cualquiera de los dos sería inventar un activo de
marca que no existe, así que esa fila cae al cuadrado con el color del equipo.

## Advertencia sobre legibilidad

`aston-martin.png` a 24 px es prácticamente una mancha gris: las alas son un trazo fino y
plateado sobre fondo claro. El cuadrado verde del color oficial se distingue mejor. Está
puesto igual porque es el logo real; si prioriza la legibilidad, sacarlo.

## Qué hacer antes de un lanzamiento real

Borrar esta carpeta entera y poner `logoUrl` en `null` para esas cuatro escuderías en
`backend/prisma/seed.ts`, o reemplazar cada archivo por uno con licencia obtenida del
titular. La interfaz ya maneja el caso: cae al cuadrado con el color del equipo, que ocupa
exactamente lo mismo.
