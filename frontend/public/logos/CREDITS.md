# Logos de escuderías — origen y licencia

Todos descargados de **Wikimedia Commons** y reescalados a 240 px de alto.

Son **marcas, no wordmarks**: el speedmark de McLaren, la estrella de Mercedes, la "A" de
Alpine. El criterio lo fija el tamaño más chico en que se usan, 24 px en la tabla del
campeonato. Un logo apaisado con el nombre del equipo adentro, a 24 px, es una mancha; una
marca se sigue reconociendo. En `alpine`, `cadillac` y `haas` el archivo de Commons traía el
wordmark debajo y se recortó para quedarse sólo con la marca. A `cadillac.png` además se le
quitó el fondo blanco, porque el original es un WebP sin canal alfa.

| Archivo | Marca | Archivo original en Commons | Licencia declarada |
| --- | --- | --- | --- |
| `alpine.png` | la "A" | `Alpine F1 Team Logo.svg` | Dominio público |
| `cadillac.png` | el escudo | `Cadillac Logo 1995.webp` | Dominio público |
| `haas.png` | la "H" | `TGR Haas F1 Team Logo (2026).svg` | Dominio público |
| `mclaren.png` | el speedmark | `McLaren Speedmark.svg` | Dominio público |
| `mercedes.png` | la estrella | `Mercedes-Benz Star 2022.svg` | Dominio público |
| `clasicos/renault.png` | — | — | Dominio público |
| `clasicos/tyrrell.png` | — | — | Dominio público |

Los dos de `clasicos/` no los referencia ni el seed ni la interfaz: quedaron de una prueba
anterior.

## Borrados a propósito: `williams.png` y `clasicos/ligier.png`

Los dos eran **CC BY-SA 4.0**, la única licencia de esta tabla que además de atribución exige
**compartir igual**. Esa segunda obligación se propaga a la obra derivada, y cumplirla sobre un
PNG embebido en una SPA es incómodo de hacer bien y fácil de incumplir sin darse cuenta. Como el
costo de no tenerlos es cero — la UI ya cae al cuadrado con `Constructor.color`, ver
`features/drivers/team-color.ts` — se fueron. Williams queda sin logo; `teamLogos` en
`backend/prisma/seed.ts` ya no lo lista.

No es un juicio sobre CC BY-SA: es que para este caso la licencia pedía más de lo que el activo
valía.

**Sin logo**: Ferrari, Red Bull Racing, Aston Martin, Audi F1 Team y Racing Bulls. No es un
olvido, es una limitación de las fuentes libres: de ninguna de las cinco hay en Commons una
versión **cuadrada** de la marca con licencia libre. Del caballo de Ferrari y de los toros de
Red Bull sólo existen versiones con copyright; las alas de Aston Martin y los cuatro aros de
Audi son apaisados por diseño y no sobreviven a 24 px; Racing Bulls es un equipo demasiado
nuevo. La interfaz cae a un cuadrado con el color oficial del equipo, que ocupa exactamente
lo mismo y lo sigue identificando.

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
