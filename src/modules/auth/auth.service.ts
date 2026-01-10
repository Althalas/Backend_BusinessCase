import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import {
  JwtPayload,
  AuthResponse,
  UserRole,
} from "./interfaces/auth.interface";
import { MailService } from "../mail/mail.service";
import * as crypto from "crypto";

/**
 * Service de gestion de l'authentification.
 * Contient toute la logique métier liée aux utilisateurs et aux tokens.
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  /**
   * Inscrit un nouvel utilisateur.
   * Vérifie l'unicité de l'email, hache le mot de passe et envoie un code de validation.
   * @param dto Données d'inscription.
   * @throws {ConflictException} Si l'email existe déjà.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException("Cet email est déjà enregistré");
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Génération du code de validation
    const validationCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Création de l'utilisateur (Rôle 'Client' par défaut)
    // Les utilisateurs deviennent 'Owner' en ajoutant une borne.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: [UserRole.client], // Always client on registration
        phone: dto.phone,
        address: dto.address,
        postalCode: dto.postalCode,
        city: dto.city,
        isValidated: false,
        validationCode: validationCode,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
      },
    });

    // Envoi de l'email de vérification
    try {
      await this.mailService.sendVerificationEmail(user.email, validationCode);
    } catch (error) {
      // Rollback : Supprimer l'utilisateur si l'envoi d'email échoue
      await this.prisma.user.delete({ where: { id: user.id } });
      throw new BadRequestException(
        "Erreur lors de l'envoi de l'email de validation. Le compte n'a pas été créé. Veuillez réessayer.",
      );
    }

    // NE PAS générer de tokens ici. L'utilisateur doit vérifier son email d'abord.
    return {
      message:
        "Inscription réussie. Veuillez vérifier votre email pour le code de vérification.",
    };
  }

  /**
   * Authentifie un utilisateur actif et validé.
   * @param dto Email et mot de passe.
   * @returns Tokens JWT et informations utilisateur.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.generateTokens(user);
  }

  /**
   * Génère de nouveaux tokens à partir d'un Refresh Token.
   * @param refreshToken Le token de rafraîchissement.
   * @throws {UnauthorizedException} Si le token est invalide ou l'utilisateur banni.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Vérifier le JWT d'abord
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get("JWT_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Token de rafraîchissement invalide");
    }

    // Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Utilisateur introuvable");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Le compte utilisateur est désactivé");
    }

    // Générer de nouveaux tokens
    return this.generateTokens(user);
  }

  /**
   * Gère la déconnexion (placeholder pour une future liste noire de tokens).
   */
  async logout(userId: number): Promise<void> {
    // Pour l'instant, succès simple.
    // Dans une future version avec stockage des refresh tokens, on les supprimerait ici.
    return;
  }

  /**
   * Vérifie l'email utilisateur avec le code reçu.
   * Active le compte (isValidated = true).
   * @param email Email de l'utilisateur.
   * @param code Code à 6 caractères.
   * @returns {Promise<boolean>} True si validation réussie.
   */
  async verifyEmail(email: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException("Utilisateur introuvable");
    }

    if (user.isValidated) {
      return true; // Already validated
    }

    if (user.validationCode !== code) {
      throw new BadRequestException("Code de validation invalide");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isValidated: true,
        validationCode: null,
      },
    });

    return true;
  }

  /**
   * Valide les identifiants de l'utilisateur.
   * Vérifie l'existence, le statut (actif/validé) et le mot de passe.
   * @param email Email de l'utilisateur.
   * @param password Mot de passe en clair.
   * @returns L'utilisateur sans le hash du mot de passe.
   */
  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        isValidated: true, // Select this field
      },
    });

    if (!user) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Le compte utilisateur est désactivé");
    }

    // Vérification de Sécurité Critique
    if (!user.isValidated) {
      throw new UnauthorizedException(
        "Email non vérifié. Veuillez valider votre email d'abord.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  /**
   * Génère la paire de tokens (Access + Refresh) pour un utilisateur.
   * @param user Objet utilisateur.
   * @returns Objet AuthResponse contenant les tokens.
   */
  private async generateTokens(user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
  }): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    // Génération du refresh token
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRATION", "30d"),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };
  }
}
