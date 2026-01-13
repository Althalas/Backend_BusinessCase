import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentStatus } from "@prisma/client";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  /**
   * Initialise le service de paiement.
   * Configure le client Stripe avec la clé secrète.
   */
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get("STRIPE_SECRET_KEY") || "",
      {
        apiVersion: this.configService.get("STRIPE_API_VERSION") as Stripe.LatestApiVersion,
      },
    );
  }

  /**
   * Crée une intention de paiement (Payment Intent) Stripe pour une réservation.
   * Vérifie si un paiement existe déjà pour éviter les doublons.
   * Le montant est converti en centimes pour Stripe.
   *
   * @param reservationId - L'identifiant de la réservation à payer.
   * @returns Un objet contenant le `clientSecret` nécessaire au frontend pour finaliser le paiement.
   * @throws {NotFoundException} Si la réservation n'existe pas.
   * @throws {BadRequestException} Si un paiement existe déjà pour cette réservation.
   */
  async createPaymentIntent(reservationId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { renter: true },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si un paiement existe déjà
    const existingPayment = await this.prisma.payment.findUnique({
      where: { reservationId },
    });

    if (existingPayment) {
      if (existingPayment.paymentStatus === "completed") {
        throw new BadRequestException("Réservation déjà payée");
      }

      // Si le paiement est en attente ou échoué, on tente de récupérer ou recréer l'intent
      if (existingPayment.stripePaymentId) {
        try {
          const intent = await this.stripe.paymentIntents.retrieve(
            existingPayment.stripePaymentId,
          );
          if (intent.status !== "canceled") {
            return { clientSecret: intent.client_secret };
          }
        } catch (e) {
          this.logger.warn("Impossible de récupérer l'ancien intent Stripe", e);
        }
      }

      // Si on est ici, c'est que l'ancien intent est invalide/annulé ou inexistant.
      // On en crée un nouveau et on met à jour le paiement existant.
      try {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(Number(reservation.totalAmount) * 100),
          currency: "eur",
          metadata: {
            reservationId: reservationId.toString(),
            renterId: reservation.renterId.toString(),
          },
        });

        await this.prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            stripePaymentId: paymentIntent.id,
            paymentStatus: "pending",
          },
        });

        return { clientSecret: paymentIntent.client_secret };
      } catch (error) {
        this.logger.error("Erreur Réessai Stripe", error);
        throw new BadRequestException(
          "Impossible de recréer l'intention de paiement : " + error.message,
        );
      }
    }

    // Cas standard : Création initiale
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(Number(reservation.totalAmount) * 100), // En centimes
        currency: "eur",
        metadata: {
          reservationId: reservationId.toString(),
          renterId: reservation.renterId.toString(),
        },
      });

      await this.prisma.payment.create({
        data: {
          reservationId,
          amount: reservation.totalAmount,
          cardLastDigits: "0000", // Placeholder temporaire, sera mis à jour par le webhook
          stripePaymentId: paymentIntent.id,
          paymentStatus: "pending",
        },
      });

      return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      this.logger.error("Erreur Création Stripe", error);
      throw new BadRequestException(
        "Échec de la création de l'intention de paiement : " + error.message,
      );
    }
  }

  /**
   * Simule un paiement réussi pour une réservation (Environnement de Test/Dév).
   * Permet de valider le flux de paiement sans utiliser Stripe (ou de simuler un succès immédiat).
   *
   * @param reservationId - L'identifiant de la réservation.
   * @returns Le statut du succès et l'ID de transaction simulé.
   * @throws {NotFoundException} Si la réservation n'existe pas.
   * @throws {BadRequestException} Si la réservation est déjà payée.
   */
  async simulatePayment(reservationId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException("Réservation introuvable");
    }

    // Vérifier si un paiement existe déjà
    const existingPayment = await this.prisma.payment.findUnique({
      where: { reservationId },
    });

    if (existingPayment && existingPayment.paymentStatus === "completed") {
      throw new BadRequestException("Réservation déjà payée");
    }

    // Créer ou mettre à jour le paiement
    const transactionId =
      "SIM_" + Math.random().toString(36).substring(7).toUpperCase();

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paymentStatus: "completed",
          cardLastDigits: "4242",
          paymentDate: new Date(),
          stripePaymentId: transactionId,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          reservationId,
          amount: reservation.totalAmount,
          cardLastDigits: "4242",
          stripePaymentId: transactionId,
          paymentStatus: "completed",
          paymentDate: new Date(),
        },
      });
    }

    // Mettre à jour la réservation
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "accepted" },
    });

    return { success: true, transactionId };
  }

  /**
   * Traite les webhooks entrants de Stripe.
   * Gère les événements `payment_intent.succeeded` et `payment_intent.payment_failed`.
   * Met à jour le statut du paiement et de la réservation en conséquence.
   *
   * @param signature - La signature Stripe incluse dans les headers (pour validation).
   * @param payload - Le corps brut de la requête (Buffer).
   * @returns Un objet confirmant la réception `{ received: true }`.
   */
  async handleWebhook(signature: string, payload: Buffer) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.get("STRIPE_WEBHOOK_SECRET") || "",
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const reservationId = parseInt(paymentIntent.metadata.reservationId);

      // Extraire les 4 derniers chiffres de la carte
      const paymentMethod = paymentIntent.payment_method;
      let cardLastDigits = "0000";

      if (paymentMethod && typeof paymentMethod !== "string") {
        const card = (paymentMethod as any).card;
        if (card?.last4) {
          cardLastDigits = card.last4;
        }
      }

      // Trouver le payment par reservationId
      const payment = await this.prisma.payment.findUnique({
        where: { reservationId },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: "completed",
            cardLastDigits,
            paymentDate: new Date(),
          },
        });

        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "accepted" },
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const reservationId = parseInt(paymentIntent.metadata.reservationId);

      const payment = await this.prisma.payment.findUnique({
        where: { reservationId },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { paymentStatus: "failed" },
        });
      }
    }

    return { received: true };
  }

  /**
   * Récupère les détails d'un paiement associé à une réservation.
   * Inclut des informations sur la réservation, la station de charge et le locataire.
   *
   * @param reservationId - L'identifiant de la réservation.
   * @returns L'objet paiement avec les relations incluses.
   */
  async getPaymentByReservation(reservationId: number) {
    return this.prisma.payment.findUnique({
      where: { reservationId },
      include: {
        reservation: {
          include: {
            chargingStation: {
              select: { id: true, name: true, city: true },
            },
            renter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Rembourse un paiement via Stripe.
   * Calcule le pourcentage de remboursement selon la règle :
   * - 100% si annulation >= 24h avant le début
   * - 80% si annulation < 24h avant le début
   *
   * @param reservationId - L'ID de la réservation à rembourser
   * @param reason - Raison du remboursement (optionnel)
   * @returns Les détails du remboursement effectué
   * @throws {NotFoundException} Si le paiement n'existe pas
   * @throws {BadRequestException} Si le paiement n'est pas éligible au remboursement
   */
  async refundPayment(reservationId: number, reason?: string) {
    // 1. Récupérer le paiement avec la réservation
    const payment = await this.prisma.payment.findUnique({
      where: { reservationId },
      include: { reservation: true },
    });

    if (!payment) {
      throw new NotFoundException("Paiement introuvable pour cette réservation");
    }

    if (payment.paymentStatus !== "completed") {
      throw new BadRequestException(
        `Impossible de rembourser un paiement avec le statut '${payment.paymentStatus}'. Seuls les paiements 'completed' peuvent être remboursés.`,
      );
    }

    if (!payment.stripePaymentId) {
      throw new BadRequestException(
        "Aucun ID de paiement Stripe trouvé. Impossible de procéder au remboursement.",
      );
    }

    // 2. Calculer le pourcentage de remboursement
    const now = new Date();
    const startTime = new Date(payment.reservation.startDatetime);
    const hoursUntilStart =
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 100% si >= 24h avant, 80% si < 24h avant
    const refundPercentage = hoursUntilStart >= 24 ? 100 : 80;
    const refundAmount = Math.round(
      Number(payment.amount) * (refundPercentage / 100) * 100, // En centimes
    );

    // 3. Effectuer le remboursement via Stripe
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        amount: refundAmount,
        reason: "requested_by_customer",
        metadata: {
          reservationId: reservationId.toString(),
          refundPercentage: refundPercentage.toString(),
          originalReason: reason || "User cancelled",
        },
      });

      // 4. Mettre à jour le statut du paiement
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "refunded",
        },
      });

      // 5. Mettre à jour la réservation
      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "cancelled",
          cancellationReason: reason || `Remboursement ${refundPercentage}%`,
        },
      });

      return {
        success: true,
        refundId: refund.id,
        refundPercentage,
        refundAmount: refundAmount / 100, // En euros
        originalAmount: Number(payment.amount),
        message:
          refundPercentage === 100
            ? "Remboursement intégral effectué"
            : `Remboursement partiel (${refundPercentage}%) effectué - Annulation tardive`,
      };
    } catch (error) {
      this.logger.error("Erreur Remboursement Stripe", error);
      throw new BadRequestException(
        "Échec du remboursement : " + error.message,
      );
    }
  }
}
