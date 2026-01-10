import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../mail/mail.service";
import { ConflictException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let mailService: MailService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => "test-token"),
  };

  const mockConfigService = {
    get: jest.fn(() => "secret"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const registerDto = {
      email: "test@test.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
      phone: "0102030405",
      birthDate: "1990-01-01",
      address: "1 Rue Test",
      postalCode: "75000",
      city: "Paris",
    };

    it("doit inscrire un utilisateur avec succès", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        email: registerDto.email,
        roles: ["client"],
      });
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto as any);

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty("message");
    });

    it("doit lever une ConflictException si l'email existe", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.register(registerDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it("doit faire un rollback (supprimer utilisateur) si l'envoi d'email échoue", async () => {
      // 1. User doesn't exist
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      // 2. User is created
      const createdUser = { id: 999, email: "rollback@test.com" };
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      // 3. Email fails
      mockMailService.sendVerificationEmail.mockRejectedValue(
        new Error("SMTP Error"),
      );

      // Expect throw BadRequestException
      await expect(service.register(registerDto as any)).rejects.toThrow(
        BadRequestException,
      );

      // Expect Rollback: delete has been called with correct ID
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: createdUser.id },
      });
    });
  });

  describe("login", () => {
    const loginDto = { email: "test@test.com", password: "password123" };

    it("doit retourner des tokens si la validation réussit", async () => {
      const user = {
        id: 1,
        email: "test@test.com",
        passwordHash: await bcrypt.hash("password123", 10),
        isValidated: true, // IMPORTANT
        isActive: true,
        roles: ["client"],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.login(loginDto);
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });
  });
});
