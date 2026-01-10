import { IsUUID, IsInt, IsString, IsOptional, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour la création d'un avis.
 * Contient le stationId, une note (1-5) et un commentaire optionnel.
 */
export class CreateReviewDto {
  /** ID de la station évaluée. */
  @ApiProperty()
  @IsInt()
  stationId: number;

  /** Note de 1 à 5 (optionnel pour admin, obligatoire pour user). */
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  /** Commentaire textuel (optionnel). */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
