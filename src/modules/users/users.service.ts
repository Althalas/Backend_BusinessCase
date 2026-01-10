import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

/**
 * Service de gestion des utilisateurs.
 * Gère le CRUD utilisateur, le statut (activation/validation) et l'export GDPR.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère la liste paginée de tous les utilisateurs.
   * @param page Numéro de page (défaut: 1).
   * @param limit Nombre d'éléments par page (défaut: 10).
   * @returns Liste d'utilisateurs et métadonnées de pagination.
   */
  async findAll(page = 1, limit = 10, search?: string) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: Prisma.UserWhereInput = search
      ? {
          deletedAt: null, // Exclure les utilisateurs supprimés (soft-delete)
          OR: [
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              firstName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              lastName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : { deletedAt: null }; // Exclure les utilisateurs supprimés (soft-delete)

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limitNumber,
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          phone: true,
          isActive: true,
          isValidated: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  /**
   * Trouve un utilisateur par son ID avec ses relations (Counts).
   * @param id ID de l'utilisateur.
   * @throws {NotFoundException} Si l'utilisateur n'existe pas.
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        phone: true,
        address: true,
        postalCode: true,
        city: true,
        isActive: true,
        isValidated: true,
        createdAt: true,
        _count: {
          select: {
            locations: true,
            reservations: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    return user;
  }

  /**
   * Trouve un utilisateur par son email.
   * @param email Email à chercher.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Met à jour les informations d'un utilisateur.
   * Gère le hachage du mot de passe si modifié.
   * @param id ID de l'utilisateur.
   * @param dto Données à mettre à jour.
   * @throws {ConflictException} Si le nouvel email est déjà pris.
   */
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException("Email déjà utilisé");
      }
    }

    // Extraire le mot de passe séparément car il doit être haché
    const { password, ...dtoWithoutPassword } = dto;
    const updateData: Prisma.UserUpdateInput = { ...dtoWithoutPassword };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        phone: true,
      },
    });
  }

  /**
   * Change le mot de passe de l'utilisateur.
   * Vérifie l'ancien mot de passe avant de le remplacer.
   */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundException(
        "Utilisateur introuvable ou compte invalide.",
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new ConflictException("Le mot de passe actuel est incorrect.");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: "Mot de passe mis à jour avec succès." };
  }

  /**
   * Supprime un utilisateur définitivement.
   * Cascade delete sur ses données liées via Prisma.
   */
  async delete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: "User deleted successfully" };
  }

  /**
   * Active ou désactive un utilisateur (Soft Ban).
   * @returns Le nouvel état (isActive).
   */
  async toggleStatus(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });
  }
  /**
   * Met à jour l'URL de l'avatar de l'utilisateur.
   */
  async updateAvatar(id: number, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
  }

  /**
   * Exporte toutes les données d'un utilisateur (GDPR).
   * Inclut infos perso, réservations, véhicules, avis et favoris.
   * Exclut les données sensibles (hash mot de passe).
   */
  async exportUserData(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        reservations: {
          include: {
            chargingStation: {
              select: {
                name: true,
                location: { select: { address: true } },
              },
            },
            payment: true,
          },
        },
        vehicles: true,
        locations: {
          include: {
            chargingStations: true,
          },
        },
        reviews: true,
        favorites: {
          include: {
            station: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    // Exclure les données sensibles
    const { passwordHash, validationCode, ...cleanUser } = user;
    return cleanUser;
  }
}
