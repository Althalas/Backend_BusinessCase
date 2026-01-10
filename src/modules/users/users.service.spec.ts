import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("doit être défini", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("doit retourner les utilisateurs paginés", async () => {
      const mockUsers = [{ id: 1, email: "test@example.com" }];
      const total = 1;
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(total);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(mockUsers);
      expect(result.meta.total).toBe(total);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("doit retourner un utilisateur si trouvé", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
    });

    it("doit lever une NotFoundException si l'utilisateur est introuvable", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("doit mettre à jour un utilisateur avec succès", async () => {
      const mockUser = { id: 1, email: "old@example.com" };
      const updateDto = { firstName: "New" };
      const updatedUser = { ...mockUser, ...updateDto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedUser);
    });

    it("doit lever une ConflictException si l'email est pris", async () => {
      const mockUser = { id: 1, email: "old@example.com" };
      const updateDto = { email: "taken@example.com" };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // find user
        .mockResolvedValueOnce({ id: 2, email: "taken@example.com" }); // check email

      await expect(service.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("delete", () => {
    it("doit supprimer un utilisateur", async () => {
      const mockUser = { id: 1 };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.delete(1);

      expect(result).toEqual({ message: "User deleted successfully" });
    });

    it("doit lever une NotFoundException si l'utilisateur est introuvable", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
