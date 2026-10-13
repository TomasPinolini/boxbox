// Espeja el model Season de backend/prisma/schema.prisma. `createdAt` existe en la base pero
// ninguna pantalla lo muestra, asi que no viaja a este tipo: lo que no se usa no se declara.
export interface Season {
  id: number;
  year: number;
  isActive: boolean;
  driverCount: number;
}
