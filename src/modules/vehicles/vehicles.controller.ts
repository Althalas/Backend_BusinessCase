import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";

@ApiTags("vehicles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: "Ajouter un véhicule" })
  @ApiResponse({ status: 201, description: "Véhicule ajouté avec succès." })
  /**
   * Ajoute un nouveau véhicule électrique au profil de l'utilisateur connecté.
   *
   * @param req - La requête courante (pour extraire l'ID utilisateur).
   * @param createVehicleDto - Les informations du véhicule à ajouter.
   * @returns Le véhicule créé.
   */
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.id, createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: "Mes véhicules" })
  @ApiResponse({ status: 200, description: "Liste des véhicules." })
  /**
   * Récupère la liste complète des véhicules enregistrés par l'utilisateur connecté.
   *
   * @param req - La requête courante.
   * @returns Une liste d'objets véhicule.
   */
  findAll(@CurrentUser("id") userId: number) {
    return this.vehiclesService.findAll(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détails d'un véhicule" })
  @ApiResponse({ status: 200, description: "Détails du véhicule." })
  @ApiResponse({ status: 404, description: "Véhicule introuvable." })
  @ApiResponse({ status: 403, description: "Accès refusé." })
  /**
   * Récupère les informations détaillées d'un véhicule spécifique.
   * Vérifie que le véhicule appartient à l'utilisateur connecté.
   *
   * @param userId - L'ID de l'utilisateur connecté.
   * @param id - L'identifiant unique du véhicule.
   * @returns L'objet véhicule correspondant.
   */
  findOne(@CurrentUser("id") userId: number, @Param("id") id: string) {
    return this.vehiclesService.findOne(userId, +id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un véhicule" })
  @ApiResponse({ status: 200, description: "Véhicule mis à jour." })
  @ApiResponse({ status: 403, description: "Accès refusé." })
  /**
   * Met à jour les informations d'un véhicule existant (ex: changer le modèle, la plaque).
   * Vérifie que le véhicule appartient à l'utilisateur connecté.
   *
   * @param userId - L'ID de l'utilisateur connecté.
   * @param id - L'identifiant du véhicule à modifier.
   * @param updateVehicleDto - Les nouvelles données à appliquer.
   * @returns Le véhicule mis à jour.
   */
  update(
    @CurrentUser("id") userId: number,
    @Param("id") id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(userId, +id, updateVehicleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer un véhicule" })
  @ApiResponse({ status: 200, description: "Véhicule supprimé." })
  @ApiResponse({ status: 403, description: "Accès refusé." })
  /**
   * Supprime définitivement un véhicule du profil de l'utilisateur.
   * Vérifie que le véhicule appartient à l'utilisateur connecté.
   *
   * @param userId - L'ID de l'utilisateur connecté.
   * @param id - L'identifiant du véhicule à supprimer.
   * @returns Le véhicule supprimé.
   */
  remove(@CurrentUser("id") userId: number, @Param("id") id: string) {
    return this.vehiclesService.remove(userId, +id);
  }
}
