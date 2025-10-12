import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto: RegisterDto = { email: 'test@test.com', password: 'password', firstName: 'John', lastName: 'Doe', phone: '1234567890' };
      const result = { message: 'Success' };
      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(dto)).toEqual(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should return tokens on login', async () => {
      const dto: LoginDto = { email: 'test@test.com', password: 'password' };
      const result = { accessToken: 'token', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto)).toEqual(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'old_refresh' };
      const result = { accessToken: 'new_token', refreshToken: 'new_refresh' };
      mockAuthService.refreshToken.mockResolvedValue(result);

      expect(await controller.refreshToken(dto)).toEqual(result);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      expect(await controller.logout(1)).toEqual({ message: 'Déconnecté avec succès' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const dto: VerifyEmailDto = { email: 'test@test.com', code: '123456' };
      mockAuthService.verifyEmail.mockResolvedValue(undefined);
      expect(await controller.verifyEmail(dto)).toEqual({ message: 'Email vérifié avec succès' });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(dto.email, dto.code);
    });
  });
});
