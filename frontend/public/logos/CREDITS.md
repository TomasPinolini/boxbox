# Logos de escuderías — origen y licencia

Las **11** escuderías tienen logo. Vienen de una imagen compuesta (una grilla con las 11
marcas, fondo blanco) que el usuario del proyecto encontró y pasó el 2026-10-15 — **origen y
licencia exactos sin confirmar**, a diferencia del lote anterior que sí tenía cada archivo
rastreado hasta su página de Commons. Cada celda se recortó a mano, se le sacó el fondo blanco
con ImageMagick (`-transparent white`) y se centró sobre un lienzo **cuadrado** de 240x240
transparente (`-gravity center -extent 240x240`).

Lo cuadrado no es estético, es necesario: `ConstructorLogo.tsx` pone `object-left` en el
`<img>` (no `object-center`), así que una marca con una proporción muy apaisada — como salió
de este recorte antes de cuadrarla, hasta 3.8:1 en Aston Martin — queda pegada al borde
izquierdo del chip en vez de centrada. El lienzo cuadrado hace que la proporción deje de
importar, sin tocar el componente compartido.

Son **marcas, no wordmarks**: el speedmark de McLaren, la estrella de Mercedes, la "A" de
Alpine, el escudo de Ferrari, los toros de Red Bull Racing, las alas de Aston Martin, los
cuatro aros de Audi, la "H" de Haas, la "W" de Williams, el toro de Racing Bulls, el escudo de
Cadillac. El criterio lo fija el tamaño más chico en que se usan, 24 px en `ConstructorLogo`
(tabla del campeonato, listas, draft) — un logo apaisado con el nombre del equipo adentro, a
24 px, es una mancha; una marca se sigue reconociendo.

| Archivo | Marca |
| --- | --- |
| `alpine.png` | la "A" |
| `aston_martin.png` | las alas |
| `audi.png` | los cuatro aros |
| `cadillac.png` | el escudo (versión vigente del equipo de F1, no el crest clásico de GM) |
| `ferrari.png` | el escudo (cavallino) |
| `haas.png` | la "H" |
| `mclaren.png` | el speedmark |
| `mercedes.png` | la estrella |
| `rb.png` | el toro (Racing Bulls) |
| `red_bull.png` | los dos toros + sol (Red Bull Racing) |
| `williams.png` | la "W" |

Reemplaza dos lotes anteriores: uno de Wikimedia Commons (dominio público, solo 5 de las 11) y
uno de agregadores sin licencia en `logos/temporales/` (otras 5, carpeta ya borrada). Este
lote sí cubre las 11 de una, incluidas Aston Martin y Williams, que antes quedaban sin logo
porque ninguna fuente libre tenía la marca sola, separada del wordmark.

Las marcas son casi del mismo color que el fondo del equipo en varios casos (McLaren naranja
sobre naranja, Alpine azul sobre azul) — es esperable, estos archivos están pensados para el
chip blanco de `ConstructorLogo`, no para mostrarse sobre el color de la escudería. Para eso
existe `frontend/public/team-marks/` por separado, con versiones monocromas pensadas
justamente para ese uso (ver su propio `CREDITS.md`).

`clasicos/renault.png` y `clasicos/tyrrell.png` no los referencia ni el seed ni la interfaz:
quedaron de una prueba anterior, sin relación con este lote.

## Aclaración importante

"Dominio público" en Commons casi siempre significa que el logo **no alcanza el umbral de
originalidad** para tener copyright propio. **No quiere decir que sea libre de marca**: los
logos siguen siendo marcas registradas de cada escudería. Se usan acá para identificar a los
equipos reales en un trabajo práctico universitario sin fines comerciales, que es uso
nominativo. No reutilizar en un contexto comercial sin revisar esto.

## Fotos de pilotos

Las **fotos de pilotos** sí están en el repositorio, en `frontend/public/drivers/` — hasta
2026-10-14 se referenciaban por URL contra el CDN de F1.com y no se guardaban acá; se
cambió de criterio para poder recortarlas (ver abajo) sin depender de que esa URL exista
para siempre. Son material de prensa de Formula One, igual que antes; el repositorio las usa
con el mismo criterio de uso nominativo que los logos de arriba — identificar a pilotos
reales en un trabajo práctico universitario sin fines comerciales — no una licencia libre
declarada por la fuente.

Las originales se bajaron a mano del CDN de F1.com (`media.formula1.com`) y se recortaron al
primer tercio superior (cara + torso, donde está el logo de la escudería) con ImageMagick:

```
convert original.avif -gravity North -crop 440x422+0+0 +repage frontend/public/drivers/<externalId>.png
```

`driverHeadshots` en `backend/prisma/seed.ts` guarda la ruta relativa (`/drivers/<externalId>.png`),
mismo patrón que `teamLogos`/`Constructor.logoUrl` con `frontend/public/logos/`.
