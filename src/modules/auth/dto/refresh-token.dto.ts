import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour le rafraîchissement du token d'accès.
 * Nécessite un Refresh Token valide.
 */
export class RefreshTokenDto {
  /** Le token de rafraîchissement (JWT). */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
