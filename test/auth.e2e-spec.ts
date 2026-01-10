import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { DbResetUtil } from "./db-reset.util";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
        providers: [DbResetUtil],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      prisma = app.get(PrismaService);
      const dbReset = app.get(DbResetUtil);
      await dbReset.reset();
    } catch (e) {
      console.error("AUTH INIT FAILED", e);
      throw e;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe("POST /auth/register", () => {
    const registerDto = {
      email: "newuser@example.com",
      password: "Password123!",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+33698765432",
      address: "456 New Street",
      postalCode: "75002",
      city: "Paris",
    };

    it("should register a new user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty("message");

      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });
      expect(user).toBeDefined();
      expect(user!.firstName).toBe(registerDto.firstName);
      expect(user!.email).toBe(registerDto.email);
    });

    it("should reject registration with existing email", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send(registerDto)
        .expect(409);
    });

    it("should reject invalid email", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ ...registerDto, email: "invalid" })
        .expect(400);
    });
  });

  describe("POST /auth/login", () => {
    const loginUser = {
      email: "login@test.com",
      password: "Password123!",
      firstName: "Login",
      lastName: "User",
      phone: "+33698765432",
    };

    beforeAll(async () => {
      // Register and Validated User
      await request(app.getHttpServer()).post("/auth/register").send(loginUser);

      // Manual validation in DB
      const user = await prisma.user.update({
        where: { email: loginUser.email },
        data: { isValidated: true, isActive: true },
      });
      expect(user.isValidated).toBe(true);
    });

    it("should login with valid credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: loginUser.email,
          password: loginUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(loginUser.email);
    });

    it("should reject login with wrong password", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: loginUser.email,
          password: "WrongPassword!",
        })
        .expect(401);
    });
  });
});
