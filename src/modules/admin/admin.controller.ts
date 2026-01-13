import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";
import { UserRole } from "@prisma/client";

import {
  AdminService,
  DeleteStationDto,
  CancelReservationDto,
  RejectReservationDto,
} from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * Implémentation DTO pour Swagger.
 */
class DeleteStationDtoImpl implements DeleteStationDto {
  @ApiProperty({ description: "Raison de la suppression" })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * Implémentation DTO pour Swagger.
 */
class CancelReservationDtoImpl implements CancelReservationDto {
  @ApiProperty({ description: "Raison de l'annulation" })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * Implémentation DTO pour Swagger.
 */
class RejectReservationDtoImpl implements RejectReservationDto {
  @ApiProperty({ description: "Raison du refus" })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Obtenir les statistiques globales (Admin)" })
  @ApiResponse({
    status: 200,
    description: "Statistiques récupérées avec succès.",
  })
  /**
   * Récupère les métriques globales de la plateforme (utilisateurs, réservations, revenus...).
   */
  async getStats() {
    return this.adminService.getStats();
  }

  @Get("stations")
  @ApiOperation({ summary: "Lister toutes les stations (Admin)" })
  @ApiResponse({ status: 200, description: "Liste complète des stations." })
  /**
   * Récupère la liste de toutes les stations existantes, y compris celles désactivées.
   */
  async getAllStations(
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
    @Query("search") search?: string,
  ) {
    return this.adminService.getAllStations(page, limit, search);
  }

  @Get("reservations")
  @ApiOperation({ summary: "Lister toutes les réservations (Admin)" })
  @ApiResponse({ status: 200, description: "Liste complète des réservations." })
  /**
   * Récupère l'historique complet de toutes les réservations de la plateforme.
   */
  async getAllReservations(
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
    @Query("search") search?: string,
  ) {
    return this.adminService.getAllReservations(page, limit, search);
  }

  @Patch("stations/:id/reactivate")
  @ApiOperation({ summary: "Réactiver une station (Admin)" })
  @ApiResponse({ status: 200, description: "Station réactivée." })
  async reactivateStation(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.reactivateStation(id);
  }

  @Delete("stations/:id")
  @ApiOperation({ summary: "Supprimer une station (Admin)" })
  @ApiResponse({ status: 200, description: "Station supprimée avec succès." })
  @ApiResponse({ status: 404, description: "Station introuvable." })
  /**
   * Supprime (soft-delete) une station pour une raison donnée.
   */
  async deleteStation(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: DeleteStationDtoImpl,
  ) {
    return this.adminService.deleteStation(id, dto.reason);
  }

  @Patch("reservations/:id/cancel")
  @ApiOperation({ summary: "Annuler une réservation (Admin)" })
  @ApiResponse({
    status: 200,
    description: "Réservation annulée avec succès.",
  })
  @ApiResponse({ status: 404, description: "Réservation introuvable." })
  /**
   * Annule administrativement une réservation.
   */
  async cancelReservation(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CancelReservationDtoImpl,
  ) {
    return this.adminService.cancelReservation(id, dto.reason);
  }

  @Patch("reservations/:id/approve")
  @ApiOperation({ summary: "Approuver une réservation (Admin/Owner)" })
  @ApiResponse({ status: 200, description: "Réservation approuvée." })
  @ApiResponse({ status: 404, description: "Réservation introuvable." })
  /**
   * Force l'approbation d'une réservation en attente.
   */
  async approveReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.approveReservation(id, user);
  }

  @Patch("reservations/:id/reject")
  @ApiOperation({ summary: "Rejeter une réservation (Admin/Owner)" })
  @ApiResponse({ status: 200, description: "Réservation rejetée." })
  @ApiResponse({ status: 404, description: "Réservation introuvable." })
  /**
   * Rejette une réservation avec un motif.
   */
  async rejectReservation(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectReservationDtoImpl,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.rejectReservation(id, dto.reason, user);
  }

  // ==================== USER MANAGEMENT ====================

  @Get("users")
  @ApiOperation({ summary: "Lister tous les utilisateurs (Admin)" })
  @ApiResponse({ status: 200, description: "Liste des utilisateurs." })
  /**
   * Récupère tous les utilisateurs (avec option include deleted).
   */
  async getAllUsers(
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
    @Query("search") search?: string,
    @Query("includeDeleted") includeDeleted?: string,
  ) {
    return this.adminService.getAllUsers(
      page,
      limit,
      search,
      includeDeleted === "true",
    );
  }

  @Delete("users/:id")
  @ApiOperation({ summary: "Désactiver temporairement un utilisateur (ban)" })
  @ApiResponse({ status: 200, description: "Utilisateur désactivé." })
  @ApiResponse({ status: 404, description: "Utilisateur introuvable." })
  /**
   * Désactive temporairement un utilisateur (ban).
   * Les données personnelles sont conservées pour restauration.
   */
  async softDeleteUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: DeleteStationDtoImpl,
  ) {
    return this.adminService.softDeleteUser(id, dto.reason);
  }

  @Patch("users/:id/restore")
  @ApiOperation({ summary: "Restaurer un utilisateur désactivé (Admin)" })
  @ApiResponse({ status: 200, description: "Utilisateur restauré." })
  @ApiResponse({ status: 404, description: "Utilisateur introuvable." })
  /**
   * Restaure un utilisateur désactivé.
   */
  async restoreUser(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.restoreUser(id);
  }

  @Delete("users/:id/gdpr")
  @ApiOperation({
    summary: "Supprimer définitivement un utilisateur (RGPD Article 17)",
  })
  @ApiResponse({
    status: 200,
    description: "Utilisateur anonymisé conformément au RGPD.",
  })
  @ApiResponse({ status: 404, description: "Utilisateur introuvable." })
  @ApiResponse({ status: 409, description: "Utilisateur déjà supprimé." })
  /**
   * Supprime définitivement un utilisateur et anonymise ses données (RGPD).
   * Action irréversible.
   */
  async anonymizeUser(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.anonymizeUserAsAdmin(id);
  }
}
