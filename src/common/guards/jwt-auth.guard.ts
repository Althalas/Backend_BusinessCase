import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Garde d'authentification JWT global.
 * Vérifie la validité du token Bearer dans les requêtes protégées.
 * Étend le guard standard de Passport 'jwt'.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
