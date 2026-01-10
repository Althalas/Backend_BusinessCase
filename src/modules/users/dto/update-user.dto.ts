import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour la mise à jour des informations utilisateur.
 * Tous les champs sont optionnels pour permettre des mises à jour partielles (PATCH).
 */
export class UpdateUserDto {
  /** Nouvel email (optionnel, doit être unique). */
  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  /** Nouveau mot de passe (optionnel, règles de complexité appliquées). */
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/, {
    message:
      "Password must contain at least 1 uppercase, 1 lowercase, and 1 number",
  })
  @IsOptional()
  password?: string;

  /** Nouveau prénom. */
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  firstName?: string;

  /** Nouveau nom de famille. */
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  lastName?: string;

  /** Nouveau numéro de téléphone. */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  /** URL d'avatar (généralement mis à jour via l'endpoint d'upload). */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
