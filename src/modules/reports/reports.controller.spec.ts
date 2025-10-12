import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportReason, ReportStatus } from '@prisma/client';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  const mockReportsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(controller).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a report', async () => {
      const result = { id: 1, reason: ReportReason.OTHER };
      const dto = { reason: ReportReason.OTHER, description: 'test' };
      mockReportsService.create.mockResolvedValue(result);

      expect(await controller.createReport({ user: { id: 1 } }, dto as any)).toEqual(result);
      expect(mockReportsService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      const result: any[] = [];
      mockReportsService.findAll.mockResolvedValue(result);
      expect(await controller.findAll()).toEqual(result);
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      const result = { id: 1, status: ReportStatus.RESOLVED };
      mockReportsService.updateStatus.mockResolvedValue(result);
      expect(await controller.updateStatus(1, ReportStatus.RESOLVED)).toEqual(result);
      expect(mockReportsService.updateStatus).toHaveBeenCalledWith(1, ReportStatus.RESOLVED);
    });
  });
});
