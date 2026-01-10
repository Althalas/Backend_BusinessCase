import { Prisma } from "@prisma/client";
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { BookingResponseDto } from "./dto/booking-response.dto";
import { ReservationStatus } from "@prisma/client";
import * as ExcelJS from "exceljs";

/**
 * Service de gestion des réservations.
 * Gère la logique complexe de réservation (locks, transactions, calcul de prix, paiements).
 */
@Injectable()
export class BookingsService {
  private stripe: Stripe;
  private readonly logger = new Logger(BookingsService.name);
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get("STRIPE_SECRET_KEY") || "",
      { apiVersion: "2025-02-24.acacia" },
    );
  }

  /**
   * Crée une réservation en gérant la concurrence.
   * Utilise une transaction avec verrou pessimiste sur la station pour éviter les doublons.
   *
   * @param userId - ID du locataire
   * @param dto - Données de la réservation
   * @throws {ConflictException} Si le créneau est pris ou la station inactive
   * @throws {BadRequestException} Si les horaires sont invalides
   */
  async create(userId: number, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const now = new Date();

    if (start < now) {
      throw new BadRequestException("Impossible de réserver dans le passé");
    }

    if (end <= start) {
      throw new BadRequestException(
        "La date de fin doit être postérieure à la date de début",
      );
    }

    if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
      throw new BadRequestException(
        "La durée minimale de réservation est de 30 minutes",
      );
    }

    // Validation horaires (06h00 - 22h00)
    const startHour = start.getHours();
    const endHour = end.getHours();
    const endMinutes = end.getMinutes();

    // Vérifie si le début est avant 06h00 ou après 22h00
    if (startHour < 6 || startHour >= 22) {
      throw new BadRequestException(
        "Les réservations ne sont possibles qu'entre 06h00 et 22h00",
      );
    }

    // Vérifie si la fin est après 22h00 (ou minuit si c'est le même jour, mais ici on veut strict 22h)
    // Cas limite : 22h00 pile est accepté (endHour = 22, endMinutes = 0)
    if (endHour > 22 || (endHour === 22 && endMinutes > 0)) {
      throw new BadRequestException(
        "Les réservations ne sont possibles qu'entre 06h00 et 22h00",
      );
    }

    // Vérifie si la réservation s'étend sur la nuit (interdit par définition si borné 6-22)
    if (start.getDate() !== end.getDate()) {
      throw new BadRequestException(
        "Les réservations de nuit ne sont pas autorisées (fermeture à 22h00)",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Verrouillage de la station (Lock Pessimiste)
      await tx.$queryRaw`SELECT 1 FROM "ChargingStation" WHERE id = ${dto.stationId} FOR UPDATE`;

      // 2. Récupération et validation
      const station = await tx.chargingStation.findUnique({
        where: { id: dto.stationId },
        include: {
          location: true,
          pricing: {
            where: { validTo: null },
            orderBy: { validFrom: "desc" },
            take: 1,
          },
        },
      });

      if (!station) {
        throw new NotFoundException("Borne de recharge introuvable");
      }

      // Empêcher le propriétaire de réserver sa propre borne
      if (station.location.userId === userId) {
        throw new BadRequestException(
          "Vous ne pouvez pas réserver votre propre borne.",
        );
      }

      if (!station.isActive || !(station as any).isAvailable) {
        throw new ConflictException(
          "La borne de recharge n'est pas active ou indisponible",
        );
      }

      // 3. Vérification de conflit (Dans le lock)
      const conflicts = await tx.reservation.findMany({
        where: {
          chargingStationId: dto.stationId,
          status: {
            in: ["pending", "accepted"],
          },
          OR: [
            {
              startDatetime: { lte: dto.endTime },
              endDatetime: { gte: dto.startTime },
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw new ConflictException(
          "Station déjà réservée pour ce créneau horaire",
        );
      }

      // 4. Calcul du prix
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const currentPricing = station.pricing[0];
      const hourlyRate = Number(currentPricing?.hourlyRate || 0);

      if (!currentPricing || hourlyRate <= 0) {
        throw new ConflictException(
          "Erreur fonctionnelle : Aucune tarification valide pour cette borne.",
        );
      }

      const totalAmount = Math.round(hours * hourlyRate * 100) / 100;

      // 5. Création de la réservation
      const reservation = await tx.reservation.create({
        data: {
          renterId: userId,
          chargingStationId: dto.stationId,
          startDatetime: dto.startTime,
          endDatetime: dto.endTime,
          totalAmount,
          status: "pending",
          vehicleId: dto.vehicleId,
        },
        include: {
          chargingStation: {
            select: {
              id: true,
              name: true,
              city: true,
              latitude: true,
              longitude: true,
              powerKw: true,
              isActive: true,
            },
          },
          renter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return BookingResponseDto.fromReservation(reservation as any);
    });
  }

  /**
   * Récupère les créneaux déjà réservés pour une date donnée.
   * Permet au frontend de griser les heures indisponibles.
   */
  async getBusySlots(stationId: number, dateStr: string) {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.reservation.findMany({
      where: {
        chargingStationId: stationId,
        status: { in: ["pending", "accepted"] },
        AND: [
          { startDatetime: { lte: endOfDay } },
          { endDatetime: { gte: startOfDay } },
        ],
      },
      select: { startDatetime: true, endDatetime: true },
    });
    return bookings;
  }

  /**
   * Récupère les réservations d'un utilisateur (en tant que conducteur) avec pagination.
   * @param userId ID du conducteur.
   * @param filterStatus Filtre optionnel par statut.
   * @param timeFilter Filtre temporel ('upcoming' | 'history').
   * @param page Numéro de page (1-based).
   * @param limit Éléments par page.
   */
  async findByDriver(
    userId: number,
    filterStatus?: ReservationStatus,
    timeFilter?: "upcoming" | "history",
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const whereClause: Prisma.ReservationWhereInput = {
      renterId: userId,
      ...(filterStatus && { status: filterStatus }),
    };

    // Application du filtre temporel stricte
    if (timeFilter === "upcoming") {
      // Réservations futures et actives (En attente ou Acceptées)
      whereClause.startDatetime = { gt: now };
      whereClause.status = { in: ["pending", "accepted"] };
    } else if (timeFilter === "history") {
      // Historique : Passées OU Terminé/Annulé/Refusé
      whereClause.OR = [
        { startDatetime: { lte: now } }, // Past time
        { status: { in: ["cancelled", "refused", "completed"] } }, // Or finished status regardless of time (though usually time corresponds)
      ];
    }

    // Simplification pour la fiabilité :
    // L'utilisateur veut "Mes réservations futures" vs "Mon historique".
    if (timeFilter === "upcoming") {
      whereClause.startDatetime = { gt: now };
      whereClause.status = { in: ["pending", "accepted"] }; // Actives uniquement
    } else if (timeFilter === "history") {
      // Logique complexe : Soit c'est dans le passé, SOIT c'est déjà annulé/refusé même dans le futur.
      whereClause.OR = [
        { endDatetime: { lte: now } }, // Terminé
        { status: { in: ["cancelled", "refused", "completed"] } }, // Statut terminal
      ];
    }

    const [total, reservations] = await Promise.all([
      this.prisma.reservation.count({ where: whereClause }),
      this.prisma.reservation.findMany({
        where: whereClause,
        include: {
          chargingStation: {
            select: {
              id: true,
              name: true,
              city: true,
              latitude: true,
              longitude: true,
              powerKw: true,
            },
          },
          payment: true,
        },
        orderBy: { startDatetime: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const data = BookingResponseDto.fromReservations(reservations as any);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupère les réservations pour une station donnée.
   * Accessible uniquement au propriétaire de la station ou à un admin.
   */
  async findByStation(stationId: number, userId: number, userRoles: string[]) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id: stationId },
      include: { location: true },
    });

    if (!station) {
      throw new NotFoundException("Borne de recharge introuvable");
    }

    // Vérifier que l'utilisateur est le propriétaire via location.userId ou admin
    if (station.location.userId !== userId && !userRoles.includes("admin")) {
      throw new ForbiddenException("Accès refusé");
    }

    const reservations = await this.prisma.reservation.findMany({
      where: { chargingStationId: stationId },
      include: {
        renter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startDatetime: "desc" },
    });

    return BookingResponseDto.fromReservations(reservations as any);
  }

  /**
   * Récupère une réservation par son ID.
   * Inclut toutes les relations nécessaires (Station, Location, User, Pricing, Payment).
   */
  async findOne(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        chargingStation: {
          include: {
            location: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            pricing: {
              where: { validTo: null },
              orderBy: { validFrom: "desc" },
              take: 1,
            },
          },
        },
        renter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        payment: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    return BookingResponseDto.fromReservation(reservation as any);
  }

  /**
   * Simule le paiement et confirme la réservation.
   * Crée l'enregistrement de paiement et passe la réservation à 'accepted'.
   * @param id ID de la réservation.
   * @param userId ID de l'utilisateur qui paie.
   */
  async processPayment(id: number, userId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    if (reservation.renterId !== userId) {
      throw new ForbiddenException("Accès refusé");
    }

    if (reservation.status !== "pending") {
      throw new ConflictException("La réservation n'est pas en attente");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Mettre à jour le paiement existant (créé par createPaymentIntent) en 'completed'
      // Ou le créer s'il n'existe pas (fallback, bien que flux inhabituel)
      const existingPayment = await tx.payment.findUnique({
        where: { reservationId: id },
      });

      if (existingPayment) {
        await tx.payment.update({
          where: { reservationId: id },
          data: {
            paymentStatus: "completed",
            paymentDate: new Date(),
            // On conserve le stripePaymentId d'origine défini par createPaymentIntent
          },
        });
      } else {
        // Fallback : Créer un paiement simulé s'il n'existait pas (ex: flux legacy ou appel direct)
        await tx.payment.create({
          data: {
            reservationId: id,
            amount: reservation.totalAmount,
            paymentStatus: "completed",
            stripePaymentId: "mock_stripe_" + Date.now(),
            cardLastDigits: "4242",
            paymentDate: new Date(),
          },
        });
      }

      // 2. Update Reservation Status
      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: "accepted",
        },
        include: {
          chargingStation: {
            select: {
              id: true,
              name: true,
              city: true,
              latitude: true,
              longitude: true,
              powerKw: true,
            },
          },
          renter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          payment: true,
        },
      });
      return BookingResponseDto.fromReservation(updated as any);
    });
  }

  /**
   * Met à jour le statut d'une réservation (ex: Acceptée, Refusée).
   * Vérifie minutieusement les droits d'accès.
   */
  async updateStatus(
    id: number,
    newStatus: ReservationStatus,
    userId: number,
    userRoles: string[],
    reason?: string,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        chargingStation: {
          include: { location: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier les permissions
    const isDriver = reservation.renterId === userId;
    const isHost = reservation.chargingStation.location.userId === userId;
    const isAdmin = userRoles.includes("admin");

    if (!isDriver && !isHost && !isAdmin) {
      throw new ForbiddenException("Accès refusé");
    }

    const updateData: Prisma.ReservationUpdateInput = { status: newStatus };

    if (reason) {
      updateData.cancellationReason = reason;
    }

    if (newStatus === "refused") {
      if (isAdmin) updateData.refusedBy = "admin";
      else if (isHost) updateData.refusedBy = "owner";
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        chargingStation: {
          select: {
            id: true,
            name: true,
            city: true,
            latitude: true,
            longitude: true,
            powerKw: true,
          },
        },
      },
    });

    return BookingResponseDto.fromReservation(updated as any);
  }

  /**
   * Annule une réservation (Coté Locataire).
   * Possible uniquement si la réservation n'est pas déjà terminée ou annulée.
   * Si la réservation était payée (accepted), un remboursement automatique est déclenché.
   * Règle de remboursement : 100% si >= 24h avant, 80% si < 24h avant.
   */
  async cancel(id: number, userId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    if (reservation.renterId !== userId) {
      throw new ForbiddenException("Accès refusé");
    }

    if (!["pending", "accepted"].includes(reservation.status)) {
      throw new ConflictException("Impossible d'annuler cette réservation");
    }

    // Variables pour le remboursement
    let refundResult: {
      refunded: boolean;
      refundPercentage?: number;
      refundAmount?: number;
      message?: string;
    } = { refunded: false };

    // Si la réservation était payée (accepted avec paiement completed), on rembourse
    this.logger.log("[CANCEL] Checking refund eligibility:", {
      status: reservation.status,
      hasPayment: !!reservation.payment,
      paymentStatus: reservation.payment?.paymentStatus,
      stripePaymentId: reservation.payment?.stripePaymentId,
    });

    if (
      reservation.status === "accepted" &&
      reservation.payment &&
      reservation.payment.paymentStatus === "completed"
    ) {
      // Calculer le pourcentage de remboursement
      const now = new Date();
      const startTime = new Date(reservation.startDatetime);
      const hoursUntilStart =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const refundPercentage = hoursUntilStart >= 24 ? 100 : 80;
      const refundAmount = Math.round(
        Number(reservation.payment.amount) * (refundPercentage / 100) * 100,
      );

      // Vérifier si c'est un paiement simulé ou réel
      const isSimulatedPayment =
        !reservation.payment.stripePaymentId ||
        reservation.payment.stripePaymentId.startsWith("mock_") ||
        reservation.payment.stripePaymentId.startsWith("SIM_");

      if (isSimulatedPayment) {
        // Remboursement simulé - juste mettre à jour le statut
        this.logger.log("[CANCEL] Simulated refund for mock payment");

        await this.prisma.payment.update({
          where: { id: reservation.payment.id },
          data: { paymentStatus: "refunded" },
        });

        refundResult = {
          refunded: true,
          refundPercentage,
          refundAmount: refundAmount / 100,
          message:
            refundPercentage === 100
              ? "Remboursement simulé intégral effectué"
              : `Remboursement simulé partiel (${refundPercentage}%) - Annulation tardive`,
        };
      } else {
        // Vrai remboursement Stripe
        try {
          this.logger.log("[CANCEL] Real Stripe refund");

          const refund = await this.stripe.refunds.create({
            payment_intent: reservation.payment.stripePaymentId,
            amount: refundAmount,
            reason: "requested_by_customer",
          } as any);

          this.logger.log(`[CANCEL] Refund created: ${refund.id}`);

          await this.prisma.payment.update({
            where: { id: reservation.payment.id },
            data: { paymentStatus: "refunded" },
          });

          refundResult = {
            refunded: true,
            refundPercentage,
            refundAmount: refundAmount / 100,
            message:
              refundPercentage === 100
                ? `Remboursement intégral effectué (Stripe: ${refund.id})`
                : `Remboursement partiel (${refundPercentage}%) - Annulation tardive (Stripe: ${refund.id})`,
          };
        } catch (error) {
          console.error("Erreur de remboursement lors de l'annulation :", error);
          refundResult = {
            refunded: false,
            message: "Erreur lors du remboursement: " + error.message,
          };
        }
      }
    }

    const cancelled = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledBy: "user",
        cancellationReason: refundResult.refunded
          ? `Annulé par l'utilisateur - ${refundResult.message}`
          : "Annulé par l'utilisateur",
      },
      include: {
        chargingStation: {
          select: {
            id: true,
            name: true,
            city: true,
            latitude: true,
            longitude: true,
            powerKw: true,
          },
        },
        payment: true,
      },
    });

    const response = BookingResponseDto.fromReservation(cancelled as any);

    // Ajouter les infos de remboursement à la réponse
    return {
      ...response,
      refund: refundResult,
    };
  }

  /**
   * Génère un fichier Excel des réservations d'un utilisateur.
   */
  async exportBookings(userId: number): Promise<Buffer> {
    const bookings = await this.prisma.reservation.findMany({
      where: {
        renterId: userId,
        OR: [
          { endDatetime: { lte: new Date() } }, // Finished bookings
          { status: { in: ["cancelled", "refused"] } }, // Cancelled/Refused are considered history
        ],
      },
      include: {
        chargingStation: {
          select: { name: true, city: true },
        },
      },
      orderBy: { startDatetime: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mes Réservations");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Station", key: "station", width: 30 },
      { header: "Ville", key: "city", width: 20 },
      { header: "Début", key: "start", width: 25 },
      { header: "Fin", key: "end", width: 25 },
      { header: "Coût (€)", key: "amount", width: 15 },
      { header: "Statut", key: "status", width: 15 },
    ];

    bookings.forEach((b) => {
      worksheet.addRow({
        id: b.id,
        station: b.chargingStation.name,
        city: b.chargingStation.city,
        start: b.startDatetime.toLocaleString(),
        end: b.endDatetime.toLocaleString(),
        amount: b.totalAmount,
        status: b.status,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as any;
  }
}
