import { Injectable } from "@nestjs/common";
import { PrismaService } from "../src/modules/prisma/prisma.service";

@Injectable()
export class DbResetUtil {
  constructor(private readonly prisma: PrismaService) {}

  async reset() {
    // Ordre de suppression important pour respecter les contraintes de clés étrangères
    const tableNames = [
      "Payment",
      "Report",
      "FavoriteStation",
      "Reservation",
      "Review",
      "Pricing",
      "ChargingStation",
      "Vehicle",
      "Location",
      "User",
    ];

    for (const tableName of tableNames) {
      await this.prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
      );
    }
  }
}
