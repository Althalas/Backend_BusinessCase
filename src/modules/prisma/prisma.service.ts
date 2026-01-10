import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

/**
 * Service central d'accès à la base de données via Prisma Client.
 * Gère la connexion et la déconnexion lors du cycle de vie de l'application.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      datasourceUrl: config.get<string>("DATABASE_URL"),
      log: ["query", "info", "warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Vide la base de données (Tables uniquement).
   * INTERDIT en production (sécurité).
   * Utile pour les tests E2E.
   */
  async cleanDatabase(config: ConfigService) {
    if (config.get<string>("NODE_ENV") === "production") {
      throw new Error("cleanDatabase est interdit en production");
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === "string" && key[0] !== "_" && key[0] !== "$",
    ) as string[];

    return Promise.all(
      models.map((modelKey) => {
        return (this as any)[modelKey]?.deleteMany?.();
      }),
    );
  }
}
