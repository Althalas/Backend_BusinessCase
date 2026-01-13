import { Test, TestingModule } from "@nestjs/testing";
import { BookingsService } from "./bookings.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { ConflictException, BadRequestException } from "@nestjs/common";

describe("BookingsService", () => {
  let service: BookingsService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    $queryRaw: jest.fn(),
    chargingStation: {
      findUnique: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
  };
  mockPrismaService.$transaction = jest.fn((callback) =>
    callback(mockPrismaService),
  );

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "STRIPE_SECRET_KEY") return "sk_test_mock";
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create (Logique de Tarification)", () => {
    const userId = 1;
    // Create valid future date within business hours (06:00-22:00)
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 1); // Tomorrow
    futureStart.setHours(10, 0, 0, 0); // 10:00 AM (within 06-22 range)
    const futureEnd = new Date(futureStart);
    futureEnd.setHours(12, 0, 0, 0); // 12:00 PM (2 hour booking)

    const createDto = {
      stationId: 1,
      startTime: futureStart.toISOString(),
      endTime: futureEnd.toISOString(), // 2 hours
      vehicleId: 1,
    };

    // Mock station with location (userId = 99 to avoid "own station" check)
    const mockStationWithPricing = {
      id: 1,
      isActive: true,
      isAvailable: true,
      location: { userId: 99 }, // Different from test userId (1)
      pricing: [{ hourlyRate: 10.0 }], // 10€ per hour
    };

    it("doit calculer le prix correctement pour 2 heures", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(
        mockStationWithPricing,
      );
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Tesla",
        model: "Model 3",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]); // No conflicts
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 100,
        totalAmount: 20.0,
        createdAt: new Date(),
        startDatetime: futureStart,
        endDatetime: futureEnd,
        status: "PENDING",
        chargingStationId: 1,
        renterId: userId,
      });

      const result = await service.create(userId, createDto);

      expect(mockPrismaService.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 20.0, // 2h * 10€
          }),
        }),
      );
    });

    it("doit lever une ConflictException si la tarification est manquante", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        location: { userId: 99 },
        pricing: [], // No pricing!
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Tesla",
        model: "Model 3",
      });

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("doit lever une ConflictException si le taux horaire est 0", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        location: { userId: 99 },
        pricing: [{ hourlyRate: 0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Tesla",
        model: "Model 3",
      });

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("doit accepter une réservation avec connecteurs compatibles (TYPE2 → TYPE2)", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        connectorType: "TYPE2",
        location: { userId: 99 },
        pricing: [{ hourlyRate: 10.0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Renault",
        model: "Zoe",
        connectorType: "TYPE2",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 100,
        totalAmount: 20.0,
        createdAt: new Date(),
        startDatetime: futureStart,
        endDatetime: futureEnd,
        status: "PENDING",
        chargingStationId: 1,
        renterId: userId,
      });

      const result = await service.create(userId, createDto);

      expect(mockPrismaService.reservation.create).toHaveBeenCalled();
    });

    it("doit accepter une réservation TYPE2 vers borne TYPE2S (compatible)", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        connectorType: "TYPE2S",
        location: { userId: 99 },
        pricing: [{ hourlyRate: 10.0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Tesla",
        model: "Model 3",
        connectorType: "TYPE2",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 100,
        totalAmount: 20.0,
        createdAt: new Date(),
        startDatetime: futureStart,
        endDatetime: futureEnd,
        status: "PENDING",
        chargingStationId: 1,
        renterId: userId,
      });

      const result = await service.create(userId, createDto);

      expect(mockPrismaService.reservation.create).toHaveBeenCalled();
    });

    it("doit lever une BadRequestException pour connecteurs incompatibles (CHADEMO → TYPE2)", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        connectorType: "TYPE2",
        location: { userId: 99 },
        pricing: [{ hourlyRate: 10.0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Nissan",
        model: "Leaf",
        connectorType: "CHADEMO",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        /Connecteur incompatible/,
      );
    });

    it("doit lever une BadRequestException pour CCS vers borne CHADEMO", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        connectorType: "CHADEMO",
        location: { userId: 99 },
        pricing: [{ hourlyRate: 10.0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "VW",
        model: "ID.4",
        connectorType: "CCS",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("doit accepter tout véhicule sur une borne DOMESTIC (universel)", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        isAvailable: true,
        connectorType: "DOMESTIC",
        location: { userId: 99 },
        pricing: [{ hourlyRate: 2.0 }],
      });
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        id: 1,
        userId: userId,
        brand: "Nissan",
        model: "Leaf",
        connectorType: "CHADEMO",
      });
      mockPrismaService.reservation.findMany.mockResolvedValue([]);
      mockPrismaService.reservation.create.mockResolvedValue({
        id: 100,
        totalAmount: 4.0,
        createdAt: new Date(),
        startDatetime: futureStart,
        endDatetime: futureEnd,
        status: "PENDING",
        chargingStationId: 1,
        renterId: userId,
      });

      const result = await service.create(userId, createDto);

      expect(mockPrismaService.reservation.create).toHaveBeenCalled();
    });
  });
});
