import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsService } from "./reviews.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

describe("ReviewsService", () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reservation: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const createDto = {
      stationId: 1,
      rating: 5,
      comment: "Excellent station!",
    };

    it("should create a review if user has completed booking", async () => {
      const user = {
        id: 1,
        email: "test@example.com",
        roles: ["client"] as any,
      };
      const mockReservation = { id: 1, status: "completed" };
      const mockReview = {
        id: 1,
        userId: 1,
        ...createDto,
        user: { id: 1, firstName: "John", lastName: "Doe" },
      };

      mockPrismaService.reservation.findFirst.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      const result = await service.create(user, createDto);

      expect(result).toEqual(mockReview);
      expect(prisma.reservation.findFirst).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user has no completed booking", async () => {
      const user = {
        id: 1,
        email: "test@example.com",
        roles: ["client"] as any,
      };

      mockPrismaService.reservation.findFirst.mockResolvedValue(null);

      await expect(service.create(user, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw ConflictException if user already reviewed", async () => {
      const user = {
        id: 1,
        email: "test@example.com",
        roles: ["client"] as any,
      };
      const mockReservation = { id: 1, status: "completed" };
      const existingReview = { id: 1, userId: 1 };

      mockPrismaService.reservation.findFirst.mockResolvedValue(
        mockReservation,
      );
      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);

      await expect(service.create(user, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should allow admin to review without completed booking", async () => {
      const adminUser = {
        id: 1,
        email: "admin@example.com",
        roles: ["admin"] as any,
      };
      const mockReview = {
        id: 1,
        userId: 1,
        ...createDto,
        user: { id: 1, firstName: "Admin", lastName: "User" },
      };

      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      const result = await service.create(adminUser, createDto);

      expect(result).toEqual(mockReview);
      expect(prisma.reservation.findFirst).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if rating is missing for non-admin", async () => {
      const user = {
        id: 1,
        email: "test@example.com",
        roles: ["client"] as any,
      };
      const dtoWithoutRating = { stationId: 1, comment: "Test" };
      const mockReservation = { id: 1, status: "completed" };

      mockPrismaService.reservation.findFirst.mockResolvedValue(
        mockReservation,
      );

      await expect(
        service.create(user, dtoWithoutRating as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("findByStation", () => {
    it("should return all reviews for a station", async () => {
      const mockReviews = [
        {
          id: 1,
          stationId: 1,
          rating: 5,
          user: { id: 1, firstName: "John", lastName: "Doe" },
        },
        {
          id: 2,
          stationId: 1,
          rating: 4,
          user: { id: 2, firstName: "Jane", lastName: "Doe" },
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByStation(1);

      expect(result).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { stationId: 1 },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("update", () => {
    it("should update a review if user is the author", async () => {
      const existingReview = { id: 1, userId: 1, rating: 4 };
      const updateDto = { rating: 5, comment: "Updated!" };
      const updatedReview = { ...existingReview, ...updateDto };

      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      const result = await service.update(1, 1, updateDto);

      expect(result).toEqual(updatedReview);
    });

    it("should throw NotFoundException if review not found", async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.update(999, 1, { rating: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if user is not the author", async () => {
      const existingReview = { id: 1, userId: 2 };

      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);

      await expect(service.update(1, 1, { rating: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("delete", () => {
    it("should delete a review if user is the author", async () => {
      const existingReview = { id: 1, userId: 1 };

      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);
      mockPrismaService.review.delete.mockResolvedValue(existingReview);

      const result = await service.delete(1, 1, ["client"]);

      expect(result).toEqual({ message: "Review deleted" });
    });

    it("should allow admin to delete any review", async () => {
      const existingReview = { id: 1, userId: 2 };

      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);
      mockPrismaService.review.delete.mockResolvedValue(existingReview);

      const result = await service.delete(1, 1, ["admin"]);

      expect(result).toEqual({ message: "Review deleted" });
    });

    it("should throw NotFoundException if review not found", async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.delete(999, 1, ["client"])).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if user is not author and not admin", async () => {
      const existingReview = { id: 1, userId: 2 };

      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);

      await expect(service.delete(1, 1, ["client"])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("findGivenReviews", () => {
    it("should return all reviews given by a user", async () => {
      const mockReviews = [
        {
          id: 1,
          userId: 1,
          stationId: 1,
          station: { id: 1, name: "Station A", city: "Paris" },
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findGivenReviews(1);

      expect(result).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findByOwner", () => {
    it("should return all reviews for stations owned by a user", async () => {
      const mockReviews = [
        {
          id: 1,
          stationId: 1,
          user: { id: 2, firstName: "John", lastName: "Doe", avatarUrl: null },
          station: { id: 1, name: "Station A" },
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByOwner(1);

      expect(result).toEqual(mockReviews);
    });
  });
});
