import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware de journalisation des requêtes HTTP.
 * Intercepte toutes les requêtes entrantes pour logger :
 * - La méthode HTTP et l'URL
 * - Le code de statut de la réponse
 * - La durée de traitement
 * - Le contenu du corps de la requête (pour les requêtes non-GET), avec désinfection des données sensibles (mots de passe).
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  /**
   * Méthode exécutée pour chaque requête.
   *
   * @param req - L'objet de requête Express.
   * @param res - L'objet de réponse Express.
   * @param next - La fonction pour passer au middleware suivant.
   */
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const userAgent = req.get("user-agent") || "";
    const start = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const contentLength = res.get("content-length") || "-";
      const duration = Date.now() - start;

      // Sanitize body for logging
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = "***";
      if (sanitizedBody.newPassword) sanitizedBody.newPassword = "***";
      if (sanitizedBody.oldPassword) sanitizedBody.oldPassword = "***";

      // Log body only for non-GET requests and if not empty
      const bodyLog =
        method !== "GET" && Object.keys(sanitizedBody).length > 0
          ? ` Body: ${JSON.stringify(sanitizedBody)}`
          : "";

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} +${duration}ms${bodyLog}`,
      );
    });

    next();
  }
}
