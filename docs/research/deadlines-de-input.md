# Deadlines de input en apps de fantasy sobre eventos reales

**Relevado el 2026-10-15.** La pregunta: cómo las apps de fantasy y de predicciones sobre eventos
reales **fijan el deadline del input del participante**, qué pasa cuando el participante **no
entrega** ese input, si existe **penalización explícita** por no entregarlo, y qué **excepciones**
contemplan cuando el evento real se desvía de lo previsto (sesión cancelada, partido postergado,
piloto que no sale a pista).

Cómo se investigó: se fue al reglamento del operador de cada juego, no a blogs. Dos de las cinco
páginas clave (`fantasy.premierleague.com/help/rules` y `fantasy.formula1.com/en/game-rules|faqs`)
son SPAs: el HTML crudo no trae el texto, así que se leyeron a través del renderizador
`r.jina.ai` (`https://r.jina.ai/<url>`), que ejecuta el JS y devuelve el texto. Las citas apuntan
siempre a la URL canónica. `web.archive.org` y `pick6.draftkings.com` rechazan el fetch directo
(403); el segundo también se leyó vía `r.jina.ai`.

Cada afirmación lleva su clase de evidencia:

- **[primaria]** — texto del operador del juego: su página de reglas, sus FAQ oficiales, su
  centro de soporte, o un artículo editorial del propio dueño del deporte (premierleague.com,
  formula1.com).
- **[secundaria]** — sólo lo encontré en un tercero. Se dice cuál.
- **[inferido]** — se deduce de una regla primaria, pero el reglamento no lo dice con esas
  palabras. Nunca se completa con lo que "suele hacer una app de fantasy".
- **[no verificado]** — no lo pude confirmar. Queda listado en `## Huecos`.

---

## Tabla comparativa

| Caso | Momento del lock | Qué pasa con el no-input | ¿Penalización explícita? | Excepciones cuando el evento real se desvía |
|---|---|---|---|---|
| **F1 Fantasy** (fantasy.formula1.com) | Global por fin de semana: **al arrancar la Qualy**; en fin de semana de Sprint, **al arrancar el Sprint** | Si no llegaste al teamlock, "no empezás a sumar puntos hasta el GP siguiente". Si ya tenías equipo, queda **congelado** tal cual | **No por no entregar.** Sí hay penalizaciones por otras cosas: −10 por transfer de más, −5 Qualy sin tiempo, −20 DNF/NC — y **se aplican igual a pilotos inactivos** | El reglamento **no** contempla carrera/sesión cancelada. El riesgo "mi piloto no corre" se resuelve con chips (Final Fix, No Negative), no con una anulación |
| **Fantasy Premier League** | Global por Gameweek: **90 minutos antes del kick-off del primer partido** de la jornada | El equipo de la jornada anterior **sigue en pie**; los titulares que no jueguen se reemplazan por banco (auto-subs) | **No.** El único costo en puntos es −4 por transfer extra, que es por *actuar*, no por omitir | Las postergaciones están cubiertas por los **auto-subs** (la regla las nombra). No hay anulación de jornada en el reglamento. La PL se reserva cambiar las reglas a discreción |
| **ESPN Fantasy / Yahoo Fantasy** | **Por jugador**, al empezar su partido (default), o global al primer partido de la semana (opcional). En el draft: **30 s por pick** (default ESPN) | Lineup: lo que quedó queda, el banco no puntúa. Draft: **autopick** — cola → ranking propio → ranking del sitio | **No.** El autopick/autodraft es un sustituto, no un castigo. Ambas ofrecen automatismos opt-in (pre-rank, Start Active Players) | ESPN/Yahoo mueven el lock con el horario real del partido; Yahoo considera postergaciones al momento de correr Start Active Players. Nada se anula |
| **Bracket / pick'em** (ESPN Tournament Challenge, CBS Bracket Challenge) | **Una sola vez**: el tip-off del primer partido del torneo. Después nadie puede cambiar nada, "ni nosotros" | Sin bracket cargado antes del tip-off **no hay entrada**: queda afuera del torneo | **No.** La consecuencia es la no-participación | CBS: si un partido se cancela o hay forfeit, **"points may still be rewarded"** al equipo que avanza; y CBS puede cancelar o terminar antes el Challenge. NCAA.com: partido que no se juega → **sin puntos** [secundaria] |
| **DraftKings Pick6** (dinero real) | **Por entrada**: al enviarla. "Pick Sets may not be edited after they've been submitted" | No hay no-input posible: una entrada sin picks no existe. El mínimo es 2 picks (3 en CO) | **No por no entregar** — pero sí reglas duras de grading: pick de jugador que no cumple el mínimo de participación → **void** | Las únicas excepciones escritas con precisión legal del informe: partido reprogramado fuera del scoring period → pick **void**; jugador que no juega → **void**; si queda una sola pick válida o ninguna, **devolución del entry fee** |

