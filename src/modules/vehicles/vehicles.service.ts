import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajoute un nouveau véhicule pour un utilisateur.
   *
   * @param userId - ID de l'utilisateur propriétaire.
   * @param createVehicleDto - Données du véhicule à créer.
   * @returns Le véhicule créé avec sa capacité de batterie formatée.
   */
  async create(userId: number, createVehicleDto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        userId,
      },
    });
    return vehicle;
  }

  /**
   * Récupère tous les véhicules d'un utilisateur spécifique.
   * Trie les résultats par date de création décroissante.
   *
   * @param userId - ID de l'utilisateur.
   * @returns Liste des véhicules.
   */
  async findAll(userId: number) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Récupère un véhicule unique par son ID.
   *
   * @param id - ID du véhicule.
   * @returns L'objet véhicule s'il existe.
   */
  findOne(id: number) {
    return this.prisma.vehicle.findUnique({
      where: { id },
    });
  }

  /**
   * Met à jour les informations d'un véhicule.
   *
   * @param id - ID du véhicule à modifier.
   * @param updateVehicleDto - Données à mettre à jour.
   * @returns Le véhicule mis à jour.
   */
  update(id: number, updateVehicleDto: UpdateVehicleDto) {
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  /**
   * Supprime un véhicule de la base de données.
   *
   * @param id - ID du véhicule à supprimer.
   * @returns Le véhicule supprimé.
   */
  remove(id: number) {
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
