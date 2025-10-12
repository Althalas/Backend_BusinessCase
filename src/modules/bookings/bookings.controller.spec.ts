import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';

describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: BookingsService;
  let receiptsService: ReceiptsService;
  let prismaService: PrismaService;

  const mockBookingsService = {
    create: jest.fn(),
    processPayment: jest.fn(),
    findByDriver: jest.fn(),
    getBusySlots: jest.fn(),
    findByStation: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    cancel: jest.fn(),
    exportBookings: jest.fn(),
  };

  const mockReceiptsService = {
    generateReceipt: jest.fn(),
  };

  const mockPrismaService = {
    reservation: {
      findUnique: jest.fn(),
    },
  };

  const mockResponse = {
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: ReceiptsService, useValue: mockReceiptsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    bookingsService = module.get<BookingsService>(BookingsService);
    receiptsService = module.get<ReceiptsService>(ReceiptsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking', async () => {
      const dto = { stationId: 1, startTime: '2023-01-01T10:00:00Z', endTime: '2023-01-01T12:00:00Z' } as any;
      const result = { id: 1, ...dto };
      mockBookingsService.create.mockResolvedValue(result);

      expect(await controller.create(dto, 1)).toEqual(result);
      expect(mockBookingsService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('pay', () => {
    it('should process payment', async () => {
      mockBookingsService.processPayment.mockResolvedValue({ status: 'accepted' });
      expect(await controller.pay(1, 1)).toEqual({ status: 'accepted' });
    });
  });

  describe('findMyBookings', () => {
    it('should return user bookings', async () => {
      mockBookingsService.findByDriver.mockResolvedValue([]);
      expect(await controller.findMyBookings(1)).toEqual([]);
    });
  });

  describe('getBusySlots', () => {
    it('should return busy slots', async () => {
      mockBookingsService.getBusySlots.mockResolvedValue([]);
      expect(await controller.getBusySlots(1, '2023-01-01')).toEqual([]);
    });
  });

  describe('findByStation', () => {
    it('should return station bookings for owner', async () => {
      mockBookingsService.findByStation.mockResolvedValue([]);
      expect(await controller.findByStation(1, { id: 1, roles: [] } as any)).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a booking', async () => {
      const result = { id: 1 };
      mockBookingsService.findOne.mockResolvedValue(result);
      expect(await controller.findOne(1)).toEqual(result);
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      mockBookingsService.updateStatus.mockResolvedValue({ status: 'refused' });
      expect(await controller.updateStatus(1, { status: 'refused' }, { id: 1 } as any)).toEqual({ status: 'refused' });
    });
  });

  describe('cancel', () => {
    it('should cancel booking', async () => {
      mockBookingsService.cancel.mockResolvedValue({ status: 'cancelled' });
      expect(await controller.cancel(1, 1)).toEqual({ status: 'cancelled' });
    });
  });

  describe('exportExcel', () => {
    it('should export excel', async () => {
      const buffer = Buffer.from('data');
      mockBookingsService.exportBookings.mockResolvedValue(buffer);
      await controller.exportExcel({ id: 1 } as any, mockResponse);
      expect(mockResponse.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe('downloadReceipt', () => {
    it('should download receipt if payment completed', async () => {
        const mockStream = new Readable();
        mockStream.push('PDF Content'); // Add some data
        mockStream.push(null); // End the stream
        // Mock the pipe method on the stream instance
        mockStream.pipe = jest.fn(); 
    
        const reservation = {
          id: 1,
          renterId: 1,
          payment: { paymentStatus: 'completed' },
          renter: {},
          chargingStation: {}
        };
    
        mockPrismaService.reservation.findUnique.mockResolvedValue(reservation);
        mockReceiptsService.generateReceipt.mockReturnValue(mockStream);
    
        const res = {
          setHeader: jest.fn(),
          pipe: jest.fn(), // If the controller pipes to res, we might need to mock res as a stream or similar
        } as unknown as Response;
         
        // Since controller does pdfStream.pipe(res), res must be stream-like or at least we expect pipe called on stream.
        // Actually the controller calls pdfStream.pipe(res).
        
        await controller.downloadReceipt(1, { id: 1, roles: [] } as any, res);
    
        expect(mockReceiptsService.generateReceipt).toHaveBeenCalledWith(reservation);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        // Check if pipe was called on the mock stream with the response object
        expect(mockStream.pipe).toHaveBeenCalledWith(res);
      });

    it('should throw NotFound if reservation not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);
      await expect(controller.downloadReceipt(1, { id: 1 } as any, mockResponse)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound if payment not completed', async () => {
        const reservation = {
            id: 1,
            renterId: 1,
            payment: { paymentStatus: 'pending' },
          };
      mockPrismaService.reservation.findUnique.mockResolvedValue(reservation);
      await expect(controller.downloadReceipt(1, { id: 1 } as any, mockResponse)).rejects.toThrow(NotFoundException);
    });
  });
});
