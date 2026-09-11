# Logos de escuderías — origen y licencia

Todos descargados de **Wikimedia Commons** y reescalados a 240 px de alto con ImageMagick.
A `red-bull-racing.png` y `aston-martin.png` se les quitó el fondo blanco
(`-fuzz 8% -transparent white`) porque venían opacos.

| Archivo | Licencia declarada en Commons |
| --- | --- |
| `alpine.png` | CC0 1.0 |
| `aston-martin.png` | CC BY 4.0 — requiere atribución |
| `cadillac.png` | CC0 1.0 |
| `haas.png` | Dominio público |
| `mclaren.png` | Dominio público |
| `mercedes.png` | Dominio público |
| `red-bull-racing.png` | Dominio público |
| `williams.png` | CC0 1.0 |
| `clasicos/ligier.png` | CC BY-SA 4.0 — requiere atribución y compartir igual |
| `clasicos/renault.png` | Dominio público |
| `clasicos/tyrrell.png` | Dominio público |

**Sin logo**: Ferrari, Audi F1 Team y Racing Bulls. No había archivo usable con fondo
transparente en Commons. La interfaz cae al badge con el color del equipo.

## Aclaración importante

"Dominio público" en Commons casi siempre significa que el logo **no alcanza el umbral de
originalidad** para tener copyright propio. **No quiere decir que sea libre de marca**: los
logos siguen siendo marcas registradas de cada escudería. Se usan acá para identificar a los
equipos reales en un trabajo práctico universitario sin fines comerciales, que es uso
nominativo. No reutilizar en un contexto comercial sin revisar esto.

Las **fotos de pilotos** no están en este repositorio: son material de prensa de Formula One
y se referencian por URL contra su CDN, en el campo `Driver.headshotUrl` que puebla
`backend/prisma/seed.ts`. Las URLs salieron de la API pública de OpenF1.
