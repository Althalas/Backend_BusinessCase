import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { DbResetUtil } from "./db-reset.util";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("Roles & Permissions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let dbResetUtil: DbResetUtil;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [DbResetUtil],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    dbResetUtil = moduleFixture.get<DbResetUtil>(DbResetUtil);

    await dbResetUtil.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should promote Client to Owner while KEEPING Client role", async () => {
    // 1. Register generic client
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: "role_test@test.com",
        password: "Password123!",
        firstName: "Role",
        lastName: "Test",
        phone: "0612345678",
      })
      .expect(201);

    // Force validation
    await prisma.user.update({
      where: { email: "role_test@test.com" },
      data: { isValidated: true },
    });

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "role_test@test.com", password: "Password123!" })
      .expect(200);
    token = loginRes.body.accessToken;

    // Verify initial Client Role
    const userBefore = await prisma.user.findUnique({
      where: { email: "role_test@test.com" },
    });
    expect(userBefore?.roles).toEqual(["client"]);
    userId = userBefore!.id;

    // 2. Create Station (Trigger promotion)
    await request(app.getHttpServer())
      .post("/stations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Role Test Station",
        power: 11,
        connector: "TYPE2S",
        pricePerKwh: 0.5,
        address: "123 Fake St",
        city: "Paris",
        postalCode: "75000",
        latitude: 48.8,
        longitude: 2.3,
      })
      .expect(201);

    // 3. Verify Roles Accumulation
    const userAfter = await prisma.user.findUnique({
      where: { email: "role_test@test.com" },
    });
    console.log("User Roles After Station Creation:", userAfter?.roles);

    // Expectation: Should contain BOTH 'client' and 'owner'
    expect(userAfter?.roles).toContain("client");
    expect(userAfter?.roles).toContain("owner");
    expect(userAfter?.roles.length).toBeGreaterThanOrEqual(2);
  });
});
