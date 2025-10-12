import { Test, TestingModule } from "@nestjs/testing";
import { ReportsService } from "./reports.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportReason, ReportStatus } from "@prisma/client";

describe("ReportsService", () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a report for a station", async () => {
      const reporterId = 1;
      const reportData = {
        targetStationId: 1,
        reason: ReportReason.BROKEN_STATION,
        description: "Station is broken",
      };
      const mockReport = {
        id: 1,
        reporterId,
        ...reportData,
        status: "PENDING",
        createdAt: new Date(),
      };

      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.create(reporterId, reportData);

      expect(result).toEqual(mockReport);
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId,
          targetStationId: reportData.targetStationId,
          targetReviewId: undefined,
          reason: reportData.reason,
          description: reportData.description,
        },
      });
    });

    it("should create a report for a review", async () => {
      const reporterId = 1;
      const reportData = {
        targetReviewId: 5,
        reason: ReportReason.INAPPROPRIATE_CONTENT,
        description: "Inappropriate review content",
      };
      const mockReport = {
        id: 2,
        reporterId,
        ...reportData,
        status: "PENDING",
        createdAt: new Date(),
      };

      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.create(reporterId, reportData);

      expect(result).toEqual(mockReport);
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId,
          targetStationId: undefined,
          targetReviewId: reportData.targetReviewId,
          reason: reportData.reason,
          description: reportData.description,
        },
      });
    });

    it("should create a report without description", async () => {
      const reporterId = 1;
      const reportData = {
        targetStationId: 1,
        reason: ReportReason.OTHER,
      };
      const mockReport = {
        id: 3,
        reporterId,
        ...reportData,
        description: null,
        status: "PENDING",
      };

      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.create(reporterId, reportData);

      expect(result).toEqual(mockReport);
    });
  });

  describe("findAll", () => {
    it("should return all reports with related entities", async () => {
      const mockReports = [
        {
          id: 1,
          reporterId: 1,
          reason: ReportReason.BROKEN_STATION,
          status: ReportStatus.PENDING,
          reporter: {
            id: 1,
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
          targetStation: {
            id: 1,
            name: "Station A",
            location: { user: { email: "owner@example.com" } },
          },
          targetReview: null,
        },
        {
          id: 2,
          reporterId: 2,
          reason: ReportReason.INCORRECT_INFO,
          status: ReportStatus.RESOLVED,
          reporter: {
            id: 2,
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
          },
          targetStation: null,
          targetReview: { id: 5, user: { email: "reviewer@example.com" } },
        },
      ];

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);

      const result = await service.findAll();

      expect(result).toEqual(mockReports);
      expect(prisma.report.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array if no reports", async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("updateStatus", () => {
    it("should update report status to RESOLVED", async () => {
      const mockReport = { id: 1, status: ReportStatus.RESOLVED };

      mockPrismaService.report.update.mockResolvedValue(mockReport);

      const result = await service.updateStatus(1, ReportStatus.RESOLVED);

      expect(result).toEqual(mockReport);
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ReportStatus.RESOLVED },
      });
    });

    it("should update report status to DISMISSED", async () => {
      const mockReport = { id: 1, status: ReportStatus.DISMISSED };

      mockPrismaService.report.update.mockResolvedValue(mockReport);

      const result = await service.updateStatus(1, ReportStatus.DISMISSED);

      expect(result).toEqual(mockReport);
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ReportStatus.DISMISSED },
      });
    });
  });
});
