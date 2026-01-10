import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportReason, ReportStatus } from "@prisma/client";

/**
 * Service de gestion des signalements.
 * Stocke les plaintes utilisateurs pour modération ultérieure.
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre un nouveau signalement en base de données.
   */
  async create(
    reporterId: number,
    data: {
      targetStationId?: number;
      targetReviewId?: number;
      reason: ReportReason;
      description?: string;
    },
  ) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetStationId: data.targetStationId,
        targetReviewId: data.targetReviewId,
        reason: data.reason,
        description: data.description,
      },
    });
  }

  /**
   * Récupère tous les signalements avec les détails des entités concernées (Reporter, Station, Review, User cible).
   */
  async findAll() {
    return this.prisma.report.findMany({
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        targetStation: {
          include: {
            location: { include: { user: { select: { email: true } } } },
          },
        },
        targetReview: {
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met à jour le statut d'un signalement.
   */
  async updateStatus(id: number, status: ReportStatus) {
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
  }
}
