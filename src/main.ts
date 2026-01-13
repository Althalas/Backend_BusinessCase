import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

/**
 * Point d'entrée principal de l'application NestJS.
 * Initialise l'application, configure les middlewares globaux (Helmet, CORS, Validation),
 * la documentation Swagger, et démarre le serveur HTTP.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Middleware de sécurité
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline pour Swagger UI
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.tile.openstreetmap.org",      // Tuiles Leaflet/OSM
            "https://raw.githubusercontent.com",      // Icônes marqueurs Leaflet
            "https://cdnjs.cloudflare.com",           // Shadow marqueurs
            "https://unpkg.com",                      // Assets Leaflet
          ],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Servir les fichiers statiques
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use("/uploads", require("express").static("uploads"));

  // Configuration CORS
  const frontendUrl = configService.get("FRONTEND_URL");
  const allowedOrigins = [
    "http://localhost:4200",
    "http://localhost:3000",
    frontendUrl,
    /\.vercel\.app$/, // Autoriser tous les sous-domaines Vercel
  ].filter(Boolean); // Supprimer null/undefined

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Pipe de validation global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Intercepteur global pour la sérialisation des décimaux
  app.useGlobalInterceptors(new TransformInterceptor());

  // Préfixe API
  app.setGlobalPrefix("api");

  // Documentation Swagger (désactivée en production pour sécurité)
  const isProduction = process.env.NODE_ENV === "production";
  const enableSwagger = configService.get("ENABLE_SWAGGER") === "true";

  if (!isProduction || enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle("API Electricity Business")
      .setDescription(
        "API pour la plateforme de partage de bornes de recharge VE entre particuliers",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .addTag("auth", "Endpoints d'authentification")
      .addTag("users", "Gestion des utilisateurs")
      .addTag("stations", "Bornes de recharge")
      .addTag("bookings", "Réservations")
      .addTag("payments", "Traitement des paiements")
      .addTag("reviews", "Notes et avis")
      .addTag("vehicles", "Gestion des véhicules")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 3000;
  const logger = new Logger("Bootstrap");

  await app.listen(port);

  logger.log(`Application démarrée sur le port ${port}`);
  if (!isProduction || enableSwagger) {
    logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
  } else {
    logger.log("Swagger désactivé en production (ENABLE_SWAGGER=true pour activer)");
  }
}

bootstrap();
