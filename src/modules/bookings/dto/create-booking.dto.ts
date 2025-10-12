import { IsInt, IsDateString, IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

/**
 * DTO pour la création d'une nouvelle réservation.
 * Contient l'ID de la station, les horaires et le véhicule utilisé.
 */
export class CreateBookingDto {
  /** ID de la station de recharge à réserver. */
  @ApiProperty({ example: 1, description: "ID de la station de recharge" })
  @IsInt()
  @Type(() => Number)
  stationId: number;

  /** Date et heure de début de réservation (ISO 8601). */
  @ApiProperty({
    example: "2025-12-01T14:00:00Z",
    description: "Date et heure de début de réservation",
  })
  @IsDateString()
  startTime: string;

  /** Date et heure de fin de réservation (ISO 8601). */
  @ApiProperty({
    example: "2025-12-01T16:00:00Z",
    description: "Date et heure de fin de réservation",
  })
  @IsDateString()
  endTime: string;

  /** Notes ou instructions spéciales (optionnel). */
  @ApiProperty({
    required: false,
    description: "Notes ou instructions supplémentaires",
  })
  @IsString()
  @IsOptional()
  notes?: string;

  /** ID du véhicule utilisé (optionnel). */
  @ApiProperty({
    required: false,
    description: "ID du véhicule à utiliser pour la réservation",
  })
  @IsInt()
  @IsOptional()
  vehicleId?: number;
}
