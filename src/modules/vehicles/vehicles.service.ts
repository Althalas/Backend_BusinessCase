import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
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
   * Récupère un véhicule unique par son ID avec vérification de propriété.
   *
   * @param userId - ID de l'utilisateur.
   * @param vehicleId - ID du véhicule.
   * @returns L'objet véhicule s'il existe et appartient à l'utilisateur.
   * @throws NotFoundException si le véhicule n'existe pas.
   * @throws ForbiddenException si le véhicule n'appartient pas à l'utilisateur.
   */
  async findOne(userId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException("Véhicule introuvable");
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException("Accès refusé à ce véhicule");
    }

    return vehicle;
  }

  /**
   * Met à jour les informations d'un véhicule avec vérification de propriété.
   *
   * @param userId - ID de l'utilisateur.
   * @param vehicleId - ID du véhicule à modifier.
   * @param updateVehicleDto - Données à mettre à jour.
   * @returns Le véhicule mis à jour.
   * @throws NotFoundException si le véhicule n'existe pas.
   * @throws ForbiddenException si le véhicule n'appartient pas à l'utilisateur.
   */
  async update(userId: number, vehicleId: number, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException("Véhicule introuvable");
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException("Accès refusé à ce véhicule");
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateVehicleDto,
    });
  }

  /**
   * Supprime un véhicule de la base de données avec vérification de propriété.
   *
   * @param userId - ID de l'utilisateur.
   * @param vehicleId - ID du véhicule à supprimer.
   * @returns Le véhicule supprimé.
   * @throws NotFoundException si le véhicule n'existe pas.
   * @throws ForbiddenException si le véhicule n'appartient pas à l'utilisateur.
   */
  async remove(userId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException("Véhicule introuvable");
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException("Accès refusé à ce véhicule");
    }

    return this.prisma.vehicle.delete({
      where: { id: vehicleId },
    });
  }
}
