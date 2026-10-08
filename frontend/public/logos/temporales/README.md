# Logos temporales — SIN LICENCIA VERIFICADA

> **Estos archivos no deben sobrevivir a un lanzamiento real.** Están acá sólo para que la
> entrega del TP se vea completa.

## Qué son

Descargados de agregadores que **no otorgan licencia**: [pngwing.com](https://www.pngwing.com/)
y [brandlogos.net](https://brandlogos.net/). Redistribuyen logos con copyright de terceros y
se cubren con un aviso de "uso personal no comercial" y un procedimiento DMCA. No hay cadena
de titularidad que se pueda citar, a diferencia de los archivos de la carpeta de arriba, que
vienen de Wikimedia Commons con su licencia declarada (ver `../CREDITS.md`).

| Archivo | Escudería | Por qué no hay versión libre |
| --- | --- | --- |
| `ferrari.png` | Ferrari | El cavallino es un dibujo figurativo: supera el umbral de originalidad, tiene copyright propio y Commons no puede alojarlo |
| `red-bull-racing.png` | Red Bull Racing | Ídem, los dos toros son figurativos. Recortado al emblema: el wordmark a 24 px no se lee |
| `racing-bulls.png` | Racing Bulls | Equipo demasiado nuevo; no está en Commons |
| `aston-martin.png` | Aston Martin | Las alas existen en Commons pero sólo apaisadas (2.4:1) |
| `audi.png` | Audi F1 Team | Ídem, los cuatro aros son 2.8:1 y a 24 px no sobreviven |

Con estos cinco, **las 11 escuderías tienen logo**: seis con licencia verificada de Commons,
cinco de acá.

## Advertencia sobre legibilidad

`aston-martin.png` a 24 px es prácticamente una mancha gris: las alas son un trazo fino y
plateado sobre fondo claro. El cuadrado verde del color oficial se distinguía mejor. Está
puesto igual porque es el logo real; si prioriza la legibilidad, sacarlo.

## Qué hacer antes de un lanzamiento real

Dos permisos distintos, y el segundo es el que importa:

1. **Derecho de autor** — el permiso para copiar el archivo. Se resuelve bajando el logo del
   *media kit* de cada equipo, que casi todos publican con condiciones de uso escritas.
2. **Marca registrada** — el permiso para usar la marca ajena dentro de un producto. No se
   compra en un banco de imágenes. Una fantasy league normalmente cae bajo **uso nominativo**:
   el equipo no se puede identificar sin su nombre, se usa lo mínimo necesario, y nada
   sugiere auspicio ni afiliación. Un descargo visible ("BoxBox no está afiliado a Formula 1,
   la FIA ni a ninguna escudería") es lo que más protege y es gratis.

Operativamente: borrar esta carpeta y poner `logoUrl` en `null` para esas cinco escuderías en
`backend/prisma/seed.ts`, o reemplazar cada archivo por uno del media kit. La interfaz ya
maneja el caso: cae al cuadrado con el color del equipo, que ocupa exactamente lo mismo.
