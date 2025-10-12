import { Test, TestingModule } from "@nestjs/testing";
import { VehiclesService } from "./vehicles.service";
import { PrismaService } from "../prisma/prisma.service";

describe("VehiclesService", () => {
  let service: VehiclesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a vehicle for a user", async () => {
      const userId = 1;
      const createDto = {
        brand: "Tesla",
        model: "Model 3",
        licensePlate: "AB-123-CD",
        batteryCapacity: 75,
        connectorType: "TYPE2" as const,
      };
      const mockVehicle = {
        id: 1,
        userId,
        ...createDto,
        createdAt: new Date(),
      };

      mockPrismaService.vehicle.create.mockResolvedValue(mockVehicle);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockVehicle);
      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: { ...createDto, userId },
      });
    });
  });

  describe("findAll", () => {
    it("should return all vehicles for a user", async () => {
      const userId = 1;
      const mockVehicles = [
        { id: 1, userId, brand: "Tesla", model: "Model 3" },
        { id: 2, userId, brand: "Renault", model: "Zoe" },
      ];

      mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockVehicles);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array if user has no vehicles", async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);

      const result = await service.findAll(999);

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a vehicle by id", async () => {
      const mockVehicle = {
        id: 1,
        userId: 1,
        brand: "Tesla",
        model: "Model 3",
      };

      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);

      const result = await service.findOne(1);

      expect(result).toEqual(mockVehicle);
      expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return null if vehicle not found", async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update a vehicle", async () => {
      const updateDto = { brand: "Tesla", model: "Model Y" };
      const updatedVehicle = { id: 1, userId: 1, ...updateDto };

      mockPrismaService.vehicle.update.mockResolvedValue(updatedVehicle);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedVehicle);
      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });
  });

  describe("remove", () => {
    it("should delete a vehicle", async () => {
      const mockVehicle = { id: 1, userId: 1, brand: "Tesla" };

      mockPrismaService.vehicle.delete.mockResolvedValue(mockVehicle);

      const result = await service.remove(1);

      expect(result).toEqual(mockVehicle);
      expect(prisma.vehicle.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
