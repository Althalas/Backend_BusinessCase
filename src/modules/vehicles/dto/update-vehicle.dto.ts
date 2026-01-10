import { PartialType } from "@nestjs/swagger";
import { CreateVehicleDto } from "./create-vehicle.dto";

/**
 * DTO pour la mise à jour d'un véhicule.
 * Hérite de toutes les propriétés de creation mais rendues optionnelles.
 */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
