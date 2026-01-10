import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Res,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Response } from "express";
import { ReservationStatus, UserRole } from "@prisma/client";
import { BookingsService } from "./bookings.service";
import { ReceiptsService } from "./receipts.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces";

/**
 * Contrôleur des réservations.
 * Gère le cycle de vie des réservations (création, paiement, annulation, validation).
 */
@Controller("bookings")
@UseGuards(JwtAuthGuard)
@ApiTags("bookings")
@ApiBearerAuth()
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly receiptsService: ReceiptsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Créer une nouvelle réservation" })
  @ApiResponse({ status: 201, description: "Réservation créée avec succès." })
  @ApiResponse({ status: 400, description: "Données invalides." })
  @ApiResponse({
    status: 409,
    description: "Conflit de créneau ou station inactive.",
  })
  /**
   * Crée une réservation pour une station donnée sur un créneau horaire.
   * Vérifie la disponibilité de la station (lock pessimiste) et calcule le coût.
   * @param createBookingDto Données de réservation (station, horaire, véhicule).
   * @param userId ID du locataire.
   * @returns La réservation créée en statut 'pending'.
   */
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser("id") userId: number,
  ) {
    return this.bookingsService.create(userId, createBookingDto);
  }

  @Post(":id/pay")
  @ApiOperation({ summary: "Simuler le paiement" })
  @ApiResponse({
    status: 200,
    description: "Paiement réussi, réservation confirmée.",
  })
  /**
   * Simule le processus de paiement pour valider une réservation.
   * En production, cela serait un callback Webhook de Stripe.
   * Passe la réservation de 'pending' à 'accepted'.
   * @param id ID de la réservation.
   * @param userId ID de l'utilisateur.
   * @returns La réservation mise à jour.
   */
  async pay(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
  ) {
    return this.bookingsService.processPayment(id, userId);
  }

  @Get("my")
  @ApiOperation({ summary: "Récupérer mes réservations" })
  @ApiResponse({
    status: 200,
    description: "Liste des réservations de l'utilisateur.",
  })
  /**
   * Récupère la liste des réservations effectuées par l'utilisateur connecté.
   * Possibilité de filtrer par statut.
   * @param userId ID du locataire.
   * @param status (Optionnel) Statut de réservation (pending, accepted, etc.).
   * @returns Liste des réservations.
   */
  async findMyBookings(
    @CurrentUser("id") userId: number,
    @Query("status") status?: ReservationStatus,
    @Query("timeFilter") timeFilter?: "upcoming" | "history",
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    // Conversion manuelle des paramètres (puisque @Query ne transforme pas automatiquement sans pipes globaux)
    // Parsing manuel sécurisé
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return this.bookingsService.findByDriver(
      userId,
      status,
      timeFilter,
      pageNum,
      limitNum,
    );
  }

  @Get("station/:stationId/busy")
  @ApiOperation({ summary: "Voir les créneaux occupés" })
  @ApiResponse({
    status: 200,
    description: "Liste des créneaux indisponibles.",
  })
  /**
   * Récupère les créneaux horaires déjà réservés pour une station à une date donnée.
   * Utile pour afficher le calendrier des disponibilités côté frontend.
   * @param stationId ID de la station.
   * @param date Date au format ISO (YYYY-MM-DD).
   * @returns Liste des créneaux indisponibles.
   */
  async getBusySlots(
    @Param("stationId", ParseIntPipe) stationId: number,
    @Query("date") date: string,
  ) {
    return this.bookingsService.getBusySlots(stationId, date);
  }

  @Get("station/:stationId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.owner, UserRole.admin)
  @ApiOperation({ summary: "Voir les réservations d'une station (Owner)" })
  @ApiResponse({ status: 200, description: "Liste des réservations reçues." })
  @ApiResponse({ status: 403, description: "Non autorisé." })
  /**
   * Récupère toutes les réservations associées à une station (pour le propriétaire).
   * Permet au propriétaire de gérer son planning.
   * @param stationId ID de la station.
   * @param user Utilisateur connecté (Owner ou Admin).
   * @returns Liste des réservations pour cette station.
   */
  async findByStation(
    @Param("stationId", ParseIntPipe) stationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findByStation(stationId, user.id, user.roles);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détails d'une réservation" })
  @ApiResponse({ status: 200, description: "Détails de la réservation." })
  @ApiResponse({ status: 404, description: "Réservation introuvable." })
  /**
   * Récupère les informations détaillées d'une réservation spécifique.
   * Accessible au Locataire, Propriétaire ou Admin.
   * @param id ID de la réservation.
   * @returns Détails complets (inclus user, station, paiement).
   */
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Mettre à jour le statut (Owner)" })
  @ApiResponse({ status: 200, description: "Statut mis à jour." })
  @ApiResponse({ status: 403, description: "Non autorisé." })
  /**
   * Permet au propriétaire d'accepter ou refuser une réservation.
   * Peut inclure une raison en cas de refus.
   * @param id ID de la réservation.
   * @param body Objet contenant le nouveau statut et la raison éventuelle.
   * @param user Utilisateur connecté (Propriétaire ou Admin).
   */
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: ReservationStatus; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.updateStatus(
      id,
      body.status,
      user.id,
      user.roles,
      body.reason,
    );
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Annuler une réservation" })
  @ApiResponse({ status: 200, description: "Réservation annulée." })
  @ApiResponse({ status: 400, description: "Impossible d'annuler." })
  /**
   * Permet au locataire d'annuler sa propre réservation (si les conditions le permettent).
   * Généralement possible tant que la réservation n'a pas commencé ou n'est pas terminée.
   * @param id ID de la réservation.
   * @param userId ID du locataire.
   * @returns La réservation annulée.
   */
  async cancel(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
  ) {
    return this.bookingsService.cancel(id, userId);
  }

  @Get(":id/receipt")
  @ApiOperation({ summary: "Télécharger le reçu (PDF)" })
  @ApiResponse({ status: 200, description: "Fichier PDF du reçu." })
  @ApiResponse({
    status: 404,
    description: "Réservation ou paiement introuvable.",
  })
  /**
   * Génère et télécharge le reçu de paiement au format PDF.
   * Vérifie que le paiement a bien été effectué.
   * @param id ID de la réservation.
   * @param user Utilisateur connecté.
   * @param res Objet Response Express pour le stream.
   */
  async downloadReceipt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    // Récupérer les données complètes de réservation depuis Prisma
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        renter: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        chargingStation: {
          select: { id: true, name: true, city: true, powerKw: true },
        },
        payment: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si l'utilisateur est le propriétaire de la réservation ou admin
    const isAdmin = user.roles?.includes(UserRole.admin);
    if (reservation.renterId !== user.id && !isAdmin) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si le paiement est complété
    if (
      !reservation.payment ||
      reservation.payment.paymentStatus !== "completed"
    ) {
      throw new NotFoundException("Paiement non complété pour cette réservation");
    }

    const pdfStream = this.receiptsService.generateReceipt(reservation);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${id}.pdf`,
    );

    pdfStream.pipe(res);
  }

  @Get("export/excel")
  @ApiOperation({ summary: "Exporter les réservations (Excel)" })
  @ApiResponse({ status: 200, description: "Fichier Excel des réservations." })
  /**
   * Exporte l'historique des réservations au format Excel (.xlsx).
   * @param user Utilisateur connecté.
   * @param res Objet Response Express.
   */
  async exportExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const buffer = await this.bookingsService.exportBookings(user.id);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bookings-${user.id}.xlsx`,
    );

    res.send(buffer);
  }
}
