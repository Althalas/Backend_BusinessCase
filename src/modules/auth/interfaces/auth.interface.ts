import { UserRole } from "@prisma/client";

export { UserRole };

/**
 * Payload du token JWT.
 * Contient les informations minimales pour identifier l'utilisateur.
 */
export interface JwtPayload {
  sub: number;
  email: string;
  roles: UserRole[];
}

/**
 * Réponse d'authentification standard.
 * Contient les tokens et les infos de l'utilisateur connecté.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
  };
}
