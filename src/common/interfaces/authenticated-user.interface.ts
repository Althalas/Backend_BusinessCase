import { UserRole } from "@prisma/client";

/**
 * Interface représentant un utilisateur authentifié.
 * Utilisé dans tous les controllers/services pour remplacer `user: any`.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  roles: UserRole[];
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isValidated?: boolean;
}

/**
 * Type pour les payloads JWT.
 */
export interface JwtPayload {
  sub: number; // userId
  email: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}
