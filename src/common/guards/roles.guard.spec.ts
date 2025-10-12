import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { UserRole } from "@prisma/client";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should allow if no roles are required", () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it("should allow if user has required role", () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { roles: [UserRole.admin] },
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([UserRole.admin]);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it("should deny if user does not have required role", () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { roles: [UserRole.client] },
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([UserRole.admin]);

    expect(guard.canActivate(mockContext)).toBe(false);
  });
});
