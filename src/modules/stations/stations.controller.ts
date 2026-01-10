import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { StationsService } from "./stations.service";
import { CreateStationDto } from "./dto/create-station.dto";
import { UpdateStationDto } from "./dto/update-station.dto";
import { SearchStationsDto } from "./dto/search-stations.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * Contrôleur des bornes de recharge (Stations).
 * Gère la recherche, la création, la validation et les interactions (favoris).
 */
@ApiTags("stations")
@Controller("stations")
export class StationsController {
  constructor(private stationsService: StationsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les stations actives" })
  @ApiResponse({ status: 200, description: "Liste des stations actives." })
  /**
   * Récupère la liste paginée des stations publiquement visibles et actives.
   * Filtre automatiquement les stations supprimées ou inactives.
   * @param page Numéro de page.
   * @param limit Nombre de stations par page.
   * @returns Liste paginée.
   */
  async findAll(@Query("page") page = 1, @Query("limit") limit = 10) {
    return this.stationsService.findAll(page, limit);
  }

  @Get("search")
  @ApiOperation({ summary: "Rechercher des stations (Filtres & Localisation)" })
  @ApiResponse({ status: 200, description: "Résultats de recherche." })
  /**
   * Recherche avancée de bornes.
   * Supporte la géolocalisation (lat/lng + rayon) et les filtres (puissance, prix, connecteur).
   * @param dto Critères de recherche.
   * @returns Liste des stations correspondantes.
   */
  async search(@Query() dto: SearchStationsDto) {
    return this.stationsService.search(dto);
  }

  @Get("my-locations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer mes lieux enregistrés" })
  @ApiResponse({ status: 200, description: "Liste des lieux." })
  async getMyLocations(@CurrentUser("id") userId: number) {
    return this.stationsService.findMyLocations(userId);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer mes stations (Propriétaire)" })
  @ApiResponse({ status: 200, description: "Liste de mes stations." })
  /**
   * Récupère la liste des stations appartenant à l'utilisateur connecté.
   * Utile pour le tableau de bord propriétaire.
   * @param userId ID du propriétaire.
   * @returns Liste des stations.
   */
  async findMyStations(@CurrentUser("id") userId: number) {
    return this.stationsService.findByHost(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une station par ID" })
  @ApiResponse({ status: 200, description: "Détails de la station." })
  @ApiResponse({ status: 404, description: "Station introuvable." })
  /**
   * Récupère les détails complets d'une station spécifique.
   * Inclut la localisation, les tarifs et les prochains créneaux réservés.
   * @param id ID de la station.
   * @returns Détails de la station.
   */
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.stationsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.admin, UserRole.client)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une nouvelle station" })
  @ApiResponse({
    status: 201,
    description: "Station créée avec succès.",
    type: CreateStationDto,
  })
  /**
   * Crée une nouvelle borne de recharge.
   * Accessible aux Clients, Propriétaires et Admins.
   * Promeut automatiquement l'utilisateur en "Propriétaire" si ce n'est pas déjà le cas.
   * @param userId ID du créateur.
   * @param dto Données de la station.
   * @returns La station créée.
   */
  async create(
    @CurrentUser("id") userId: number,
    @Body() dto: CreateStationDto,
  ) {
    return this.stationsService.create(userId, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour une station" })
  @ApiResponse({ status: 200, description: "Station mise à jour." })
  @ApiResponse({
    status: 403,
    description: "Non autorisé (Vous n'êtes pas le propriétaire).",
  })
  /**
   * Met à jour les informations d'une station existante.
   * Seul le propriétaire ou un administrateur peut effectuer cette action.
   * @param id ID de la station.
   * @param user Utilisateur connecté (pour vérification des droits).
   * @param dto Données à modifier.
   */
  async update(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStationDto,
  ) {
    return this.stationsService.update(id, user.id, user.roles, dto);
  }

  @Patch(":id/validate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Valider une station (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Station validée." })
  @ApiResponse({ status: 403, description: "Accès refusé." })
  /**
   * Valide une station nouvellement créée pour la rendre publique.
   * Action réservée aux administrateurs pour modération.
   * @param id ID de la station.
   * @returns La station activée.
   */
  async validate(@Param("id", ParseIntPipe) id: number) {
    return this.stationsService.validate(id);
  }

  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Désactiver une station (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Station désactivée." })
  /**
   * Désactive une station avec un motif (ex: non-conformité, maintenance forcée).
   * Réservé aux administrateurs.
   * @param id ID de la station.
   * @param message Raison de la désactivation.
   */
  async deactivate(
    @Param("id", ParseIntPipe) id: number,
    @Body("message") message: string,
  ) {
    return this.stationsService.deactivate(id, message);
  }

  @Patch(":id/availability")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Basculer la disponibilité (Propriétaire)" })
  @ApiResponse({ status: 200, description: "Disponibilité mise à jour." })
  /**
   * Permet au propriétaire de basculer la disponibilité de sa station (On/Off).
   * @param id ID de la station.
   * @param userId ID de l'utilisateur (doit être le propriétaire).
   * @returns Nouvel état de disponibilité.
   */
  async toggleAvailability(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
  ) {
    return this.stationsService.toggleAvailability(id, userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer une station" })
  @ApiResponse({ status: 200, description: "Station supprimée." })
  @ApiResponse({ status: 403, description: "Non autorisé." })
  /**
   * Supprime définitivement (soft delete) une station.
   * @param id ID de la station.
   * @param user Utilisateur connecté (Propriétaire ou Admin).
   */
  async delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stationsService.delete(id, user.id, user.roles);
  }

  @Post(":id/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ajouter/Retirer des favoris" })
  @ApiResponse({ status: 200, description: "Statut favori mis à jour." })
  /**
   * Ajoute ou retire une station de la liste des favoris de l'utilisateur.
   * @param id ID de la station.
   * @param userId ID de l'utilisateur.
   * @returns État final (favorited: true/false).
   */
  async toggleFavorite(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
  ) {
    return this.stationsService.toggleFavorite(id, userId);
  }

  @Get("favorites/list")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer mes favoris" })
  @ApiResponse({ status: 200, description: "Liste des stations favorites." })
  /**
   * Récupère la liste de toutes les stations marquées comme favorites par l'utilisateur.
   * Idéal pour un accès rapide depuis l'accueil.
   * @param userId ID de l'utilisateur.
   * @returns Liste des stations favorites.
   */
  async getFavorites(@CurrentUser("id") userId: number) {
    return this.stationsService.getFavorites(userId);
  }
}
