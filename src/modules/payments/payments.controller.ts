import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post("create-intent/:reservationId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une intention de paiement (Stripe)" })
  @ApiResponse({ status: 201, description: "Intention de paiement créée." })
  /**
   * Initialise une session de paiement Stripe pour une réservation donnée.
   * Retourne le `clientSecret` requis par le frontend.
   *
   * @param reservationId - ID de la réservation cible.
   * @returns Un objet contenant le `clientSecret`.
   */
  async createPaymentIntent(
    @Param("reservationId", ParseIntPipe) reservationId: number,
  ) {
    return this.paymentsService.createPaymentIntent(reservationId);
  }

  @Post("simulate/:reservationId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Simuler un paiement (Dev/Test)" })
  @ApiResponse({ status: 201, description: "Paiement simulé avec succès." })
  /**
   * Simule un paiement complet pour les environnements de test.
   * Force le statut du paiement à 'completed'.
   *
   * @param reservationId - ID de la réservation à payer.
   * @returns Le résultat de la simulation.
   */
  async simulatePayment(
    @Param("reservationId", ParseIntPipe) reservationId: number,
  ) {
    return this.paymentsService.simulatePayment(reservationId);
  }

  @Post("webhook")
  @ApiOperation({ summary: "Webhook Stripe" })
  @ApiResponse({ status: 200, description: "Webhook traité." })
  /**
   * Point d'entrée pour les notifications Webhook de Stripe.
   * Ne nécessite pas d'authentification utilisateur (vérification via signature Stripe).
   *
   * @param signature - Signature cryptographique Stripe.
   * @param req - Requête brute pour validation de la signature.
   */
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) {
      throw new Error("Le corps brut (raw body) est requis pour la validation du webhook");
    }
    return this.paymentsService.handleWebhook(signature, req.rawBody);
  }

  @Get("reservation/:reservationId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir le paiement d'une réservation" })
  @ApiResponse({ status: 200, description: "Détails du paiement." })
  /**
   * Récupère les informations de paiement associées à une réservation.
   *
   * @param reservationId - ID de la réservation.
   * @returns L'objet paiement trouvé.
   */
  async getPaymentByReservation(
    @Param("reservationId", ParseIntPipe) reservationId: number,
  ) {
    return this.paymentsService.getPaymentByReservation(reservationId);
  }

  @Post("refund/:reservationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Rembourser un paiement (Admin)" })
  @ApiResponse({ status: 200, description: "Remboursement effectué." })
  @ApiResponse({ status: 400, description: "Remboursement impossible." })
  @ApiResponse({ status: 404, description: "Paiement non trouvé." })
  /**
   * Rembourse un paiement via Stripe.
   * Calcule automatiquement le pourcentage de remboursement :
   * - 100% si >= 24h avant le début
   * - 80% si < 24h avant le début
   *
   * @param reservationId - ID de la réservation à rembourser.
   * @param body - Corps optionnel contenant la raison du remboursement.
   * @returns Les détails du remboursement effectué.
   */
  async refundPayment(
    @Param("reservationId", ParseIntPipe) reservationId: number,
    @Body() body: { reason?: string },
  ) {
    return this.paymentsService.refundPayment(reservationId, body?.reason);
  }
}
