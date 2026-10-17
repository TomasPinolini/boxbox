# Changelog

Todas las versiones publicadas de BoxBox, escritas en lenguaje de usuario y no de commit.

Las reglas están en [ADR-0011](./docs/adr/ADR-0011-semantic-versioning.md): un solo número para
todo el repositorio, que vive en un tag anotado de git, y cuya superficie versionada es el contrato
HTTP (`docs/api-endpoints.md` + `docs/error-codes.md`).

---

## [1.0.0] — 2026-10-13

Primera versión publicada. Es lo que se presentó a la cátedra: el juego completo de punta a punta,
sin predicciones y sin puntaje de sprints.

### Cuentas y ligas

- Registro e inicio de sesión con email y contraseña; la sesión se renueva sola.
- Crear una liga privada eligiendo su código de invitación, y unirse a una liga con ese código.
- Ver los miembros de una liga, salir, y el dueño puede echar a alguien.
- Renombrar y archivar una liga en lugar de borrarla: la historia no se pierde.

### Draft

- Draft snake en vivo por liga: dos pilotos y una escudería por equipo.
- Pantalla en tiempo real con el turno, la cuenta regresiva y los picks de todos a medida que pasan.
- Si se agota el tiempo, el sistema elige por quien no pickeó.

### Resultados y posiciones

- Resultados reales de cada carrera importados desde Jolpica, con vista previa antes de guardar.
- Puntos por piloto y por escudería, y tabla de posiciones de la liga fecha por fecha, con el
  cambio de puesto respecto de la carrera anterior.
- Campeonato de pilotos y de escuderías de la temporada, público.

### Catálogo

- Listado de pilotos con filtro por escudería, y una página por piloto con su historial.
- Página por escudería, con sus colores y su logo.
- Administración de pilotos, escuderías, circuitos, temporadas, carreras y resultados.

### Limitaciones conocidas de esta versión

- Las predicciones pre-carrera no están construidas: todavía no se puede apostar quién gana, quién
  saca la pole ni qué escudería suma más en cada fin de semana. Queda para una versión siguiente.
- Los puntos de los sprints no se cuentan: un fin de semana con sprint reparte menos puntos que en
  la Fórmula 1 real.
- Un piloto que cambia de escudería a mitad de temporada acredita todos sus puntos a una sola de
  las dos.
