import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour la connexion utilisateur.
 * Contient les identifiants nécessaires pour obtenir un token JWT.
 */
export class LoginDto {
  /** Adresse email de l'utilisateur. */
  @ApiProperty({ example: "john.doe@email.com" })
  @IsEmail({}, { message: "Format d'email invalide" })
  email: string;

  /** Mot de passe en clair. */
  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(1, { message: "Le mot de passe est requis" })
  password: string;
}
