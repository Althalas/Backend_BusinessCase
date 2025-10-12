import { Test, TestingModule } from '@nestjs/testing';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

describe('StationsController', () => {
  let controller: StationsController;
  let stationsService: StationsService;

  const mockStationsService = {
    findAll: jest.fn(),
    search: jest.fn(),
    findMyLocations: jest.fn(),
    findByHost: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    validate: jest.fn(),
    deactivate: jest.fn(),
    toggleAvailability: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn(),
    getFavorites: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StationsController],
      providers: [
        { provide: StationsService, useValue: mockStationsService },
      ],
    }).compile();

    controller = module.get<StationsController>(StationsController);
    stationsService = module.get<StationsService>(StationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated stations', async () => {
      const result: any = { data: [], total: 0 };
      mockStationsService.findAll.mockResolvedValue(result);
      expect(await controller.findAll(1, 10)).toEqual(result);
      expect(mockStationsService.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('search', () => {
    it('should search stations', async () => {
      const dto = { lat: 10, lng: 20 };
      const result: any[] = [];
      mockStationsService.search.mockResolvedValue(result);
      expect(await controller.search(dto)).toEqual(result);
      expect(mockStationsService.search).toHaveBeenCalledWith(dto);
    });
  });

  describe('getMyLocations', () => {
    it('should return user locations', async () => {
      const result: any[] = [];
      mockStationsService.findMyLocations.mockResolvedValue(result);
      expect(await controller.getMyLocations(1)).toEqual(result);
      expect(mockStationsService.findMyLocations).toHaveBeenCalledWith(1);
    });
  });

  describe('findMyStations', () => {
    it('should return owner stations', async () => {
      const result: any[] = [];
      mockStationsService.findByHost.mockResolvedValue(result);
      expect(await controller.findMyStations(1)).toEqual(result);
      expect(mockStationsService.findByHost).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('should return a station', async () => {
      const result = { id: 1 };
      mockStationsService.findOne.mockResolvedValue(result);
      expect(await controller.findOne(1)).toEqual(result);
    });
  });

  describe('create', () => {
    it('should create a station', async () => {
      const dto = { name: 'Station' };
      const result = { id: 1 };
      mockStationsService.create.mockResolvedValue(result);
      expect(await controller.create(1, dto as any)).toEqual(result);
      expect(mockStationsService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update a station', async () => {
      const dto = { name: 'Updated' };
      const result = { id: 1 };
      mockStationsService.update.mockResolvedValue(result);
      expect(await controller.update(1, { id: 1, roles: [] } as any, dto)).toEqual(result);
    });
  });

  describe('validate', () => {
    it('should validate a station', async () => {
      const result = { id: 1 };
      mockStationsService.validate.mockResolvedValue(result);
      expect(await controller.validate(1)).toEqual(result);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a station', async () => {
      mockStationsService.deactivate.mockResolvedValue({});
      expect(await controller.deactivate(1, 'Reason')).toEqual({});
      expect(mockStationsService.deactivate).toHaveBeenCalledWith(1, 'Reason');
    });
  });

  describe('toggleAvailability', () => {
    it('should toggle availability', async () => {
      mockStationsService.toggleAvailability.mockResolvedValue({ id: 1 });
      expect(await controller.toggleAvailability(1, 1)).toEqual({ id: 1 });
    });
  });

  describe('delete', () => { 
    it('should delete a station', async () => {
       mockStationsService.delete.mockResolvedValue({ id: 1 });
       expect(await controller.delete(1, { id: 1, roles: [] } as any)).toEqual({ id: 1 });
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite', async () => {
      mockStationsService.toggleFavorite.mockResolvedValue(true);
      expect(await controller.toggleFavorite(1, 1)).toEqual(true);
    });
  });

  describe('getFavorites', () => {
    it('should return favorites', async () => {
      mockStationsService.getFavorites.mockResolvedValue([]);
      expect(await controller.getFavorites(1)).toEqual([]);
    });
  });
});
