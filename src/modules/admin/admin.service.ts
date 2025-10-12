import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * DTO pour la suppression d'une station.
 */
export interface DeleteStationDto {
  reason: string;
}

/**
 * DTO pour l'annulation d'une réservation.
 */
export interface CancelReservationDto {
  reason: string;
}

/**
 * DTO pour le refus d'une réservation.
 */
export interface RejectReservationDto {
  reason: string;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalStations,
      totalReservations,
      pendingReservations,
      totalValidated,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.chargingStation.count(),
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: "pending" } }),
      this.prisma.user.count({ where: { isValidated: true } }),
    ]);

    return {
      totalUsers,
      totalStations,
      totalReservations,
      pendingReservations,
      pendingValidations: totalUsers - totalValidated,
    };
  }

  async getAllStations(page = 1, limit = 10, search?: string) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const whereClause: Prisma.ChargingStationWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const [stations, total] = await Promise.all([
      this.prisma.chargingStation.findMany({
        skip,
        take: limitNumber,
        where: whereClause,
        include: {
          location: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.chargingStation.count({ where: whereClause }),
    ]);

    return {
      data: stations,
      meta: {
        total,
        page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  async getAllReservations(page = 1, limit = 10, search?: string) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const whereClause: Prisma.ReservationWhereInput = {};

    // Implémentation de base de la recherche (ex: par nom du locataire ou nom de la borne)
    if (search) {
      whereClause.OR = [
        {
          renter: {
            OR: [
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
              {
                email: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
            ],
          },
        },
        {
          chargingStation: {
            name: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
        },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        skip,
        take: limitNumber,
        where: whereClause,
        include: {
          renter: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          chargingStation: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reservation.count({ where: whereClause }),
    ]);

    return {
      data: reservations,
      meta: {
        total,
        page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  async deleteStation(id: number, reason: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Station introuvable");
    }

    await this.prisma.chargingStation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletionReason: reason,
        deletedBy: "admin",
      },
    });

    return { message: "Station deleted successfully", deletedAt: new Date() };
  }

  async reactivateStation(id: number) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException("Station introuvable");
    }

    /* NOTE : Politique de Réactivation
       L'administrateur peut réactiver une borne (isActive = true).
       Si la borne était supprimée (soft-delete), on pourrait aussi vouloir la restaurer (deletedAt = null).
       Pour l'instant, on force simplement l'activation. */
    return this.prisma.chargingStation.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  async cancelReservation(id: number, reason: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy: "admin",
      },
    });
  }

  async approveReservation(id: number, user: AuthenticatedUser) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        chargingStation: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si l'utilisateur est admin ou propriétaire de la borne
    const isAdmin = user.roles?.includes(UserRole.admin);
    const isOwner = reservation.chargingStation.location.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new NotFoundException("Non autorisé à approuver cette réservation");
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: "accepted",
      },
    });
  }

  async rejectReservation(id: number, reason: string, user: AuthenticatedUser) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        chargingStation: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si l'utilisateur est admin ou propriétaire de la borne
    const isAdmin = user.roles?.includes(UserRole.admin);
    const isOwner = reservation.chargingStation.location.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new NotFoundException("Non autorisé à refuser cette réservation");
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: "refused",
        cancellationReason: reason,
        refusedBy: isAdmin ? "admin" : "owner",
      },
    });
  }

  /**
   * Soft-delete un utilisateur (RGPD compliant).
   * Les réservations et historique sont conservés.
   */
  async softDeleteUser(id: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    if ((user as any).deletedAt) {
      throw new NotFoundException("L'utilisateur est déjà supprimé");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Restaure un utilisateur soft-deleted.
   */
  async restoreUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    if (!(user as any).deletedAt) {
      throw new NotFoundException("L'utilisateur n'est pas supprimé");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        deletedAt: true,
        isActive: true,
      },
    });
  }

  /**
   * Récupère tous les utilisateurs (incluant soft-deleted pour admin).
   */
  async getAllUsers(
    page = 1,
    limit = 10,
    search?: string,
    includeDeleted = false,
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: Prisma.UserWhereInput = includeDeleted
      ? {}
      : { deletedAt: null };

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

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
          deletedAt: true,
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
}
