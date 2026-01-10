import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * Contrôleur des utilisateurs.
 * Gère les profils, l'administration des comptes et les exports de données.
 */
@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: "Récupérer tous les utilisateurs (Admin uniquement)",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des utilisateurs récupérée avec succès.",
  })
  @ApiResponse({ status: 403, description: "Accès refusé." })
  /**
   * Récupère la liste paginée de tous les utilisateurs.
   * Réservé aux administrateurs.
   * @param page Numéro de la page.
   * @param limit Nombre d'éléments par page.
   * @returns Liste paginée d'utilisateurs.
   */
  async findAll(
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
    @Query("search") search?: string,
  ) {
    return this.usersService.findAll(page, limit, search);
  }

  @Get("me")
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: "Profil récupéré avec succès." })
  /**
   * Récupère les informations du profil de l'utilisateur actuellement connecté.
   * @param userId ID de l'utilisateur (extrait du token).
   * @returns Profil utilisateur complet.
   */
  async getProfile(@CurrentUser("id") userId: number) {
    return this.usersService.findOne(userId);
  }

  @Get("me/export")
  @ApiOperation({ summary: "Exporter les données utilisateur (GDPR)" })
  @ApiResponse({ status: 200, description: "Données exportées avec succès." })
  /**
   * Exporte toutes les données associées à l'utilisateur (conforme GDPR).
   * Cette action peut être lourde en données.
   * @param userId ID de l'utilisateur connecté.
   * @returns Objet JSON contenant tout l'historique utilisateur.
   */
  async exportData(@CurrentUser("id") userId: number) {
    return this.usersService.exportUserData(userId);
  }

  @Post("me/avatar")
  @ApiOperation({ summary: "Téléverser un avatar" })
  @ApiResponse({ status: 201, description: "Avatar mis à jour avec succès." })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/avatars",
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join("");
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  /**
   * Permet à l'utilisateur de téléverser une image de profil.
   * Le fichier est stocké localement (pour l'instant) et l'URL est mise à jour en base.
   * @param userId ID de l'utilisateur.
   * @param file Fichier image reçu via Multer.
   * @returns L'URL du nouvel avatar.
   */
  async uploadAvatar(
    @CurrentUser("id") userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(
      userId,
      `/uploads/avatars/${file.filename}`,
    );
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: "Récupérer un utilisateur par ID (Admin uniquement)",
  })
  @ApiResponse({ status: 200, description: "Utilisateur trouvé." })
  @ApiResponse({ status: 404, description: "Utilisateur introuvable." })
  /**
   * Récupère un utilisateur spécifique par son ID.
   * Réservé aux administrateurs.
   * @param id ID de l'utilisateur ciblé.
   * @returns Détails de l'utilisateur.
   */
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Mettre à jour le profil connecté" })
  @ApiResponse({ status: 200, description: "Profil mis à jour." })
  /**
   * Met à jour les informations de l'utilisateur connecté.
   * @param userId ID de l'utilisateur.
   * @param dto Champs à mettre à jour.
   * @returns Profil mis à jour.
   */
  async updateProfile(
    @CurrentUser("id") userId: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Post("me/password")
  @ApiOperation({ summary: "Changer le mot de passe" })
  @ApiResponse({ status: 200, description: "Mot de passe modifié." })
  @ApiResponse({ status: 409, description: "Ancien mot de passe incorrect." })
  /**
   * Permet à l'utilisateur connecté de changer son mot de passe.
   * @param userId ID de l'utilisateur.
   * @param dto Ancien et nouveau mot de passe.
   */
  async changePassword(
    @CurrentUser("id") userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: "Mettre à jour un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Utilisateur mis à jour." })
  /**
   * Met à jour un utilisateur spécifique.
   * Réservé aux administrateurs.
   * @param id ID de l'utilisateur.
   * @param dto Données à modifier.
   * @returns Utilisateur mis à jour.
   */
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(":id/toggle-status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: "Activer/Désactiver un utilisateur" })
  @ApiResponse({ status: 200, description: "Statut modifié avec succès." })
  /**
   * Active ou désactive un compte utilisateur.
   * Utile pour bannir/débannir un utilisateur.
   * Réservé aux administrateurs.
   * @param id ID de l'utilisateur.
   * @returns Nouvel état d'activation.
   */
  async toggleStatus(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.toggleStatus(id);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: "Supprimer un utilisateur" })
  @ApiResponse({ status: 200, description: "Utilisateur supprimé." })
  /**
   * Supprime définitivement un utilisateur.
   * Action irréversible.
   * Réservé aux administrateurs.
   * @param id ID de l'utilisateur.
   * @returns Confirmation de suppression.
   */
  async delete(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }
}
