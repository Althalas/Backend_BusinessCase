import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateStationDto {
  /** Nom de la station. */
  @ApiProperty({ example: "Borne Centre-ville" })
  @IsString()
  @MinLength(3)
  name: string;

  /** Puissance en kW. */
  @ApiProperty({ example: 22, description: "Power in kW" })
  @IsNumber()
  @Min(0.1)
  powerKw: number;

  /** Instructions. */
  @ApiProperty({ example: "Instructions de recharge", required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  /** Mode stand. */
  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isOnStand?: boolean;

  /** Adresse. */
  @ApiProperty({ example: "123 Rue de la République" })
  @IsString()
  address: string;

  /** Code postal. */
  @ApiProperty({ example: "75001" })
  @IsString()
  postalCode: string;

  /** Ville. */
  @ApiProperty({ example: "Paris" })
  @IsString()
  city: string;

  /** Latitude. */
  @ApiProperty({ example: 48.8566 })
  @IsNumber()
  latitude: number;

  /** Longitude. */
  @ApiProperty({ example: 2.3522 })
  @IsNumber()
  longitude: number;

  /** Tarif horaire (€). */
  @ApiProperty({ example: 0.25, description: "Hourly rate in EUR" })
  @IsNumber()
  @Min(0.01)
  hourlyRate: number;
}
