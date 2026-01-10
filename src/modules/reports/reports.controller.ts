import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  Patch,
  ParseIntPipe,
  Request,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole, ReportReason, ReportStatus } from "@prisma/client";

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsNumber, IsString } from "class-validator";

/**
 * DTO pour la création d'un signalement.
 * Peut cibler une station ou un avis.
 */
class CreateReportDto {
  @ApiProperty({
    description: "ID de la station signalée (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  targetStationId?: number;

  @ApiProperty({
    description: "ID de l'avis signalé (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  targetReviewId?: number;

  @ApiProperty({ description: "Motif du signalement", enum: ReportReason })
  @IsNotEmpty()
  reason: ReportReason;

  @ApiProperty({ description: "Description détaillée", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Contrôleur des signalements.
 * Permet aux utilisateurs de signaler des contenus inappropriés ou des problèmes.
 * Réservé à l'administration pour la consultation et le traitement.
 */
@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Create a report (Anyone logged in)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Créer un signalement" })
  @ApiResponse({ status: 201, description: "Signalement créé avec succès." })
  /**
   * Crée un nouveau signalement pour une station ou un avis.
   * Tout utilisateur connecté peut créer un signalement.
   * @param req Requête contenant l'utilisateur.
   * @param body Données du signalement.
   */
  async createReport(
    @Request() req: { user: { id: number } },
    @Body() body: CreateReportDto,
  ) {
    return this.reportsService.create(req.user.id, body);
  }

  // Get all reports (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "Lister les signalements (Admin)" })
  @ApiResponse({ status: 200, description: "Liste des signalements." })
  /**
   * Récupère la liste de tous les signalements effectués.
   * Accessible uniquement aux administrateurs.
   */
  async findAll() {
    return this.reportsService.findAll();
  }

  // Update report status (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @Patch(":id/status")
  @ApiOperation({ summary: "Mettre à jour le statut d'un signalement" })
  @ApiResponse({ status: 200, description: "Statut mis à jour." })
  /**
   * Change le statut d'un signalement (ex: traité, rejeté).
   * Accessible uniquement aux administrateurs.
   * @param id ID du signalement.
   * @param status Nouveau statut.
   */
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: ReportStatus,
  ) {
    return this.reportsService.updateStatus(id, status);
  }
}
