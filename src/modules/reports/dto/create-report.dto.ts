import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsNumber, IsString } from "class-validator";
import { ReportReason } from "@prisma/client";

/**
 * DTO pour la création d'un signalement.
 * Peut cibler une station ou un avis.
 */
export class CreateReportDto {
  @ApiProperty({
    description: "ID de la station signalée (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  targetStationId?: number;

  @ApiProperty({
    description: "ID de l'avis signalé (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  targetReviewId?: number;

  @ApiProperty({ description: "Motif du signalement", enum: ReportReason })
  @IsNotEmpty()
  reason: ReportReason;

  @ApiProperty({ description: "Description détaillée", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
