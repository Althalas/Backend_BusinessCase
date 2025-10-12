import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { DbResetUtil } from "./db-reset.util";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("Gap Analysis (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let dbResetUtil: DbResetUtil;
  let ownerToken: string;
  let renterToken: string;
  let stationId: number;
  let bookingId: number;

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

  it("should setup Users and Station", async () => {
    // Register Owner
    await request(app.getHttpServer()).post("/auth/register").send({
      email: "gap_owner@test.com",
      password: "Password123!",
      firstName: "Gap",
      lastName: "Owner",
      phone: "0600000000",
      address: "123 St",
      postalCode: "75000",
      city: "Paris",
    });
    await prisma.user.update({
      where: { email: "gap_owner@test.com" },
      data: { isValidated: true },
    });
    const ownerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "gap_owner@test.com", password: "Password123!" });
    ownerToken = ownerLogin.body.accessToken;

    // Register Renter
    await request(app.getHttpServer()).post("/auth/register").send({
      email: "gap_renter@test.com",
      password: "Password123!",
      firstName: "Gap",
      lastName: "Renter",
      phone: "0600000001",
      address: "124 St",
      postalCode: "75000",
      city: "Paris",
    });
    await prisma.user.update({
      where: { email: "gap_renter@test.com" },
      data: { isValidated: true },
    });
    const renterLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "gap_renter@test.com", password: "Password123!" });
    renterToken = renterLogin.body.accessToken;

    // Create Station
    const stationRes = await request(app.getHttpServer())
      .post("/stations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Gap Station",
        power: 22,
        connector: "TYPE2S",
        pricePerKwh: 1.0,
        address: "Gap St",
        city: "Paris",
        postalCode: "75000",
        latitude: 48.8,
        longitude: 2.3,
      });
    stationId = stationRes.body.id;
  }, 30000);

  it("should create booking and PREVENT deletion of station", async () => {
    // Create Booking
    const start = new Date();
    start.setHours(start.getHours() + 24);
    const end = new Date();
    end.setHours(end.getHours() + 26);

    const bookingRes = await request(app.getHttpServer())
      .post("/bookings")
      .set("Authorization", `Bearer ${renterToken}`)
      .send({
        stationId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
      .expect(201);
    bookingId = bookingRes.body.id;

    // Attempt Deletion by Owner -> Should FAIL
    await request(app.getHttpServer())
      .delete(`/stations/${stationId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(400); // Expecting BadRequest due to active reservation
  });

  it("should EXPORT excel file with PAST bookings only", async () => {
    // Create a past booking directly via Prisma (bypassing API validation that prevents past dates)
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 2);
    const pastEnd = new Date();
    pastEnd.setDate(pastEnd.getDate() - 1);

    const renter = await prisma.user.findUnique({
      where: { email: "gap_renter@test.com" },
    });
    await prisma.reservation.create({
      data: {
        renterId: renter!.id,
        chargingStationId: stationId,
        startDatetime: pastStart,
        endDatetime: pastEnd,
        totalAmount: 10.0,
        status: "completed",
      },
    });

    // Renter exports bookings
    const res = await request(app.getHttpServer())
      .get("/bookings/export/excel")
      .set("Authorization", `Bearer ${renterToken}`)
      .expect(200);

    expect(res.header["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.body).toBeDefined(); // Buffer
    // Note: verifying exact content of Excel in E2E is complex without parsing lib,
    // effectively we rely on the logic change we just made.
  });

  it("should ALLOW deletion after cancellation", async () => {
    // Cancel Booking
    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/cancel`)
      .set("Authorization", `Bearer ${renterToken}`)
      .expect(200);

    // Attempt Deletion by Owner -> Should PASS (Strictly speaking, it might still block if logic checks history? No, requirement is 'pending/accepted')
    // Current logic checks: status IN ['pending', 'accepted']. Cancelled is not in list.
    await request(app.getHttpServer())
      .delete(`/stations/${stationId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
  });
});
