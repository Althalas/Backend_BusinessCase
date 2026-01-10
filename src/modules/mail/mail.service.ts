import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { ContactMessageDto } from "../contact/dto/contact-message.dto";

/**
 * Service de gestion des emails.
 * Utilise Nodemailer pour l'envoi d'emails transactionnels (vérification, notifications).
 * Compatible avec SMTP en production et Ethereal en développement.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initTransport();
  }

  /**
   * Initialise le transporteur Nodemailer.
   * Configure SMTP si les variables d'environnement sont présentes, sinon utilise Ethereal pour le développement.
   */
  private async initTransport() {
    // Vérifier si les identifiants SMTP sont fournis
    const smtpHost = this.configService.get("SMTP_HOST");
    const smtpUser = this.configService.get("SMTP_USER");

    if (smtpHost && smtpUser) {
      // Utiliser les identifiants SMTP fournis
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.configService.get("SMTP_PORT", 587)),
        secure: this.configService.get("SMTP_SECURE") === "true", // true pour 465, false pour les ports autres
        auth: {
          user: smtpUser,
          pass: this.configService.get("SMTP_PASS"),
        },
      });
      this.logger.log(`Using SMTP server: ${smtpHost}`);
    } else {
      // Fallback sur Ethereal pour le développement (Mock)
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.warn("SMTP not configured. Using Ethereal Email (Mock).");
        this.logger.warn(
          `Ethereal Creds - User: ${testAccount.user}, Pass: ${testAccount.pass}`,
        );
      } catch (err) {
        this.logger.error("Failed to create Ethereal test account", err);
      }
    }
  }

  /**
   * Envoie un email de vérification lors de l'inscription.
   * Contient un code et un lien de validation.
   * @param email Adresse email du destinataire.
   * @param code Code de vérification généré.
   */
  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const verificationLink = `${this.configService.get(
      "FRONTEND_URL",
    )}/auth/verify?email=${encodeURIComponent(email)}&code=${code}`;

    const mailOptions = {
      from: '"Electricity Business" <noreply@electricity-business.com>',
      to: email,
      subject: "Vérifiez votre adresse email",
      text: `Bonjour,\n\nMerci de votre inscription. Voici votre code de validation : ${code}\n\nOu cliquez sur ce lien : ${verificationLink}\n\nCordialement,\nL'équipe Electricity Business`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4caf50;">Bienvenue chez Electricity Business !</h2>
          <p>Merci de votre inscription. Pour activer votre compte, veuillez utiliser le code ci-dessous :</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${code}</span>
          </div>
          <p>Ou cliquez directement sur le bouton suivant :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Vérifier mon email</a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 50px;">
            Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
          </p>
        </div>
      `,
    };

    try {
      if (!this.transporter) {
        await this.initTransport();
      }

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);

      // Si Ethereal, logger l'URL de prévisualisation
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`isPreview URL: ${previewUrl}`);
      }
    } catch (error) {
      this.logger.error("Error sending email", error);
      throw error;
    }
  }

  /**
   * Envoie un message de contact (formulaire public) au support.
   */
  async sendContactMessage(dto: ContactMessageDto): Promise<void> {
    const supportEmail =
      this.configService.get("SUPPORT_EMAIL") ||
      "support@electricity-business.com";

    const mailOptions = {
      from: `"${dto.name}" <${dto.email}>`, // Note: Certains SMTP interdisent le spoofing "from". Préférer "reply-to".
      // Bonne pratique :
      // from: '"Formulaire Contact" <noreply@domain.com>',
      // replyTo: dto.email,
      to: supportEmail,
      subject: `[Contact] ${dto.subject}`,
      text: `Nouveau message de ${dto.name} (${dto.email}):\n\n${dto.message}`,
      html: `
          <h3>Nouveau message de contact</h3>
          <p><strong>De:</strong> ${dto.name} (${dto.email})</p>
          <p><strong>Sujet:</strong> ${dto.subject}</p>
          <hr />
          <p>${dto.message.replace(/\n/g, "<br>")}</p>
        `,
    };

    if (!this.transporter) {
      await this.initTransport();
    }
    await this.transporter.sendMail(mailOptions);
    this.logger.log(`Contact email sent from ${dto.email}`);
  }
}
