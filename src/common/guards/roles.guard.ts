import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "../../modules/auth/interfaces/auth.interface";

/**
 * Garde d'autorisation basé sur les rôles (RBAC).
 * Vérifie si l'utilisateur possède les rôles requis par le décorateur @Roles().
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Initialise le guard de rôles.
   * @param reflector - Service permettant d'accéder aux métadonnées des décorateurs via réflexion.
   */
  constructor(private reflector: Reflector) {}

  /**
   * Méthode de validation principale du guard.
   * Détermine si la requête courante doit être autorisée en fonction des rôles de l'utilisateur.
   *
   * @param context - Le contexte d'exécution (la requête courante).
   * @returns `true` si l'utilisateur a les droits, `false` sinon.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return user.roles?.some((role: UserRole) => requiredRoles.includes(role));
  }
}
