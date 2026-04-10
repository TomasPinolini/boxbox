# Propuesta TP DSW

## Grupo

### Integrantes

* XXXXX - Apellido(s), Nombre(s)
* XXXXX - Apellido(s), Nombre(s)

### Repositorios

* [fullstack app](https://github.com/TomasPinolini/boxbox)

## Tema

### Descripción

BoxBox es una aplicación de Fantasy League de Fórmula 1. Los usuarios crean o se unen a ligas privadas mediante código de invitación, participan en un draft en vivo con formato snake para armar su equipo (2 pilotos titulares, 1 reserva y 1 escudería), y compiten a lo largo de la temporada. Los resultados reales de cada carrera se obtienen de APIs públicas de F1 para calcular los puntajes. Además, los usuarios pueden realizar predicciones antes de cada carrera y visualizar resúmenes de rendimiento.

### Modelo

```mermaid
erDiagram
    User ||--o{ LeagueMember : "se une a"
    User ||--o{ League : "crea"

    Season ||--o{ Race : "tiene"
    Season ||--o{ League : "pertenece a"
    Season ||--o{ DriverSeason : "contiene"
    Circuit ||--o{ Race : "aloja"

    Driver ||--o{ DriverSeason : "juega en"
    Constructor ||--o{ DriverSeason : "tiene"

    League ||--o{ LeagueMember : "tiene"
    League ||--o{ DraftPick : "tiene"

    LeagueMember ||--|| FantasyTeam : "posee"
    LeagueMember ||--o{ DraftPick : "realiza"
    LeagueMember ||--o{ Prediction : "hace"
    LeagueMember ||--o{ LeagueStanding : "tiene"

    FantasyTeam ||--o{ DriverSwap : "tiene"
    FantasyTeam }o--|| Driver : "titular 1"
    FantasyTeam }o--|| Driver : "titular 2"
    FantasyTeam }o--|| Driver : "reserva"
    FantasyTeam }o--|| Constructor : "escudería"

    Race ||--o{ RaceResult : "tiene"
    Race ||--o{ ConstructorResult : "tiene"
    Race ||--o{ Prediction : "para"
    Race ||--o{ LeagueStanding : "snapshot en"

    Driver ||--o{ RaceResult : "tiene"
    Constructor ||--o{ ConstructorResult : "tiene"

    User {
        int id PK
        string email
        string name
        enum role "ADMIN - USER"
    }
    Driver {
        int id PK
        string firstName
        string lastName
        int number
        string code
    }
    Constructor {
        int id PK
        string name
        string color
    }
    Circuit {
        int id PK
        string name
        string country
    }
    Season {
        int id PK
        int year
        boolean isActive
    }
    DriverSeason {
        int id PK
        int driverId FK
        int constructorId FK
        int seasonId FK
    }
    Race {
        int id PK
        string name
        int round
        datetime date
        datetime lockDate
        enum status "UPCOMING - LOCKED - COMPLETED - CANCELLED"
    }
    League {
        int id PK
        string name
        string inviteCode
        enum draftStatus "PENDING - LIVE - COMPLETED"
    }
    LeagueMember {
        int id PK
        int leagueId FK
        int userId FK
        boolean isOwner
    }
    FantasyTeam {
        int id PK
        int leagueMemberId FK
        int driver1Id FK
        int driver2Id FK
        int reserveDriverId FK
        int constructorId FK
    }
    DraftPick {
        int id PK
        int leagueId FK
        int leagueMemberId FK
        int pickNumber
        int round
    }
    DriverSwap {
        int id PK
        int fantasyTeamId FK
        int raceId FK
        enum slot "DRIVER_1 - DRIVER_2"
        enum type "MANUAL - AUTO_DNF"
    }
    RaceResult {
        int id PK
        int raceId FK
        int driverId FK
        int position
        int points
    }
    ConstructorResult {
        int id PK
        int raceId FK
        int constructorId FK
        int totalPoints
    }
    Prediction {
        int id PK
        int leagueMemberId FK
        int raceId FK
        int bonusPoints
    }
    LeagueStanding {
        int id PK
        int leagueMemberId FK
        int raceId FK
        int totalPoints
        int position
    }
```

## Alcance Funcional

### Alcance Mínimo

Regularidad:

| Req | Detalle |
|:-|:-|
| CRUD simple | 1. CRUD Driver<br>2. CRUD Constructor |
| CRUD dependiente | 1. CRUD Race {depende de} CRUD Circuit + CRUD Season |
| Listado<br>+<br>detalle | 1. Listado de pilotos filtrado por escudería, muestra nombre, número y equipo => detalle muestra estadísticas del piloto y resultados de carrera |
| CUU/Epic | 1. Realizar el draft en vivo de un equipo fantasy (snake draft con timer, selección de 2 pilotos titulares, 1 reserva y 1 escudería, picks exclusivos por liga) |

Adicionales para Aprobación:

| Req | Detalle |
|:-|:-|
| CRUD | 1. CRUD Driver<br>2. CRUD Constructor<br>3. CRUD Circuit<br>4. CRUD Season<br>5. CRUD Race<br>6. CRUD League<br>7. CRUD FantasyTeam |
| CUU/Epic | 1. Realizar el draft en vivo de un equipo fantasy (snake draft con WebSocket, timer por pick, auto-pick en timeout, selección libre de categoría por ronda, picks exclusivos dentro de la liga)<br>2. Procesar resultados de carrera y actualizar standings (fetch desde APIs externas de F1, cálculo de puntajes de pilotos y escuderías, evaluación de predicciones, actualización del leaderboard y generación de recaps) |

### Alcance Adicional Voluntario

| Req | Detalle |
|:-|:-|
| CUU/Epic | 1. Sistema de predicciones pre-carrera (predicción de ganador, pole position y equipo con más puntos, con puntaje bonus por acierto, lock antes de la clasificación)<br>2. Resúmenes de carrera (desglose de puntos por piloto, resultado de predicciones, cambio de posición en standings, comparación vs promedio de la liga) |
| Listados | 1. Standings históricos filtrado por carrera, muestra posición, puntos totales y cambio de posición<br>2. Historial de swaps de pilotos filtrado por carrera |
| Otros | 1. Integración con APIs externas de F1 (Jolpica, OpenF1) para sincronización de datos reales<br>2. Draft en tiempo real via WebSocket con reconexión y pausa |
