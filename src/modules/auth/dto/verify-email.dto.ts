import { IsEmail, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour la vérification d'email.
 * Nécessite l'email et le code à 6 chiffres/caractères envoyé.
 */
export class VerifyEmailDto {
  /** L'email de l'utilisateur à vérifier. */
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Le code de validation reçu par email. */
  @ApiProperty({ example: "ABC123" })
  @IsString()
  @IsNotEmpty()
  code: string;
}
