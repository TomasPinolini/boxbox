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
| `ferrari.png` | Ferrari | El cavallino es un dibujo figurativo: supera el umbral de originalidad, tiene copyright propio y por eso Commons no lo aloja |
| `audi.png` | Audi F1 Team | En Commons los cuatro aros existen pero sólo apaisados (2.8:1); a 24 px no sobreviven |

**Siguen faltando**: Red Bull Racing, Aston Martin y Racing Bulls. Ni Commons ni pngwing
tienen una versión cuadrada usable. Caen al cuadrado con el color del equipo.

## Qué hacer antes de un lanzamiento real

Borrar esta carpeta y poner `logoUrl` en `null` para esas escuderías en
`backend/prisma/seed.ts`, o reemplazar cada archivo por uno con licencia. El camino formal
está descrito en el mismo lugar donde se tomó esta decisión.
