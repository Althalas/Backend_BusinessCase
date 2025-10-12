import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * Service de gestion des avis utilisateurs.
 * Impose des règles métier strictes (avis unique, réservation complétée requise).
 */
@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un avis.
   * Vérifie que l'utilisateur a terminé une réservation pour cette station (sauf Admin).
   * Vérifie l'unicité de l'avis pour ce couple Utilisateur/Station.
   */
  async create(user: AuthenticatedUser, dto: CreateReviewDto) {
    // Logger retiré pour la production
    try {
      const userId = user.id;
      const isAdmin = user.roles?.includes("admin");

      // Vérifier si l'utilisateur a terminé une réservation à cette station.
      // L'admin contourne cette vérification.
      if (!isAdmin) {
        const reservation = await this.prisma.reservation.findFirst({
          where: {
            renterId: userId,
            chargingStationId: dto.stationId,
            status: "completed",
          },
        });

        if (!reservation) {
          throw new ForbiddenException("Vous devez avoir terminé une réservation pour laisser un avis");
        }

        // Les utilisateurs standard doivent fournir une note
        if (dto.rating === undefined || dto.rating === null) {
          throw new ForbiddenException("La note est requise");
        }
      }

      // Vérifier si l'utilisateur a déjà donné un avis.
      // L'admin peut commenter sans noter, mais gardons l'unicité par couple User/Station pour éviter le spam.
      const existing = await this.prisma.review.findUnique({
        where: {
          userId_stationId: {
            userId,
            stationId: dto.stationId,
          },
        },
      });
      if (existing)
        throw new ConflictException("Vous avez déjà noté cette station");

      return await this.prisma.review.create({
        data: {
          userId,
          ...dto,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      // Erreur loggée par le filtre global
      throw error;
    }
  }

  /**
   * Trouve tous les avis d'une station.
   */
  async findByStation(stationId: number) {
    return this.prisma.review.findMany({
      where: { stationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met à jour un avis existant.
   * Vérifie que l'utilisateur est bien l'auteur.
   */
  async update(id: number, userId: number, dto: Partial<CreateReviewDto>) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Avis introuvable");
    if (review.userId !== userId) throw new ForbiddenException("Accès refusé");

    return this.prisma.review.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Supprime un avis par ID.
   * Autorisé pour l'auteur ou l'admin.
   */
  async delete(id: number, userId: number, userRoles: string[]) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Avis introuvable");

    // L'Admin ou l'Auteur de l'avis peut supprimer
    const isAdmin = userRoles.includes("admin");
    if (review.userId !== userId && !isAdmin) {
      throw new ForbiddenException("Accès refusé");
    }

    await this.prisma.review.delete({ where: { id } });

    return { message: "Review deleted" };
  }

  /**
   * Retrouve les avis donnés par un utilisateur spécifique.
   */
  async findGivenReviews(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrouve tous les avis reçus sur l'ensemble des stations d'un propriétaire.
   */
  async findByOwner(ownerId: number) {
    return this.prisma.review.findMany({
      where: {
        station: {
          location: {
            userId: ownerId,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        station: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Supprime le review d'un utilisateur pour une station spécifique.
   * Utilisé principalement pour les tests E2E (nettoyage d'état).
   * @param stationId ID de la station.
   * @param userId ID de l'utilisateur.
   */
  async deleteByStationAndUser(stationId: number, userId: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        userId_stationId: {
          userId,
          stationId,
        },
      },
    });

    if (!review) {
      // Si pas de review, ce n'est pas une erreur (idempotence pour les tests)
      return { message: "No review to delete" };
    }

    await this.prisma.review.delete({ where: { id: review.id } });

    return { message: "Review deleted" };
  }
}
