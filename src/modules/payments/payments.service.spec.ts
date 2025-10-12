import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, BadRequestException } from "@nestjs/common";

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock("stripe", () => {
  return {
    default: jest.fn().mockImplementation(() => mockStripe),
    __esModule: true,
  };
});

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    reservation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "STRIPE_SECRET_KEY") return "sk_test_mock";
      if (key === "STRIPE_WEBHOOK_SECRET") return "whsec_mock";
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("doit être défini", () => {
    expect(service).toBeDefined();
  });

  describe("createPaymentIntent", () => {
    it("doit créer une intention de paiement avec succès", async () => {
      const mockReservation = {
        id: 1,
        renterId: 1,
        totalAmount: 50,
        chargingStationId: 1,
        startDatetime: new Date(),
        endDatetime: new Date(),
        createdAt: new Date(),
        status: "pending",
        renter: { id: 1 },
      };
      mockPrismaService.reservation.findUnique.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.payment.findUnique.mockResolvedValue(null); // No existing payment
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        client_secret: "secret_123",
      });
      mockPrismaService.payment.create.mockResolvedValue({ id: 1 });

      const result = await service.createPaymentIntent(1);

      expect(result).toEqual({ clientSecret: "secret_123" });
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: "eur",
        metadata: { reservationId: "1", renterId: "1" },
      });
    });

    it("doit lever une NotFoundException si la réservation n'est pas trouvée", async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentIntent(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("doit lever une BadRequestException si le paiement existe déjà", async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.payment.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.createPaymentIntent(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
