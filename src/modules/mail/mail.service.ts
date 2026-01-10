import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import { ContactMessageDto } from "../contact/dto/contact-message.dto";

/**
 * Service de gestion des emails.
 * Supporte Resend (API) en priorité pour la production/cloud.
 * Fallback sur Nodemailer (SMTP) si configuré.
 * Fallback sur Ethereal (Mock) pour le développement local si rien n'est configuré.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private resendClient: Resend | null = null;
  private useResend = false;

  constructor(private configService: ConfigService) {
    this.initMailProvider();
  }

  /**
   * Initialise le fournisseur d'email (Resend ou Nodemailer).
   * Priorité : Resend API Key > SMTP > Ethereal.
   */
  private async initMailProvider() {
    const resendApiKey = this.configService.get("RESEND_API_KEY");

    // 1. Essayer Resend
    if (resendApiKey) {
      try {
        this.resendClient = new Resend(resendApiKey);
        this.useResend = true;
        this.logger.log("Using Resend API for email delivery 📧");
        return;
      } catch (error) {
        this.logger.error("Failed to initialize Resend client", error);
      }
    }

    // 2. Si pas Resend, configurer Nodemailer (SMTP ou Ethereal)
    this.useResend = false;
    await this.initNodemailer();
  }

  private async initNodemailer() {
    // Vérifier si les identifiants SMTP sont fournis
    const smtpHost = this.configService.get("SMTP_HOST");
    const smtpUser = this.configService.get("SMTP_USER");

    if (smtpHost) {
      // Utiliser les identifiants SMTP fournis
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.configService.get("SMTP_PORT", 587)),
        secure: this.configService.get("SMTP_SECURE") === "true", // true pour 465, false pour les autres
        auth: {
          user: smtpUser,
          pass: this.configService.get("SMTP_PASS"),
        },
      });
      this.logger.log(`Using SMTP server: ${smtpHost} 📤`);
    } else {
      // 3. Fallback sur Ethereal pour le développement (Mock)
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
        this.logger.warn(
          "No Email Provider configured. Using Ethereal Email (Mock/Dev).",
        );
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
   */
  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const verificationLink = `${this.configService.get(
      "FRONTEND_URL",
    )}/auth/verify?email=${encodeURIComponent(email)}&code=${code}`;

    const fromAddress = this.useResend
      ? this.configService.get("RESEND_FROM_EMAIL") ||
        "onboarding@resend.dev"
      : '"Electricity Business" <noreply@electricity-business.com>';

    const subject = "Vérifiez votre adresse email";
    const textContent = `Bonjour,\n\nMerci de votre inscription. Voici votre code de validation : ${code}\n\nOu cliquez sur ce lien : ${verificationLink}\n\nCordialement,\nL'équipe Electricity Business`;
    const htmlContent = `
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
      `;

    try {
      if (this.useResend && this.resendClient) {
        // Envoi via Resend API
        const response = await this.resendClient.emails.send({
          from: fromAddress,
          to: email,
          subject: subject,
          html: htmlContent,
          text: textContent,
        });

        if (response.error) {
          this.logger.error(`Resend Error: ${response.error.message}`);
          throw new Error(response.error.message);
        }

        this.logger.log(`Email sent via Resend: ${response.data?.id}`);
      } else {
        // Envoi via Nodemailer (SMTP ou Ethereal)
        if (!this.transporter) {
          await this.initNodemailer();
        }

        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        this.logger.log(`Email sent via Nodemailer: ${info.messageId}`);

        // Si Ethereal, logger l'URL de prévisualisation
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.log(`👀 Preview URL: ${previewUrl}`);
        }
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

    const subject = `[Contact] ${dto.subject}`;
    const textContent = `Nouveau message de ${dto.name} (${dto.email}):\n\n${dto.message}`;
    const htmlContent = `
          <h3>Nouveau message de contact</h3>
          <p><strong>De:</strong> ${dto.name} (${dto.email})</p>
          <p><strong>Sujet:</strong> ${dto.subject}</p>
          <hr />
          <p>${dto.message.replace(/\n/g, "<br>")}</p>
        `;

    // Note pour Resend : on doit vérifier un domaine expéditeur.
    // L'envoi "De la part de" l'utilisateur n'est souvent pas possible sans signature DKIM.
    // On envoie donc DEPUIS notre système, avec REPLY-TO l'utilisateur.
    const fromAddress = this.useResend
      ? this.configService.get("RESEND_FROM_EMAIL") ||
        "contact@resend.dev"
      : `"${dto.name}" <${dto.email}>`; // SMTP permet parfois le spoofing, sinon utiliser system address

    try {
      if (this.useResend && this.resendClient) {
        const response = await this.resendClient.emails.send({
          from: fromAddress,
          to: supportEmail,
          replyTo: dto.email,
          subject: subject,
          html: htmlContent,
          text: textContent,
        });

        if (response.error) {
          this.logger.error(`Resend Contact Error: ${response.error.message}`);
          throw new Error(response.error.message);
        }

        this.logger.log(`Contact email sent via Resend from ${dto.email}, ID: ${response.data?.id}`);
      } else {
        if (!this.transporter) {
          await this.initNodemailer();
        }
        await this.transporter.sendMail({
          from: fromAddress, // Attention au spoofing, peut être écrasé par SMTP server
          replyTo: dto.email,
          to: supportEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });
        this.logger.log(`Contact email sent via SMTP from ${dto.email}`);
      }
    } catch (error) {
      this.logger.error("Error sending contact email", error);
      // On ne throw pas forcément ici pour ne pas bloquer l'utilisateur si le support est down,
      // mais bon de le savoir.
      throw error;
    }
  }
}
