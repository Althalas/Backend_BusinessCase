import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";

import { AdminService } from "./admin.service";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
