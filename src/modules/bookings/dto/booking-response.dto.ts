import { ApiProperty } from "@nestjs/swagger";
import {
  ReservationStatus,
  Reservation,
  ChargingStation,
  Payment,
  User,
  Location,
  Pricing,
} from "@prisma/client";

/**
 * Type helper pour les réservations incluant les relations optionnelles.
 * Accepte les types Prisma avec relations imbriquées de toute profondeur.
 */
export type ReservationWithRelations = Reservation & {
  chargingStation?: (ChargingStation & {
    location?: Location & { user?: Partial<User> };
    pricing?: Pricing[];
  }) | null;
  payment?: Payment | null;
  renter?: Partial<User> | null;
  vehicle?: { id: number; brand?: string; model?: string } | null;
};

/**
 * DTO de réponse standardisé pour les réservations.
 * Utilise des méthodes statiques de mappage `fromReservation` pour transformer l'entité Prisma.
 */
export class BookingResponseDto {
  /** ID unique de la réservation. */
  @ApiProperty()
  id: number;

  /** ID de la station. */
  @ApiProperty()
  stationId: number;

  /** ID de l'utilisateur (locataire). */
  @ApiProperty()
  userId: number;

  /** Date de début (ISO). */
  @ApiProperty()
  startTime: string;

  /** Date de fin (ISO). */
  @ApiProperty()
  endTime: string;

  /** Prix total calculé. */
  @ApiProperty()
  totalPrice: number;

  /** Statut actuel (pending, accepted, refused, cancelled). */
  @ApiProperty({ enum: ReservationStatus })
  status: ReservationStatus;

  /** Objet Station complet (si inclus). */
  @ApiProperty({ required: false })
  station?: Partial<ChargingStation>;

  /** Objet Paiement (si existant). */
  @ApiProperty({ required: false })
  payment?: Partial<Payment>;

  /** Date de création de la réservation. */
  @ApiProperty()
  createdAt: string;

  /**
   * Convertit une entité Reservation Prisma en DTO.
   * @param reservation L'objet Reservation brut de Prisma.
   */
  static fromReservation(
    reservation: ReservationWithRelations,
  ): BookingResponseDto {
    return {
      id: reservation.id,
      stationId: reservation.chargingStationId,
      userId: reservation.renterId,
      startTime: reservation.startDatetime.toISOString(),
      endTime: reservation.endDatetime.toISOString(),
      totalPrice: Number(reservation.totalAmount || 0),
      status: reservation.status,
      station: reservation.chargingStation ?? undefined,
      payment: reservation.payment ?? undefined,
      createdAt: reservation.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Convertit une liste de réservations.
   * @param reservations Tableau de réservations Prisma.
   */
  static fromReservations(
    reservations: ReservationWithRelations[],
  ): BookingResponseDto[] {
    return reservations.map((r) => this.fromReservation(r));
  }
}
