import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * Contrôleur d'authentification.
 * Gère l'inscription, la connexion, le rafraîchissement de tokens et la validation d'email.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Inscrire un nouvel utilisateur" })
  @ApiResponse({
    status: 201,
    description: "Utilisateur inscrit avec succès.",
    type: RegisterDto,
  })
  @ApiResponse({ status: 409, description: "Email déjà utilisé." })
  /**
   * Inscrit un nouvel utilisateur dans le système.
   * Envoie un email de vérification avec un code.
   * @param dto Données d'inscription (email, mot de passe, infos personnelles).
   * @returns Message de succès.
   */
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)

  @ApiOperation({ summary: "Connexion utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Connexion réussie.",
    schema: {
      example: {
        accessToken: "jwt_token",
        refreshToken: "refresh_token",
        user: { id: 1, email: "..." },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Identifiants invalides." })
  /**
   * Authentifie un utilisateur avec email et mot de passe.
   * @param dto Email et mot de passe.
   * @returns {Promise<AuthResponse>} Access Token, Refresh Token et infos utilisateur.
   */
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir le token d'accès" })
  @ApiResponse({ status: 200, description: "Token rafraîchi avec succès." })
  @ApiResponse({ status: 401, description: "Refresh token invalide." })
  /**
   * Génère un nouveau token d'accès à partir d'un refresh token valide.
   * Permet de maintenir la session active sans reconnexion.
   * @param dto Contient le Refresh Token.
   * @returns Nouveaux tokens.
   */
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Déconnexion" })
  @ApiResponse({ status: 200, description: "Déconnecté avec succès." })
  /**
   * Déconnecte l'utilisateur.
   * @param userId ID de l'utilisateur connecté (extrait du token).
   * @returns Message de confirmation.
   */
  async logout(@CurrentUser("id") userId: number) {
    await this.authService.logout(userId);
    return { message: "Déconnecté avec succès" };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vérifier l'adresse email" })
  @ApiResponse({ status: 200, description: "Email vérifié avec succès." })
  @ApiResponse({
    status: 400,
    description: "Code invalide ou utilisateur introuvable.",
  })
  /**
   * Valide l'adresse email de l'utilisateur via un code de vérification.
   * Active le compte utilisateur si le code est correct.
   * @param dto Email et Code.
   * @returns Message de succès.
   */
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.email, dto.code);
    return { message: "Email vérifié avec succès" };
  }
}
