import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";

import { AppModule } from "../src/app.module";
import { DbResetUtil } from "./db-reset.util";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("BookingsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clientToken: string;
  let ownerToken: string;
  let stationId: number;
  let bookingId: number;

  const ownerUser = {
    email: "owner.booking@test.com",
    password: "Password123!",
    firstName: "Owner",
    lastName: "Booking",
    phone: "+33611111111",
  };

  const clientUser = {
    email: "client.booking@test.com",
    password: "Password123!",
    firstName: "Client",
    lastName: "Booking",
    phone: "+33622222222",
  };

  beforeAll(async () => {
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
    await app.get(DbResetUtil).reset();

    // 1. Setup Owner
    await request(app.getHttpServer()).post("/auth/register").send(ownerUser);
    await prisma.user.update({
      where: { email: ownerUser.email },
      data: { isValidated: true, isActive: true },
    });
    const ownerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });
    ownerToken = ownerLogin.body.accessToken;

    // 2. Setup Client
    await request(app.getHttpServer()).post("/auth/register").send(clientUser);
    await prisma.user.update({
      where: { email: clientUser.email },
      data: { isValidated: true, isActive: true },
    });
    const clientLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: clientUser.email, password: clientUser.password });
    clientToken = clientLogin.body.accessToken;

    // 3. Create Station (as Owner)
    const stationRes = await request(app.getHttpServer())
      .post("/stations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Booking Test Station",
        power: 22,
        connector: "TYPE2",
        pricePerKwh: 0.5,
        address: "10 Rue de Tests",
        city: "TestCity",
        postalCode: "75000",
        latitude: 48.8566,
        longitude: 2.3522,
      })
      .expect(201);
    stationId = stationRes.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /bookings", () => {
    it("should create a booking", async () => {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1); // Tomorrow
      startTime.setHours(14, 0, 0, 0); // Force start at 14:00 to avoid late-night execution issues

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 2 hours later

      const res = await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          stationId: stationId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.status).toBe("pending");
      bookingId = res.body.id;
    });

    it("should fail if station does not exist", async () => {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 2);
      startTime.setHours(14, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          stationId: 99999,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(404);
    });
  });

  describe("GET /bookings/my", () => {
    it("should return client bookings", async () => {
      const res = await request(app.getHttpServer())
        .get("/bookings/my")
        .set("Authorization", `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.find((b: any) => b.id === bookingId);
      expect(found).toBeDefined();
    });
  });

  describe("PATCH /bookings/:id/cancel", () => {
    it("should cancel the booking", async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${clientToken}`)
        .expect(200);

      // Verify status in DB
      const check = await prisma.reservation.findUnique({
        where: { id: bookingId },
      });
      expect(check!.status).toBe("cancelled");
    });

    it("should fail to cancel non-existent booking", async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/999999/cancel`)
        .set("Authorization", `Bearer ${clientToken}`)
        .expect(404);
    });
  });
});
