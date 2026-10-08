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
| `williams.png` | la "W" | `Williams Racing Monogram.png` | **CC BY-SA 4.0** — atribución y compartir igual |
| `clasicos/ligier.png` | — | — | CC BY-SA 4.0 — atribución y compartir igual |
| `clasicos/renault.png` | — | — | Dominio público |
| `clasicos/tyrrell.png` | — | — | Dominio público |

Los tres de `clasicos/` no los referencia ni el seed ni la interfaz: quedaron de una prueba
anterior.

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

Las **fotos de pilotos** no están en este repositorio: son material de prensa de Formula One
y se referencian por URL contra su CDN, en el campo `Driver.headshotUrl` que puebla
`backend/prisma/seed.ts`. Las URLs salieron de la API pública de OpenF1.
