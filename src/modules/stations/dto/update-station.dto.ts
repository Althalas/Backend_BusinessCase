import { PartialType } from "@nestjs/swagger";
import { CreateStationDto } from "./create-station.dto";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO pour la mise à jour d'une station.
 * Permet de modifier les infos descriptives ou de changer le statut (active/stand).
 */
export class UpdateStationDto extends PartialType(CreateStationDto) {
  /** Statut d'activité de la borne (disponible à la réservation). */
  @ApiProperty({
    required: false,
    description: "Whether the station is active and available for booking",
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  /** Statut stand (emplacement temporaire). */
  @ApiProperty({
    required: false,
    description: "Whether the station is on a stand (temporary location)",
  })
  @IsBoolean()
  @IsOptional()
  isOnStand?: boolean;

  /** Mettre à jour les instructions. */
  @ApiProperty({ required: false, example: "Instructions mises à jour..." })
  @IsString()
  @IsOptional()
  instructions?: string;
}
