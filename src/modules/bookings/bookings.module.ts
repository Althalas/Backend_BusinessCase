import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { ReceiptsService } from "./receipts.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController],
  providers: [BookingsService, ReceiptsService],
  exports: [BookingsService],
})
export class BookingsModule {}
