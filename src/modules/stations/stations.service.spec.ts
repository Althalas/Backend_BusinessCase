import { Test, TestingModule } from "@nestjs/testing";
import { StationsService } from "./stations.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { UserRole, ConnectorType } from "@prisma/client";

describe("StationsService", () => {
  let service: StationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    chargingStation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    location: {
      create: jest.fn(),
    },
    pricing: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StationsService>(StationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("doit retourner les stations paginées", async () => {
      const mockStations = [
        {
          id: 1,
          name: "Station 1",
          powerKw: 22,
          latitude: 48.85,
          longitude: 2.35,
          location: { latitude: 48.85, longitude: 2.35 },
          pricing: [{ hourlyRate: 0.5 }],
        },
      ];

      mockPrismaService.chargingStation.findMany.mockResolvedValue(
        mockStations,
      );
      mockPrismaService.chargingStation.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.chargingStation.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("doit retourner une station par id", async () => {
      const mockStation = { id: 1, name: "Station 1" };
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(
        mockStation,
      );

      const result = await service.findOne(1);

      expect(result).toEqual(mockStation);
    });

    it("doit lever une NotFoundException si la station n'est pas trouvée", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("doit créer une nouvelle station", async () => {
      const userId = 1;
      const createDto = {
        name: "New Station",
        address: "123 Test St",
        postalCode: "75001",
        city: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        description: "Test description",
        power: 22,
        connector: ConnectorType.TYPE2,
        pricePerKwh: 0.35,
        isOnStand: false,
      };

      const mockLocation = { id: 100, ...createDto };
      const mockStation = { id: 1, locationId: 100, ...createDto };
      const mockUser = { id: userId, roles: [] };

      mockPrismaService.location.create.mockResolvedValue(mockLocation);
      mockPrismaService.chargingStation.create.mockResolvedValue(mockStation);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        roles: [UserRole.owner],
      });

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockStation);
      expect(mockPrismaService.location.create).toHaveBeenCalled();
      expect(mockPrismaService.chargingStation.create).toHaveBeenCalledWith({
        data: {
          locationId: 100,
          name: createDto.name,
          powerKw: createDto.power,
          connectorType: createDto.connector,
          instructions: createDto.description,
          isOnStand: createDto.isOnStand,
          latitude: createDto.latitude,
          longitude: createDto.longitude,
          city: createDto.city,
          isActive: true,
          photos: [],
        },
        include: {
          location: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
      expect(mockPrismaService.pricing.create).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("doit mettre à jour une station", async () => {
      const stationId = 1;
      const userId = 1;
      const updateDto = { name: "Updated Station", pricePerKwh: 0.4 };

      const mockStation = {
        id: stationId,
        name: "Station 1",
        location: { userId: userId },
      };

      mockPrismaService.chargingStation.findUnique.mockResolvedValue(
        mockStation,
      );
      mockPrismaService.chargingStation.update.mockResolvedValue({
        ...mockStation,
        name: updateDto.name,
      });
      mockPrismaService.pricing.findFirst.mockResolvedValue({ id: 50 });

      const result = await service.update(stationId, userId, [], updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(mockPrismaService.chargingStation.update).toHaveBeenCalled();
      expect(mockPrismaService.pricing.update).toHaveBeenCalled(); // Closes old pricing
      expect(mockPrismaService.pricing.create).toHaveBeenCalled(); // Creates new pricing
    });

    it("doit lever une ForbiddenException si l'utilisateur n'est pas propriétaire", async () => {
      const stationId = 1;
      const userId = 2; // Different user
      const mockStation = {
        id: stationId,
        name: "Station 1",
        location: { userId: 1 }, // Owner is 1
      };

      mockPrismaService.chargingStation.findUnique.mockResolvedValue(
        mockStation,
      );

      await expect(
        service.update(stationId, userId, [], { name: "Test" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("search", () => {
    it("doit rechercher des stations par localisation via requête brute", async () => {
      const mockStations = [
        {
          id: 1,
          name: "Station 1",
          distance: 1.5,
          powerKw: 22,
          latitude: 48.85,
          longitude: 2.35,
          is_active: true,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockStations);

      const result = await service.search({
        lat: 48.8566,
        lng: 2.3522,
        radius: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it("doit rechercher des stations par filtres via findMany", async () => {
      const mockStations = [
        {
          id: 1,
          name: "Station 1",
          powerKw: 22,
          latitude: 48.85,
          longitude: 2.35,
          location: { latitude: 48.85, longitude: 2.35 },
          pricing: [{ hourlyRate: 0.5 }],
        },
      ];

      mockPrismaService.chargingStation.findMany.mockResolvedValue(
        mockStations,
      );

      const result = await service.search({
        minPower: 11,
        maxPrice: 1.0,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.chargingStation.findMany).toHaveBeenCalled();
    });
  });
});
