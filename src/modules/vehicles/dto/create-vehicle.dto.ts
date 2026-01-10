import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  IsNumber,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateVehicleDto {
  @ApiProperty({ description: "Marque du véhicule" })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ description: "Modèle du véhicule" })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: "Numéro de plaque d'immatriculation" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  licensePlate: string;

  @ApiProperty({
    description: "Type de connecteur de charge",
    enum: ["TYPE2", "CCS", "CHADEMO", "DOMESTIC"],
    required: false,
    example: "TYPE2",
  })
  @IsOptional()
  @IsEnum(["TYPE2", "CCS", "CHADEMO", "DOMESTIC"])
  connectorType?: "TYPE2" | "CCS" | "CHADEMO" | "DOMESTIC";

  @ApiProperty({
    description: "Capacité de la batterie en kWh",
    required: false,
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  batteryCapacity?: number;
}
