import { Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";

const PDFDocument = require("pdfkit");
import { Readable } from "stream";

/**
 * Interface pour les données de réservation utilisées dans les reçus.
 */
interface ReservationReceiptData {
  id: number;
  totalAmount: number | string | Decimal;
  startDatetime: Date | string;
  endDatetime: Date | string;
  renter?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  chargingStation?: {
    name?: string;
    city?: string;
    powerKw?: number | Decimal;
  };
  payment?: {
    cardLastDigits?: string | null;
    paymentStatus?: string | null;
    paymentDate?: Date | string | null;
  } | null;
}

@Injectable()
export class ReceiptsService {
  /**
   * Génère un fichier PDF pour un reçu de réservation.
   * Construit le document avec l'en-tête, les détails de la réservation,
   * les infos clients et le résumé du paiement.
   * @param reservationData Les données complètes de la réservation (inclus relations).
   * @returns Un flux de lecture (Readable Stream) du fichier PDF généré.
   */
  generateReceipt(reservationData: ReservationReceiptData): Readable {
    // PDFKit creates a Readable stream
    let doc: InstanceType<typeof PDFDocument> | null = null;

    try {
      doc = new PDFDocument({ size: "A4", margin: 50 });

      // Header
      doc.fontSize(20).text("REÇU DE PAIEMENT", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(10)
        .text(`Numéro de réservation: #${reservationData?.id || "-"}`, {
          align: "right",
        });
      doc.text(`Date d'émission: ${new Date().toLocaleDateString("fr-FR")}`, {
        align: "right",
      });
      doc.moveDown(2);

      // Safe Data Extraction
      const renterName =
        `${reservationData?.renter?.firstName || ""} ${reservationData?.renter?.lastName || ""}`.trim() ||
        "Client";
      const renterEmail = reservationData?.renter?.email || "-";

      const stationName =
        reservationData?.chargingStation?.name || "Borne inconnue";
      const stationCity = reservationData?.chargingStation?.city || "-";
      const power = reservationData?.chargingStation?.powerKw || "0";

      const startDate = reservationData?.startDatetime
        ? new Date(reservationData.startDatetime).toLocaleString("fr-FR")
        : "-";
      const endDate = reservationData?.endDatetime
        ? new Date(reservationData.endDatetime).toLocaleString("fr-FR")
        : "-";

      const amount = reservationData?.totalAmount || "0";

      // Client Information
      doc.fontSize(14).text("Informations Client", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Nom: ${renterName}`);
      doc.text(`Email: ${renterEmail}`);
      doc.moveDown(2);

      // Reservation Details
      doc.fontSize(14).text("Détails de la Réservation", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Borne: ${stationName}`);
      doc.text(`Ville: ${stationCity}`);
      doc.text(`Puissance: ${power} kW`);
      doc.text(`Début: ${startDate}`);
      doc.text(`Fin: ${endDate}`);
      doc.moveDown(2);

      // Payment Information
      doc.fontSize(14).text("Informations de Paiement", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      const payment = reservationData?.payment;
      if (payment) {
        const cardDigits = payment?.cardLastDigits || "****";
        const status =
          payment?.paymentStatus === "completed"
            ? "Payé"
            : payment?.paymentStatus || "-";
        const paymentDate = payment?.paymentDate
          ? new Date(payment.paymentDate).toLocaleString("fr-FR")
          : "-";

        doc.text(`Carte: **** **** **** ${cardDigits}`);
        doc.text(`Statut: ${status}`);
        doc.text(`Date de paiement: ${paymentDate}`);
      } else {
        doc.text("Détails du paiement non disponibles");
      }
      doc.moveDown(2);

      // Total
      doc.fontSize(14);
      doc.text(`Montant Total: ${amount} €`, {
        align: "right",
      });
      doc.moveDown(3);

      // Footer
      doc
        .fontSize(8)
        .text("Electricity Business - Merci pour votre confiance!", {
          align: "center",
        });
      doc.text(
        "Pour toute question, contactez-nous à contact@electricitybusiness.com",
        { align: "center" },
      );

      doc.end();
      return doc;
    } catch (error) {
      console.error("Erreur lors de la génération du PDF de reçu :", error);

      if (doc) {
        try {
          doc.text("Une erreur est survenue lors de la génération.");
          doc.end();
          return doc as Readable;
        } catch {
          return Readable.from(["Erreur critique PDF"]);
        }
      }
      return Readable.from(["Impossible d'initialiser le générateur PDF."]);
    }
  }
}
