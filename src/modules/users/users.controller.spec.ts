import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    exportUserData: jest.fn(),
    updateAvatar: jest.fn(),
    update: jest.fn(),
    changePassword: jest.fn(),
    toggleStatus: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be created', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = { data: [], total: 0 };
      mockUsersService.findAll.mockResolvedValue(result);
      expect(await controller.findAll(1, 10)).toEqual(result);
    });
  });

  describe('getProfile', () => {
    it('should return profile', async () => {
      const result = { id: 1, email: 'test@test.com' };
      mockUsersService.findOne.mockResolvedValue(result);
      expect(await controller.getProfile(1)).toEqual(result);
    });
  });

  describe('exportData', () => {
    it('should export data', async () => {
      const result = { id: 1, history: [] };
      mockUsersService.exportUserData.mockResolvedValue(result);
      expect(await controller.exportData(1)).toEqual(result);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar', async () => {
      const file = { filename: 'test.jpg' } as any;
      const result = { avatarUrl: '/uploads/avatars/test.jpg' };
      mockUsersService.updateAvatar.mockResolvedValue(result);
      expect(await controller.uploadAvatar(1, file)).toEqual(result);
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      const dto = { firstName: 'John' };
      const result = { id: 1, ...dto };
      mockUsersService.update.mockResolvedValue(result);
      expect(await controller.updateProfile(1, dto)).toEqual(result);
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      const dto = { currentPassword: 'old', newPassword: 'new' };
      mockUsersService.changePassword.mockResolvedValue(true);
      expect(await controller.changePassword(1, dto)).toEqual(true);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle status', async () => {
      const result = { isActive: false };
      mockUsersService.toggleStatus.mockResolvedValue(result);
      expect(await controller.toggleStatus(1)).toEqual(result);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
       const result = { id: 1 };
       mockUsersService.delete.mockResolvedValue(result);
       expect(await controller.delete(1)).toEqual(result);
    });
  });
});
