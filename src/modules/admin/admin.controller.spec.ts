import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { NotFoundException } from "@nestjs/common";

describe("AdminController", () => {
  let controller: AdminController;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
    },
    chargingStation: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUsersService = {
    anonymizeUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("doit être défini", () => {
    expect(controller).toBeDefined();
  });

  describe("getStats", () => {
    it("doit retourner les statistiques du tableau de bord", async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(5); // totalValidated
      mockPrismaService.chargingStation.count.mockResolvedValue(5);
      mockPrismaService.reservation.count
        .mockResolvedValueOnce(20) // totalReservations
        .mockResolvedValueOnce(2); // pendingReservations

      const result = await controller.getStats();

      expect(result).toEqual({
        totalUsers: 10,
        totalStations: 5,
        totalReservations: 20,
        pendingReservations: 2,
        pendingValidations: 5,
      });
    });
  });

  describe("deleteStation", () => {
    it("doit supprimer (soft delete) une station", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.chargingStation.update.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      const result = await controller.deleteStation(1, { reason: "Test" });

      expect(result.message).toBe("Station deleted successfully");
      expect(prisma.chargingStation.update).toHaveBeenCalled();
    });

    it("doit lever une NotFoundException si la station n'est pas trouvée", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(null);

      await expect(
        controller.deleteStation(999, { reason: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
