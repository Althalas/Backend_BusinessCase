import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../src/modules/mail/mail.service";

describe("StationsController (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;

  const mockUser = {
    id: 1,
    email: "owner@example.com",
    firstName: "Owner",
    lastName: "User",
    roles: ["owner"],
    isActive: true,
    isVerified: true,
  };

  const mockLocation = {
    id: 1,
    userId: 1,
    address: "123 Main St",
    city: "Paris",
    postalCode: "75001",
    latitude: 48.8566,
    longitude: 2.3522,
  };

  const mockStation = {
    id: 1,
    name: "Station Test",
    powerKw: 22,
    connectorType: "TYPE2",
    isActive: true,
    isAvailable: true,
    locationId: 1,
    location: mockLocation,
    pricing: [{ id: 1, hourlyRate: 10 }],
    averageRating: 4.5,
  };

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    enableShutdownHooks: jest.fn(),
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    chargingStation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    location: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    pricing: {
      create: jest.fn(),
    },
    favoriteStation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    vehicle: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    report: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
    },
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    authToken = jwtService.sign({
      sub: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /stations", () => {
    it("should return a list of stations", async () => {
      mockPrismaService.chargingStation.findMany.mockResolvedValue([
        mockStation,
      ]);
      mockPrismaService.chargingStation.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/stations")
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should filter stations by city", async () => {
      mockPrismaService.chargingStation.findMany.mockResolvedValue([
        mockStation,
      ]);
      mockPrismaService.chargingStation.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/stations?city=Paris")
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it("should filter stations by minimum power", async () => {
      mockPrismaService.chargingStation.findMany.mockResolvedValue([
        mockStation,
      ]);
      mockPrismaService.chargingStation.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get("/stations?minPower=20")
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /stations/:id", () => {
    it("should return a station by id", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(
        mockStation,
      );

      const response = await request(app.getHttpServer())
        .get("/stations/1")
        .expect(200);

      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "Station Test");
    });

    it("should return 404 for non-existent station", async () => {
      mockPrismaService.chargingStation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get("/stations/999").expect(404);
    });
  });

  describe("POST /stations (authenticated)", () => {
    const createStationDto = {
      name: "New Station",
      power: 22,
      connector: "TYPE2",
      address: "456 New Street",
      city: "Lyon",
      postalCode: "69001",
      latitude: 45.764,
      longitude: 4.8357,
      pricePerKwh: 15,
    };

    it("should create a station when authenticated", async () => {
      mockPrismaService.location.create.mockResolvedValue({
        id: 2,
        ...createStationDto,
      });
      mockPrismaService.chargingStation.create.mockResolvedValue({
        id: 2,
        ...createStationDto,
        locationId: 2,
        isActive: true,
        isAvailable: true,
      });
      mockPrismaService.pricing.create.mockResolvedValue({
        id: 2,
        hourlyRate: 15,
      });

      const response = await request(app.getHttpServer())
        .post("/stations")
        .set("Authorization", `Bearer ${authToken}`)
        .send(createStationDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });

    it("should reject creation without authentication", async () => {
      await request(app.getHttpServer())
        .post("/stations")
        .send(createStationDto)
        .expect(401);
    });
  });

  describe("GET /stations/favorites (authenticated)", () => {
    it("should return user favorite stations", async () => {
      mockPrismaService.favoriteStation.findMany.mockResolvedValue([
        { id: 1, userId: 1, stationId: 1, station: mockStation },
      ]);

      const response = await request(app.getHttpServer())
        .get("/stations/favorites/list")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .catch((err) => {
          console.error("DEBUG 400 ERROR:", err.response?.body);
          throw err;
        });

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should reject without authentication", async () => {
      await request(app.getHttpServer())
        .get("/stations/favorites/list")
        .expect(401);
    });
  });
});
