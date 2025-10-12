import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { StationsModule } from "./modules/stations/stations.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { MailModule } from "./modules/mail/mail.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { ContactModule } from "./modules/contact/contact.module";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";
import { AppController } from "./app.controller";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Rate limiting
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get("NODE_ENV") === "test";
        return [
          {
            ttl: Number(config.get("THROTTLE_TTL", 60000)),
            limit: isTest ? 100000 : Number(config.get("THROTTLE_LIMIT", 1000)),
          },
        ];
      },
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    StationsModule,
    BookingsModule,
    PaymentsModule,
    MailModule,
    AdminModule,
    ReviewsModule,
    VehiclesModule,
    ReportsModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
