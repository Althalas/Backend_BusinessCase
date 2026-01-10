import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtPayload } from "../interfaces/auth.interface";

/**
 * Stratégie JWT pour Passport.
 * Valide le token Bearer et extrait l'utilisateur.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    // Configuration via injection de dépendances
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get("JWT_SECRET") || "default-secret-key",
    });
  }

  /**
   * Valide le payload du token JWT et récupère l'utilisateur associé.
   * Vérifie également si le compte utilisateur est toujours actif.
   * Cette méthode est appelée automatiquement par Passport après vérification de la signature du token.
   *
   * @param payload - Les données décryptées contenues dans le token (ex: sub, email).
   * @returns Une promesse résolue avec l'objet utilisateur (sans mot de passe) si valide.
   * @throws {UnauthorizedException} Si l'utilisateur n'existe pas ou est désactivé.
   */
  async validate(payload: JwtPayload) {
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

    return user;
  }
}
