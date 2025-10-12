import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ConnectorType } from "@prisma/client";

/**
 * DTO pour la création d'une station de recharge.
 * Inclut les infos de base, la localisation et la tarification initiale.
 */
export class CreateStationDto {
  /** ID d'un lieu existant (optionnel). */
  @ApiProperty({
    example: 1,
    required: false,
    description: "ID d'un lieu existant",
  })
  @IsNumber()
  @IsOptional()
  locationId?: number;

  /** Nom de la station. */
  @ApiProperty({ example: "Borne Centre-ville" })
  @IsString()
  @MinLength(3)
  name: string;

  /** Description détaillée (optionnelle). */
  @ApiProperty({ example: "Instructions de recharge...", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  /** Adresse postale (Numéro et rue). */
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

  /** Puissance de charge en kW. */
  @ApiProperty({ example: 22, description: "Puissance en kW" })
  @IsNumber()
  @Min(0.1)
  power: number;

  /** Tarif horaire par kWh en Euros. */
  @ApiProperty({
    example: 0.25,
    description: "Prix par kWh en EUR (tarif horaire)",
  })
  @IsNumber()
  @Min(0.01)
  pricePerKwh: number;

  /** Type de connecteur (ex: TYPE2, CCS). */
  @ApiProperty({ example: "TYPE2", enum: ConnectorType, required: false })
  @IsEnum(ConnectorType)
  @IsOptional()
  connector?: ConnectorType;

  /** Instructions d'accès spécifiques (optionnel). */
  @ApiProperty({
    example: "Instructions pour accéder à la borne...",
    required: false,
  })
  @IsString()
  @IsOptional()
  instructions?: string;

  /** Indique si la borne est sur un stand (emplacement temporaire). */
  @ApiProperty({
    example: true,
    required: false,
    description: "Si la station est sur un stand",
  })
  @IsOptional()
  isOnStand?: boolean;

  /** Liste URLs photos (optionnel). */
  @ApiProperty({ example: ["https://example.com/photo.jpg"], required: false })
  @IsOptional()
  photos?: string[];
}
