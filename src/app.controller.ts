import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

/**
 * Contrôleur racine de l'application.
 * Gère les endpoints système de base comme le health check.
 */
@ApiTags("System")
@Controller()
export class AppController {
  @Get("health")
  @ApiOperation({ summary: "Endpoint de vérification de santé (Health check)" })
  @ApiResponse({ status: 200, description: "Le système est opérationnel" })
  /**
   * Vérifie l'état de santé de l'API.
   * Utilisé par les health checks de l'infrastructure (ex: Render, AWS).
   * @returns {Object} Statut, timestamp et nom du service.
   */
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "electricity-backend",
    };
  }
}
