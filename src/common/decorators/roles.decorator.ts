import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../../modules/auth/interfaces/auth.interface";

/** Clé de métadonnées pour stocker les rôles requis via le décorateur @Roles. */
export const ROLES_KEY = "roles";

/**
 * Décorateur permettant de définir les rôles requis pour accéder à une route ou un contrôleur.
 * Les rôles spécifiés seront vérifiés par le `RolesGuard`.
 *
 * @param roles - Une liste de rôles autorisés (ex: UserRole.ADMIN).
 * @returns Un décorateur qui définit les métadonnées de rôles.
 *
 * @example
 * \@Roles(UserRole.ADMIN)
 * \@Get('admin')
 * adminRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
