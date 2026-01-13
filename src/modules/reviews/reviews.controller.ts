import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ReviewResponseDto, ReviewMessageDto } from "./dto/review-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * Contrôleur des avis.
 * Gère la création, la lecture, la mise à jour et la suppression des avis.
 */
@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Laisser un avis" })
  @ApiResponse({ status: 201, description: "Avis créé avec succès." })
  /**
   * Crée un avis pour une station après une réservation terminée.
   * Vérifie que l'utilisateur a bien réservé la station.
   * @param user Utilisateur connecté.
   * @param dto Données de l'avis (note, commentaire, stationId).
   */
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(user, dto);
  }

  @Get("given")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mes avis envoyés" })
  @ApiResponse({
    status: 200,
    description: "Liste des avis laissés par l'utilisateur.",
  })
  /**
   * Récupère la liste des avis que l'utilisateur a rédigés.
   * @param userId ID de l'utilisateur.
   */
  async getGivenReviews(@CurrentUser("id") userId: number): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findGivenReviews(userId);
  }

  @Get("my-stations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Avis reçus sur mes stations (Owner)" })
  @ApiResponse({ status: 200, description: "Liste des avis reçus." })
  /**
   * Récupère les avis laissés sur les stations appartenant à l'utilisateur (pour les Propriétaires).
   * @param userId ID du propriétaire.
   */
  async getMyStationReviews(@CurrentUser("id") userId: number): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findByOwner(userId);
  }

  @Get("station/:stationId")
  @ApiOperation({ summary: "Voir les avis d'une station" })
  @ApiResponse({ status: 200, description: "Liste des avis de la station." })
  /**
   * Récupère tous les avis publics pour une station spécifique.
   * Triés par date de création (du plus récent au plus ancien).
   * @param stationId ID de la station.
   */
  async findByStation(
    @Param("stationId", ParseIntPipe) stationId: number,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findByStation(stationId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Modifier un avis" })
  @ApiResponse({ status: 200, description: "Avis mis à jour." })
  @ApiResponse({ status: 403, description: "Non autorisé." })
  /**
   * Modifie un avis existant (note ou commentaire).
   * L'utilisateur doit être l'auteur de l'avis.
   * @param id ID de l'avis.
   * @param userId ID de l'utilisateur.
   * @param dto Champs à modifier.
   */
  async update(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @Body() dto: Partial<CreateReviewDto>,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.update(id, userId, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer un avis" })
  @ApiResponse({ status: 200, description: "Avis supprimé." })
  @ApiResponse({ status: 403, description: "Non autorisé." })
  /**
   * Supprime un avis.
   * Accessible à l'auteur de l'avis ou à un administrateur.
   * @param id ID de l'avis.
   * @param user Utilisateur connecté.
   */
  async delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReviewMessageDto> {
    return this.reviewsService.delete(id, user.id, user.roles);
  }

  @Delete("station/:stationId/mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer mon avis sur une station" })
  @ApiResponse({
    status: 200,
    description: "Avis supprimé ou aucun avis trouvé.",
  })
  /**
   * Supprime le review de l'utilisateur connecté pour une station donnée.
   * Utilisé principalement pour les tests E2E (nettoyage d'état).
   * Cette route est idempotente : si aucun review n'existe, retourne un succès.
   * @param stationId ID de la station.
   * @param user Utilisateur connecté.
   */
  async deleteMyReviewOnStation(
    @Param("stationId", ParseIntPipe) stationId: number,
    @CurrentUser("id") userId: number,
  ): Promise<ReviewMessageDto> {
    return this.reviewsService.deleteByStationAndUser(stationId, userId);
  }
}
