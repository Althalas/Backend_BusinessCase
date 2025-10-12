import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO (Data Transfer Object) pour l'inscription d'un nouvel utilisateur.
 * Contient toutes les informations personnelles requises et les règles de validation.
 */
export class RegisterDto {
  /** Adresse email de l'utilisateur (doit être unique). */
  @ApiProperty({ example: "john.doe@email.com" })
  @IsEmail({}, { message: "Format d'email invalide" })
  email: string;

  /** Mot de passe sécurisé (8 cars min, Maj/Min/Chiffre requis). */
  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères",
  })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/, {
    message:
      "Le mot de passe doit contenir au moins 1 majuscule, 1 minuscule et 1 chiffre",
  })
  password: string;

  /** Prénom de l'utilisateur. */
  @ApiProperty({ example: "John" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  /** Nom de famille de l'utilisateur. */
  @ApiProperty({ example: "Doe" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  /** Numéro de téléphone (format international recommandé). */
  @ApiProperty({ example: "+33612345678", required: true })
  @IsString()
  phone: string;

  /** Adresse postale (Numéro et rue). */
  @ApiProperty({ description: "Adresse (Optionnel)" })
  @IsOptional()
  @IsString()
  address?: string;

  /** Code postal. */
  @ApiProperty({ description: "Code postal (Optionnel)" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  /** Ville de résidence. */
  @ApiProperty({ description: "Ville (Optionnel)" })
  @IsOptional()
  @IsString()
  city?: string;
}