---

## 1. F1 Fantasy oficial (fantasy.formula1.com)

**El lock.** El reglamento publicado no define el deadline; lo define F1 en sus artículos
semanales de F1 Fantasy, y es **el arranque de la sesión que abre el scoring del fin de semana**:
la Qualy en un fin de semana normal, el Sprint en un fin de semana de Sprint. Citas primarias, del
propio formula1.com:

> "Remember to lock in your teams before Qualifying begins in Baku on Friday at 1600 local time
> (1200 UTC)" … "and before the Sprint gets underway in Singapore at 1700 local time (0900 UTC)"
> — [Strategist Preview, triple header](https://www.formula1.com/en/latest/article/f1-fantasy-strategist-preview-your-guide-to-the-azerbaijan-bahrain-and-singapore-triple-header.NwohuVqzxV2nIP8cnVqy2) **[primaria]**

> "Remember to lock in your teams before the Sprint begins in Zandvoort at 1200 local time (1000
> UTC) on Saturday 22 August."
> — [Strategist Preview, GP de Países Bajos](https://www.formula1.com/en/latest/article/f1-fantasy-strategist-preview-what-you-need-to-know-for-the-dutch-grand-prix.2bBlmguc36rYcXurzQcz2O) **[primaria]**

Es un **lock global** del equipo entero, no por piloto: una sola hora por fin de semana corta todo
el input. Dato importante: **la FAQ oficial está desactualizada en este punto** y dice que el lock
es a lights-out (ver la cita de abajo). Dos páginas del mismo operador se contradicen; las
previews semanales son las que coinciden con el comportamiento de 2026.

**No-input.** Dos escenarios distintos, y el reglamento sólo cubre uno explícitamente:

> "You can join the game and start playing at any time. If you're a bit late to the grid (having
> missed qualifying, for example) you can still score points for the race providing you set up
> your team before the game is locked at lights-out. However, **if you miss the teamlock deadline
> you won't start scoring points until the next Grand Prix weekend.**"
> — [FAQs, "Can I still play after the season has started?"](https://fantasy.formula1.com/en/faqs) **[primaria]**

O sea: el que llega tarde **sin equipo** no puntúa esa carrera, y nada más. El que ya tiene equipo
y simplemente no toca nada **lo mantiene congelado** y puntúa normal — no hay otra lectura posible
de un juego cuyo input es un transfer opcional, pero el reglamento no lo dice con esas palabras
**[inferido]**.

**Penalización.** Acá está la distinción fina más interesante del informe. F1 Fantasy es la app con
**más penalizaciones explícitas** de las cinco, y **ninguna** castiga el no-entregar:

| Concepto | Puntos | Fuente |
|---|---|---|
| Transfer por encima de la asignación libre | **−10 por transfer** | [Game Rules](https://fantasy.formula1.com/en/game-rules) **[primaria]** |
| Qualy: NC / DSQ / sin tiempo en Q1 | **−5** | ídem |
| Sprint: Not Classified / DSQ | **−10** | ídem |
| Carrera: Not Classified / DSQ | **−20** | ídem |

Y el reglamento aclara, en el cuerpo de esas filas, que el castigo **alcanza al piloto que no
corrió**:

> "Drivers who do not set a time in Q1 will be given a 5 point penalty. **This includes inactive
> drivers.**" … "DNF/Not Classified penalties apply to all drivers, **including those classed as
> inactive or otherwise not included in the final starting grid list for the race**"
> — [Game Rules](https://fantasy.formula1.com/en/game-rules) **[primaria]**

> "Inactive drivers – What happens if one of my drivers isn't racing? If a driver is replaced,
> injured, or does not participate in Qualifying, the Sprint, or the Grand Prix, **they receive
> penalty points.** Use the Final Fix chip to change your team before each session to avoid
> penalties."
> — [FAQs](https://fantasy.formula1.com/en/faqs) **[primaria]**

Leído con cuidado: lo que se penaliza es **la cartera mal armada**, no el silencio del
participante. Si no entregás nada, no pasa nada; si entregaste y tu piloto no sale a pista, cobrás
−5 y −20. Es la inversión exacta de lo que uno esperaría.

**Excepciones.** No hay anulación ni recálculo escritos en ninguna parte. En vez de eso F1 Fantasy
**vende seguros**, en forma de chips de un uso por temporada:

> "Use the **Final Fix** chip and make a single change to your team between the end of Qualifying
> and the start of the Grand Prix. You will not incur a penalty if you've already used all of your
> free transfers… This chip is available after your team has completed one whole race weekend."

> "Use the **No Negative** chip and if any of your team members score a negative you will limit
> your loss at zero points for that driver or constructor."

> "**Autopilot** will change the Boost selection and give it to the highest scoring driver in your
> team, if that turns out to be different to your original choice."
> — [FAQs](https://fantasy.formula1.com/en/faqs) **[primaria]**

Final Fix es la única grieta en el lock global: reabre el input entre el final de la Qualy y la
largada, para un solo cambio. No Negative existe porque las penalizaciones de arriba son lo
bastante reales como para que valga la pena asegurarlas. Y Autopilot es un automatismo opt-in que
corrige una decisión del usuario *a posteriori* — el mismo rol que el autopick de ESPN, pero sobre
el Boost.

Qué pasa si **la carrera** se cancela o se acorta (Spa 2021, Imola 2023): **[no verificado]**. No
hay una sola línea en Game Rules ni en las 32 preguntas de la FAQ.

---

## 2. Fantasy Premier League (fantasy.premierleague.com)

**El lock.** El caso canónico, y el único con el deadline escrito como fórmula:

> "**Deadlines are subject to change and will be 90 minutes before the kick-off time in the first
> match of the Gameweek. A deadline will not change within 24 hours of the scheduled time.**"
> — [Rules, FPL](https://fantasy.premierleague.com/help/rules) **[primaria]**

> "All changes to your team (starting 11, transfers, captain changes, substitiution priorities)
> must be made by the Gameweek deadline in order to take effect for that set of matches."
> — ídem **[primaria]** (el typo "substitiution" es del original)

> "Fantasy managers must make all of their changes and confirm their final line-up before the
> 'Gameweek deadline', which is 90 minutes before the opening match of the Gameweek."
> — [premierleague.com, FPL basics: Managing your team](https://www.premierleague.com/en/news/2174899/fpl-basics-managing-your-team) **[primaria]**

Dos propiedades que vale la pena robar: el deadline es **derivado** (90 min antes del primer
partido, se recalcula si cambia el fixture) y tiene una **ventana de congelamiento** (no se mueve
dentro de las 24 h previas), que es lo que lo hace confiable para el que planifica.

**No-input.** Pasivo puro: lo que está cargado juega. La regla lo dice en negativo ("must be made
by the deadline *in order to take effect*"), y arriba de eso hay **dos redes de seguridad
automáticas** que corren sin pedir permiso:

> "Your substitutes provide cover for unforeseen events like **injuries and postponements** by
> automatically replacing starting players who don't play in a Gameweek." — "Playing" significa
> "making an appearance on the pitch or receiving a yellow / red card".
> — [Rules, FPL](https://fantasy.premierleague.com/help/rules) **[primaria]**

Y el capitán: si no juega ni un minuto, el brazalete pasa automáticamente al vice **[primaria,
misma página]**. Notar que el orden del banco y el vice son input *anticipado*: el participante
pre-compromete lo que quiere que pase cuando no esté. Es el mismo patrón que el pre-rank del
draft de Yahoo.

Primera jornada vs. siguientes: sí hay asimetría. "Unlimited transfers can be made at no cost
until your first deadline" **[primaria]**; después, un transfer libre por Gameweek (acumulable
hasta 5) y **−4 puntos** por cada transfer extra **[primaria]**.

**Penalización.** No existe por no entregar. El −4 es por *hacer* más transfers de los asignados.

**Excepciones.** El partido postergado se absorbe por auto-subs, y ahí termina lo escrito. Ni las
reglas ni los términos hablan de anular una jornada ni de recalcular puntos. Lo que sí hay es una
cláusula paraguas:

> "The Premier League reserves the right to alter, amend or supplement the Game Rules in its
> absolute discretion."
> — [Terms & Conditions, FPL](https://fantasy.premierleague.com/help/terms) **[primaria]**

Cómo se resolvieron en la práctica las jornadas del COVID con media fecha postergada:
**[no verificado]** — no está en el reglamento.

---

## 3. ESPN Fantasy y Yahoo Fantasy (lineup lock y autodraft)

Los dos juegos con roster semanal son los únicos del informe donde el lock **no es global**.

**El lock del lineup.** ESPN tiene dos modos, y el default es por jugador:

> "The Lock Time is when team lineups lock each week. This **ONLY** applies to moving players
> between active slots, or between active slots and bench slots." … "If selected, team managers can
> make moves to their weekly rosters **until the scheduled start of each player's game. Only
> players whose games have started will be locked.**" … "All roster moves will lock at the first
> game of the day/week, even if the first game falls on a Thursday. Once the first game starts for
> the scoring period, the entire roster is locked for the rest of the period."
> — [ESPN Support, Lineup and Roster Lock Times](https://support.espn.com/hc/en-us/articles/360054748151-Lineup-and-Roster-Lock-Times) **[primaria]**

Detalle fino: el lock **se parte por tipo de operación**. Mover de banco a titular sigue el Lock
Time; altas, bajas y trades "will be locked at the first scheduled game of the day" **[primaria,
misma página]**. O sea que la app distingue *input que sólo te afecta a vos* de *input que afecta
al mercado de la liga*, y le pone deadlines distintos.

Yahoo hace lo mismo con otras palabras:

> "Adjust players between positions until: **The start of the player's real-life game**" (ligas
> públicas y privadas con settings default) o "the start of the first game on the designated day
> of the week" (ligas con weekly roster).
> — [Yahoo Help, Transaction and lineup deadlines](https://help.yahoo.com/kb/transaction-lineup-deadlines-yahoo-fantasy-sln6775.html) **[primaria]**

**No-input en el lineup.** Lo que quedó, queda; el banco no puntúa. Ninguna de las dos lo dice con
esas palabras en la página de deadlines **[inferido]**. Las dos, en cambio, ofrecen un automatismo
**opt-in** para que el olvidadizo no se coma el cero:

> "**Start Active Players** / Assistant GM … Allows you to quickly fill your starting lineup on
> individual days or for the entire week." — "Injury status is taken into account on the day Start
> Active Players or Assistant GM is set."
> — [Yahoo Help, SLN28660](https://help.yahoo.com/kb/SLN28660.html) **[primaria]**

**No-input en el draft — el caso que más le importa a BoxBox.** Las dos plataformas resuelven el
turno vencido con **autopick**, y las dos usan un **orden pre-comprometido**, no el azar:

> "For each pick, the system selects the highest-ranked available player from that list." — si el
> manager no cargó draft list, "the system will use the default ESPN draft rankings". Los managers
> "do not need to be online during the draft".
> — [ESPN Support, Autopick Draft](https://support.espn.com/hc/en-us/articles/360000042712-Autopick-Draft) **[primaria]**

> Los rankings propios se usan "when a team manager doesn't pick a player within the allotted time
> and has no players on the pending pick queue" — la precedencia es **cola de picks pendientes →
> ranking propio → ranking default**.
> — [ESPN Support, Updating Your Draft Rankings and Strategy](https://support.espn.com/hc/en-us/articles/360046492471-Updating-Your-Draft-Rankings-and-Strategy) **[primaria]**

> "LMs can set the time per pick. **The system default is 30 seconds.**" … "Allow managers who have
> disconnected to remain off autopick until their allotted pick time expires."
> — [ESPN Support, Snake Draft Settings for LM leagues](https://support.espn.com/hc/en-us/articles/46879704879892-Snake-Draft-Settings-for-LM-leagues) **[primaria]**

> "An automated system drafts every team based on pre-draft rankings or the default system
> rankings." … "If you're unable to attend your draft or something happens and you **miss a draft
> pick, autopick will kick in** and use your pre-rank settings to fill your roster for you."
> — [Yahoo Help, Overview of drafting](https://help.yahoo.com/kb/overview-drafting-yahoo-fantasy-sln22670.html) **[primaria]**

**Penalización.** Ninguna. El turno vencido se cubre y el draft sigue. ESPN incluso documenta la
cortesía inversa: un manager desconectado puede quedar *fuera* de autopick hasta que se le agote
el tiempo, para darle la chance de volver.

**Excepciones.** El lock por jugador ya es, en sí, la excepción: si el partido se mueve, el lock se
mueve con él, porque está atado al horario real del partido y no a una hora fija. Yahoo aclara que
Start Active Players considera la postergación **en el momento en que se corre**, no después
**[primaria]**. Cómo se contabilizan las estadísticas de un partido de NFL reprogramado a otra
semana: **[no verificado]**.

---

## 4. Bracket / pick'em de una sola vez (ESPN Tournament Challenge, CBS Bracket Challenge)

Es el caso donde el input es **uno solo para todo el torneo** y se congela entero.

**El lock.** El tip-off del primer partido, y es definitivo:

> "**Entries (and any changes to the bracket) must be completed before the first game's tipoff!**"
> … "**All brackets lock on tipoff and cannot be changed (not even by us).**" — Men's TC 2026
> cierra en el tip-off del jueves 19 de marzo de 2026; Women's TC el viernes 20.
> — [ESPN Support, What is the deadline for entries?](https://support.espn.com/hc/en-us/articles/360021910152-What-is-the-deadline-for-entries) **[primaria]**

> "Once the Tournament tip-off begins, bracket creation will be locked."
> — [ESPN Support, Your Bracket - Explained](https://support.espn.com/hc/en-us/articles/360040324812-Your-Bracket-Explained) **[primaria]**

CBS es más estricto y usa **hora de reloj**, no el evento:

> "Participants must register into the Sweepstakes, fill in their Bracket with their picks and
> submit **no later than 12:00 noon Eastern Time ("ET") on March 19, 2026**."
> — [2026 CBSSports.com Men's Bracket Challenge Rules](https://www.cbssports.com/fantasy/bracket/games/bpc/rules) **[primaria]**

**No-input.** No hay estado anterior que congelar: sin bracket enviado, **no hay entrada**. La
consecuencia del silencio es quedar afuera del juego, no un castigo dentro del juego.

**Penalización.** No. Es la no-participación.

**Excepciones.** Las dos únicas cláusulas que encontré sobre "el torneo real se desvió" en este
formato:

> "In the event that a scheduled game is canceled or preempted for any reason or If a team is
> forced to forfeit a matchup resulting in another team advancing, **points may still be rewarded
> to for the winning team**." (sic, el error de redacción es del original)

> "Due to any unforeseen circumstances, including, without limitation, any game(s) cancellation or
> delay(s)… **CBSI may in its sole discretion make material changes to this Challenge, including,
> without limitation, canceling the Challenge and/or concluding the Challenge early.**"
> — [CBS Bracket Challenge Rules](https://www.cbssports.com/fantasy/bracket/games/bpc/rules) **[primaria]**

Las reglas del Bracket Challenge de la NCAA irían en el sentido opuesto — "in the event that a
game does not occur as scheduled, for any reason whatsoever, no points will be awarded for
selections made in relation to that game" — pero **no pude leer la página**
(`ncaa.com/play-prizing-rules` devuelve 403, directo y vía renderizador), así que la cita es
**[secundaria]**, tomada de resultados de búsqueda, y no la daría por firme.

---

## 5. DraftKings Pick6 (dinero real)

El contraste buscado: mismo formato de input (elegir sobre eventos futuros), pero con plata, así
que las reglas de void están redactadas por abogados.

**El lock.** No hay un deadline común para todos los participantes: el lock es **por entrada y en
el momento del envío**.

> "**Pick Sets may not be edited after they've been submitted.**" … "Build a lineup, also known as
> your 'Pick Set', by choosing **2 or more players (3 or more in CO)**."
> — [Pick6 Rules and Scoring](https://pick6.draftkings.com/pick6-rules-and-scoring) **[primaria]**

El tablero sí tiene un reloj, pero expresado como **scoring period** y como derecho del operador a
tocar la oferta:

> "The pool of available athletes and their associated stat projections is called a '**Pick
> Group**'." … "The scoring period for NFL is defined as the timeframe between the **scheduled
> start of the first game** within the Pick Group and 11:59PM ET on the first Wednesday after the
> last scheduled game within the Pick Group." … "DraftKings reserves the right to add or remove
> picks to a Pick Group at its discretion after the initial group of picks has been published." …
> "If the scheduled start time for a game changes after contests for a Pick Group containing that
> game become available, DraftKings will take measures to ensure the change is reflected on the
> pick experience."
> — ídem **[primaria]**

Y una variante que reabre el input *durante* el evento: "Live Picks lock late in the game. For NFL,
you can make live picks up until there is 1 minute remaining in the 4th quarter." **[primaria]**

**No-input.** No es un estado posible: la entrada existe sólo si tiene picks, y una vez enviada no
se toca. El no-input es, literalmente, no jugar.

**Penalización.** Ninguna por no entregar. Lo que sí hay es **grading** sin piedad y con una
devolución tasada:

> "If a player does not meet the minimum play requirements in their game, **all picks associated
> with that player will be scored as void**, regardless of selecting more or less for the pick." …
> "For Pick6 NFL contests, the player must record **at least one (1) snap** (offense, defense, or
> special teams) in the game to be considered as having met the minimum play requirements."

> "If a game is rescheduled for a time **OUTSIDE** the original scoring period, the game will be
> removed from the Pick Group. **Picks from that game will be graded as void.**"

> "**If a lineup settles with all but one (1) voided pick, or with all voided picks, that lineup
> will be refunded its entry fee** in the same form used for submission."
> — ídem **[primaria]**

Ese último párrafo es la pieza que ninguna app gratuita tiene: define el umbral exacto a partir del
cual la entrada deja de ser un juego y pasa a ser una devolución. Y notar la asimetría respecto de
F1 Fantasy: el jugador que no juega acá te **anula** la pick (quedás neutral), mientras que el
piloto que no corre en F1 Fantasy te **cobra −20**.

Hay fuentes de terceros que afirman lo contrario para Pick6 — que un DNP se califica como *loss* y
no como void ([Fantasy Life](https://www.fantasylife.com/articles/dfs/what-is-draftkings-pick6-how-to-play-the-newest-pickem-game-on-the-market), **[secundaria]**). La página de reglas de DraftKings dice
*void*; me quedo con la primaria y dejo anotada la contradicción, que probablemente venga de
confundir Pick6 con otros productos pick'em.

---

## Patrones

**1. Ninguna de las cinco penaliza el no-input. Las cinco eligen una consecuencia pasiva.** Ésta es
la respuesta al corazón de la pregunta, y es unánime. La consecuencia toma una de tres formas,
según qué tenga el juego para congelar:

- **Hay estado anterior** → se congela y sigue jugando (F1 Fantasy, FPL, lineup de ESPN/Yahoo).
- **No hay estado anterior pero el turno bloquea a otros** → lo llena la máquina (autopick de
  ESPN/Yahoo, auto-subs y vice-capitán de FPL, Autopilot de F1).
- **No hay estado anterior y no bloquea a nadie** → no hay entrada (bracket, Pick6).

**2. Donde sí hay penalizaciones explícitas, castigan actuar, no omitir.** El −4 de FPL y el −10 de
F1 Fantasy se cobran por *hacer* transfers de más. La única excepción aparente —los −5/−20 de F1
Fantasy a los pilotos inactivos— al mirarla de cerca confirma la regla: castiga haber elegido mal,
no haber callado. El participante que no abre la app no pierde un punto en ninguna de las cinco.

**3. El deadline se ata a un evento del calendario real, nunca a una hora fija arbitraria.** FPL:
90 min antes del primer kick-off. F1 Fantasy: arranque de Qualy o de Sprint. ESPN/Yahoo: arranque
del partido de *ese* jugador. Bracket: tip-off. La única hora de reloj dura del informe es el
mediodía ET de CBS, y es un reglamento de sweepstakes, no una mecánica de juego. Corolario de
implementación: el deadline es **derivado** de un dato del evento, se recalcula si el evento se
mueve, y FPL además lo **congela** 24 h antes para que sea planificable.

**4. El riesgo de que el evento real se desvíe se absorbe con automatismos pre-comprometidos, no
con anulaciones.** Banco ordenado y vice-capitán en FPL, pre-rank y cola de picks en ESPN/Yahoo,
chips en F1 Fantasy. En todos los casos el participante declara *de antemano* qué quiere que pase
cuando no esté. Anular o devolver sólo aparece donde hay dinero (Pick6) o donde el operador se
reserva cancelar el concurso entero (CBS).

**5. Granularidad del lock = cuánto tolera el juego que el input llegue tarde.** Hay un gradiente
claro: Pick6 bloquea por entrada (al enviarla), ESPN/Yahoo por jugador (al empezar su partido), F1
Fantasy y FPL por jornada entera (un solo corte global), el bracket por temporada completa. Cuanto
más chico es el input, más fino es el lock. Y los tres juegos con lock global le abren alguna
grieta: Final Fix en F1, auto-subs en FPL, el modo "lock individually" en ESPN.

---

## Implicancias para BoxBox

### El auto-pick de 60 s del draft

**No es una invención nuestra: es exactamente lo que hacen ESPN y Yahoo**, y hasta el número está
en el mismo orden de magnitud. ESPN documenta "the system default is 30 seconds" por pick, y resuelve
el turno vencido eligiendo solo; Yahoo dice sin vueltas que "if you… miss a draft pick, autopick
will kick in". Ninguna de las dos penaliza el turno perdido, ninguna saltea al participante,
ninguna frena el draft esperándolo. `backend/src/modules/draft/draft.gateway.ts` eligió el mismo
mecanismo que la industria, con el doble de tiempo.

Lo que **sí** es nuestro es el criterio de selección. El comentario del código lo admite:

```
// runAutoPick: elige al azar entre los disponibles de la categoria que le toca a la ronda
// actual (decision de equipo — no hay sistema de ranking en el proyecto, asi que "el mejor
// disponible" del roadmap se resuelve como random entre los legales para esa ronda).
```

ESPN y Yahoo resuelven ese mismo hueco con una cadena de fallbacks **determinística y
pre-comprometida por el usuario**: cola de picks pendientes → ranking propio del manager → ranking
default de la plataforma. Es el patrón 4 del informe: el participante declara de antemano qué
quiere que pase si no está.

La diferencia que importa no es "random vs. ranking", es **explicable vs. inexplicable**. Con
random, el que vuelve al draft y encontró a Tsunoda en su equipo no tiene ninguna respuesta a "¿por
qué ése?", y dos corridas del mismo escenario dan resultados distintos (lo que además hace más
difícil testear el auto-pick sobre un caso concreto). BoxBox ya tiene al menos dos órdenes
determinísticos a mano sin agregar ninguna tabla: el campeonato de pilotos que ya calcula
`GET /drivers/standings` (Slice 16), o el número de piloto. Cualquiera de los dos convierte el
auto-pick en "te tocó el mejor disponible según el campeonato", que es literalmente la frase de
ESPN. Lo que no haría es construir un sistema de pre-rank por usuario: eso es la versión completa
del patrón y no la paga un TP.

### Si algún día se hace Predicciones (Slice 10)

**Recomendación: deadline único por carrera, atado al arranque de la Qualy de ese GP, y
consecuencia puramente pasiva — el que no predice suma cero en esa fecha, sin penalización, sin
predicción automática.**

El razonamiento, en el orden en que importa:

**Por qué la Qualy y no la largada.** El deadline tiene que ser anterior al primer resultado que
contamine la predicción. Si se predice posición final o podio, la grilla ya es información fuerte:
cerrar a lights-out convierte el juego en "copiar la grilla" y premia al que entra tarde. F1
Fantasy, que es el caso más cercano al nuestro, llegó a la misma conclusión y mueve el lock a la
Qualy (y al Sprint en fin de semana de Sprint, donde el Sprint es lo primero que puntúa). La regla
general detrás: **el deadline es el arranque de la primera sesión cuyo resultado alimenta el
scoring**.

**Por qué es implementable sin inventar nada.** Jolpica ya devuelve, en el recurso `Races`, los
`{date,time}` de `Qualifying`, `Sprint` y `SprintQualifying` además de la carrera (está relevado en
`docs/research/jolpica-openf1-superficie.md`). El sync de la Slice 12 ya upsertea `Race`; el
deadline sale de ahí, se guarda en la fila de `Race` y se valida server-side en el `POST` de la
predicción. Sin tabla nueva, sin cron, sin timer en memoria: una comparación de fechas. Y dado que
el dato viene del calendario real, si la sesión se reprograma el deadline se mueve solo en el
siguiente sync — que es el patrón 3 completo. Vale copiar también la ventana de congelamiento de
FPL en su versión barata: mostrar el deadline en la UI con su hora local y no recalcularlo
silenciosamente a espaldas del usuario.

**Por qué cero y no penalización.** Porque las cinco apps relevadas eligen consecuencia pasiva, y
en el caso de las predicciones el argumento es incluso más fuerte que para ellas: **no predecir no
le bloquea nada a nadie**. El auto-pick del draft se justifica porque un turno colgado congela a
los otros diez participantes de la liga — es una necesidad de protocolo, no un favor. Una
predicción ausente no frena ninguna otra. Bracket y Pick6, que son los dos casos del informe donde
el input tampoco bloquea a terceros, hacen exactamente esto: el que no entrega, no juega esa fecha.

**Y por qué nada de auto-predicción.** Sería inventar un mecanismo que ninguno de los cinco tiene
para un input que no lo necesita, y además distorsiona la tabla: una predicción generada por el
servidor puede acertar y darle puntos al que no jugó. El auto-pick del draft reparte un recurso
escaso (un piloto que nadie más podrá tener) y por eso tiene que resolverse igual; las predicciones
reparten puntos, y ahí el cero es la respuesta correcta y la más fácil de explicar en la defensa
del TP.

**Lo que sí vale la pena copiar de F1 Fantasy** si Predicciones se hace: que la **ausencia del
piloto real** no es lo mismo que la ausencia del participante. Si alguien predice "Alonso en el
podio" y Alonso no larga, F1 Fantasy cobra −20 y vende un chip para evitarlo; Pick6 anula la pick y
devuelve. Para un TP, la decisión barata y defendible es la de Pick6 — esa predicción puntúa cero,
ni castigo ni premio — y conviene escribirla antes de que pase, porque va a pasar.

---

## Huecos

Lo que no pude verificar, y dónde habría que mirar:

1. **Qué hace F1 Fantasy si una sesión o la carrera se cancela o se acorta** (Spa 2021, Imola
   2023). No hay una línea en `fantasy.formula1.com/en/game-rules` ni en las 32 preguntas de la
   FAQ. Dónde mirar: los Terms & Conditions del juego, que no encontré publicados como página
   propia, y los comunicados de F1 Fantasy de esos fines de semana puntuales.
2. **Las Official Rules completas de ESPN Tournament Challenge.** `espn.com/games/tournament-challenge-bracket-2026/howtoplay#CompleteRules`
   devuelve 403 tanto directo como vía renderizador, y la versión 2023 en `fantasy.espn.com` sólo
   linkea el documento sin incluirlo. Lo que tengo de ESPN TC viene de su centro de soporte, que es
   primario pero no es el reglamento. Ahí estaría la cláusula de partido no jugado, que en CBS sí
   leí.
3. **El reglamento del Bracket Challenge de la NCAA** (`ncaa.com/play-prizing-rules`): 403. La
   frase "no points will be awarded" quedó como **[secundaria]** y contradice en espíritu la de CBS
   ("points may still be rewarded"); hasta leer el original no sé cuál aplica a qué producto.
4. **El momento exacto en que una pick individual deja de estar disponible en Pick6.** Las reglas
   definen el `scoring period` y dicen que un Pick Set no se edita después de enviado, pero no
   encontré la frase que diga "una pick se cierra al arrancar el partido de ese jugador". Dónde
   mirar: el centro de ayuda de DraftKings (`draftkings.com/help`), no la página de reglas.
5. **Qué hace ESPN/Yahoo con las estadísticas de un partido reprogramado a otra semana** (el caso
   NFL COVID 2020). No está en las páginas de deadlines; estaría en los artículos de soporte de
   scoring de cada temporada.
6. **Si FPL anuló o recalculó alguna jornada** con media fecha postergada. Las Rules y los Terms
   sólo traen la cláusula paraguas ("reserves the right to alter, amend or supplement the Game
   Rules"). Dónde mirar: el blog/noticias oficial de FPL de las temporadas 2019/20 y 2020/21.
7. **Confirmación del segundos-por-pick de Yahoo.** `help.yahoo.com/kb/SLN6086.html` menciona el
   setting "Live Draft Pick Time" pero no publica los valores. El 30 s default es un dato de ESPN,
   no de Yahoo.
8. **La contradicción interna de F1 Fantasy sobre su propio lock**: la FAQ dice "locked at
   lights-out", las previews semanales de formula1.com dicen Qualy/Sprint. Asumí que las previews
   están al día porque son semanales y la FAQ arrastra texto viejo, pero no lo confirmé entrando al
   juego con sesión.
