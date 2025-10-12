import { IsNumber, IsOptional, Min, Max, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ConnectorType } from "@prisma/client";

/**
 * DTO pour la recherche avancée de stations.
 * Permet de filtrer par localisation, connecteur, puissance et prix.
 */
export class SearchStationsDto {
  /** Type de connecteur recherché. */
  @ApiProperty({ example: "TYPE2", enum: ConnectorType, required: false })
  @IsEnum(ConnectorType)
  @IsOptional()
  connectorType?: ConnectorType;
  /** Latitude du centre de recherche. */
  @ApiProperty({
    example: 48.8566,
    required: false,
    description: "Latitude du centre de recherche",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  lat?: number;

  /** Longitude du centre de recherche. */
  @ApiProperty({
    example: 2.3522,
    required: false,
    description: "Longitude du centre de recherche",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  lng?: number;

  /** Rayon de recherche en km (défaut 10km, max 100km). */
  @ApiProperty({
    example: 10,
    required: false,
    description: "Rayon de recherche en km (défaut : 10)",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  radius?: number;

  /** Puissance minimale requise (en kW). */
  @ApiProperty({
    example: 7,
    required: false,
    description: "Puissance minimale en kW",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0.1)
  minPower?: number;

  /** Tarif horaire maximum acceptable (en Euros). */
  @ApiProperty({
    example: 0.5,
    required: false,
    description: "Prix maximum par kWh (tarif horaire)",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0.01)
  maxPrice?: number;

  /** Numéro de page (Pagination). */
  @ApiProperty({ example: 1, required: false, description: "Numéro de page" })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  page?: number;

  /** Nombre d'éléments par page. */
  @ApiProperty({
    example: 10,
    required: false,
    description: "Éléments par page (max 1000)",
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(1000)
  @Max(1000)
  limit?: number;

  /** Filtrer uniquement les bornes disponibles ? */
  @ApiProperty({
    example: true,
    required: false,
    description: "Filtrer uniquement les disponibles",
  })
  @IsOptional()
  isAvailable?: boolean;

  /** Recherche textuelle (Nom, Ville, Adresse). */
  @ApiProperty({
    example: "Paris",
    required: false,
    description: "Requête de recherche (Nom, Ville, Adresse)",
  })
  @IsOptional()
  search?: string;
}
