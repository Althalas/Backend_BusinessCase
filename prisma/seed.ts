import { PrismaClient, UserRole, ConnectorType, ReservationStatus, PaymentStatus, ReportStatus, ReportReason } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Démarrage du seed...");

  // ----------------------------------------------------------------------
  // 1. CLEAN DATABASE
  // ----------------------------------------------------------------------
  try {
    await prisma.report.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.favoriteStation.deleteMany();
    await prisma.pricing.deleteMany();
    await prisma.chargingStation.deleteMany();
    await prisma.location.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
    console.log("Base de données nettoyée.");
  } catch (error) {
    console.warn("Erreur lors du nettoyage de la base (tables peut-être vides) :", error);
  }

  // ----------------------------------------------------------------------
  // 2. USERS
  // ----------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("TestPassword123!", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@elec.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      phone: "0100000000",
      roles: [UserRole.admin],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=admin",
    },
  });

  const ownerMarie = await prisma.user.create({
    data: {
      email: "marie.owner@test.com",
      passwordHash,
      firstName: "Marie",
      lastName: "Curie",
      phone: "0602020202",
      address: "5 Avenue des Champs-Élysées",
      postalCode: "75008",
      city: "Paris",
      roles: [UserRole.owner, UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=marie",
    },
  });

  const ownerLucas = await prisma.user.create({
    data: {
      email: "lucas.sud@test.com",
      passwordHash,
      firstName: "Lucas",
      lastName: "Pagnol",
      phone: "0607070707",
      address: "12 Vieux Port",
      postalCode: "13001",
      city: "Marseille",
      roles: [UserRole.owner],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=lucas",
    },
  });

  const clientJean = await prisma.user.create({
    data: {
      email: "jean.client@test.com",
      passwordHash,
      firstName: "Jean",
      lastName: "Dupont",
      phone: "0601010101",
      address: "10 Rue de la Paix",
      postalCode: "75001",
      city: "Paris",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=jean",
    },
  });

  const clientAlice = await prisma.user.create({
    data: {
      email: "alice.nantes@test.com",
      passwordHash,
      firstName: "Alice",
      lastName: "Wonder",
      phone: "0606060606",
      city: "Nantes",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=alice",
    },
  });

  const clientPaul = await prisma.user.create({
    data: {
      email: "paul.bad@test.com",
      passwordHash,
      firstName: "Paul",
      lastName: "Escroc",
      phone: "0603030303",
      city: "Bobigny",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=paul",
    },
  });

  // E2E Test User (for Cypress tests)
  const testVerified = await prisma.user.create({
    data: {
      email: "test.verified@example.com",
      passwordHash,
      firstName: "Test",
      lastName: "Verified",
      phone: "0699999999",
      address: "123 Test Street",
      postalCode: "75001",
      city: "Paris",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=testverified",
    },
  });

  const deletedUser = await prisma.user.create({
    data: {
      email: "ghost@test.com",
      passwordHash,
      firstName: "Casper",
      lastName: "Ghost",
      phone: "0000000000",
      city: "Limbo",
      roles: [UserRole.client],
      isValidated: true,
      isActive: false,
      deletedAt: new Date(),
    },
  });

  console.log("Utilisateurs créés");

  // ----------------------------------------------------------------------
  // 3. VEHICLES
  // ----------------------------------------------------------------------
  const vTesla = await prisma.vehicle.create({
    data: { userId: clientJean.id, brand: "Tesla", model: "Model 3", licensePlate: "JE-AN-123", connectorType: ConnectorType.CCS, batteryCapacity: 60.0 },
  });
  const vZoe = await prisma.vehicle.create({
    data: { userId: clientJean.id, brand: "Renault", model: "Zoe", licensePlate: "JE-AN-456", connectorType: ConnectorType.TYPE2, batteryCapacity: 52.0 },
  });
  const vLeaf = await prisma.vehicle.create({
    data: { userId: clientAlice.id, brand: "Nissan", model: "Leaf", licensePlate: "AL-IC-789", connectorType: ConnectorType.CHADEMO, batteryCapacity: 40.0 },
  });
  const vPeugeot = await prisma.vehicle.create({
    data: { userId: clientPaul.id, brand: "Peugeot", model: "e-208", licensePlate: "PA-UL-666", connectorType: ConnectorType.CCS, batteryCapacity: 50.0 },
  });
  const vTestCar = await prisma.vehicle.create({
    data: { userId: testVerified.id, brand: "Tesla", model: "Model S", licensePlate: "TE-ST-999", connectorType: ConnectorType.TYPE2, batteryCapacity: 100.0 },
  });

  console.log("Véhicules créés");

  // ----------------------------------------------------------------------
  // 4. LOCATIONS & STATIONS
  // ----------------------------------------------------------------------
  const locParis = await prisma.location.create({
    data: { userId: ownerMarie.id, address: "5 Avenue des Champs-Élysées", postalCode: "75008", city: "Paris", latitude: 48.8698, longitude: 2.3075 },
  });

  const stationParisFast = await prisma.chargingStation.create({
    data: {
      locationId: locParis.id, name: "Borne Élysée Fast", powerKw: 22.0, connectorType: ConnectorType.TYPE2, instructions: "Code portail: 1234. Fond de cour.", isOnStand: true, latitude: 48.8698, longitude: 2.3075, city: "Paris", isActive: true, isAvailable: true,
      pricing: { create: { hourlyRate: 15.0, validFrom: new Date() } }
    },
  });

  const stationParisSlow = await prisma.chargingStation.create({
    data: {
      locationId: locParis.id, name: "Borne Élysée Guest", powerKw: 3.7, connectorType: ConnectorType.DOMESTIC, instructions: "Prise renforcée murale.", isOnStand: false, latitude: 48.8698, longitude: 2.3075, city: "Paris", isActive: true, isAvailable: true,
      pricing: { create: { hourlyRate: 3.0, validFrom: new Date() } }
    },
  });

  const locMarseille = await prisma.location.create({
    data: { userId: ownerLucas.id, address: "12 Vieux Port", postalCode: "13001", city: "Marseille", latitude: 43.2950, longitude: 5.3740 },
  });

  const stationMarseille = await prisma.chargingStation.create({
    data: {
      locationId: locMarseille.id, name: "Marseille Sun", powerKw: 50.0, connectorType: ConnectorType.CCS, instructions: "Parking extérieur.", isOnStand: true, latitude: 43.2950, longitude: 5.3740, city: "Marseille", isActive: true, isAvailable: true,
      pricing: { create: { hourlyRate: 25.0, validFrom: new Date() } }
    },
  });

  const stationBroken = await prisma.chargingStation.create({
    data: {
      locationId: locMarseille.id, name: "Marseille Maintenance", powerKw: 22.0, connectorType: ConnectorType.TYPE2, latitude: 43.2951, longitude: 5.3741, city: "Marseille", isActive: false, isAvailable: false, statusMessage: "HS - En réparation",
      pricing: { create: { hourlyRate: 10.0, validFrom: new Date() } }
    },
  });

  const stationDeleted = await prisma.chargingStation.create({
    data: {
      locationId: locParis.id, name: "Old Paris Station", powerKw: 7.0, connectorType: ConnectorType.TYPE2, latitude: 48.8000, longitude: 2.3000, city: "Paris", isActive: false, deletedAt: new Date(), deletionReason: "Replaced by newer model", deletedBy: "Admin",
      pricing: { create: { hourlyRate: 5.0, validFrom: new Date() } }
    },
  });

  console.log("Stations créées");

  // ----------------------------------------------------------------------
  // 5. RESERVATIONS (Decoupled from Review)
  // ----------------------------------------------------------------------
  const now = new Date();
  const validPaymentDate = new Date(now.getTime() - 86400000 * 2);

  // 1. Completed
  await prisma.reservation.create({
    data: {
      renterId: clientJean.id, chargingStationId: stationParisFast.id, vehicleId: vTesla.id, startDatetime: new Date(now.getTime() - 86400000 * 5), endDatetime: new Date(now.getTime() - 86400000 * 5 + 7200000), totalAmount: 30.0, status: ReservationStatus.completed,
      payment: {
        create: { amount: 30.0, paymentStatus: PaymentStatus.completed, stripePaymentId: "pi_mock_completed_1", cardLastDigits: "4242", paymentDate: validPaymentDate }
      }
    },
  });

  // 2. Completed
  await prisma.reservation.create({
    data: {
      renterId: clientAlice.id, chargingStationId: stationMarseille.id, vehicleId: vLeaf.id, startDatetime: new Date(now.getTime() - 86400000 * 10), endDatetime: new Date(now.getTime() - 86400000 * 10 + 3600000), totalAmount: 25.0, status: ReservationStatus.completed,
      payment: {
        create: { amount: 25.0, paymentStatus: PaymentStatus.completed, stripePaymentId: "pi_mock_completed_2", cardLastDigits: "1234", paymentDate: new Date(now.getTime() - 86400000 * 10) }
      }
    },
  });

  // 3. Accepted
  await prisma.reservation.create({
    data: { renterId: clientJean.id, chargingStationId: stationMarseille.id, vehicleId: vTesla.id, startDatetime: new Date(now.getTime() + 86400000), endDatetime: new Date(now.getTime() + 86400000 + 7200000), totalAmount: 50.0, status: ReservationStatus.accepted },
  });

  // 4. Pending
  await prisma.reservation.create({
    data: { renterId: clientPaul.id, chargingStationId: stationParisSlow.id, vehicleId: vPeugeot.id, startDatetime: new Date(now.getTime() + 86400000 * 3), endDatetime: new Date(now.getTime() + 86400000 * 3 + 18000000), totalAmount: 15.0, status: ReservationStatus.pending },
  });

  // 5. Cancelled
  await prisma.reservation.create({
    data: { renterId: clientJean.id, chargingStationId: stationParisFast.id, vehicleId: vTesla.id, startDatetime: new Date(now.getTime() + 86400000 * 7), endDatetime: new Date(now.getTime() + 86400000 * 7 + 3600000), totalAmount: 15.0, status: ReservationStatus.cancelled },
  });

  // 6. Refused
  await prisma.reservation.create({
    data: { renterId: clientPaul.id, chargingStationId: stationParisFast.id, vehicleId: vPeugeot.id, startDatetime: new Date(now.getTime() + 86400000 * 2), endDatetime: new Date(now.getTime() + 86400000 * 2 + 3600000), totalAmount: 15.0, status: ReservationStatus.refused, refusedBy: "Owner" },
  });

  // 7. COMPLETED RESERVATION FOR TEST USER (Required for Reviews E2E)
  await prisma.reservation.create({
    data: {
      renterId: testVerified.id, chargingStationId: stationParisFast.id, vehicleId: vTestCar.id, 
      startDatetime: new Date(now.getTime() - 86400000 * 2), endDatetime: new Date(now.getTime() - 86400000 * 2 + 3600000), 
      totalAmount: 12.0, status: ReservationStatus.completed,
      payment: {
        create: { amount: 12.0, paymentStatus: PaymentStatus.completed, stripePaymentId: "pi_mock_test_completed", cardLastDigits: "4242", paymentDate: new Date(now.getTime() - 86400000 * 2) }
      }
    },
  });

  console.log("Réservations/Paiements créés");

  // ----------------------------------------------------------------------
  // 6. FAVORITES
  // ----------------------------------------------------------------------
  await prisma.favoriteStation.create({ data: { userId: clientJean.id, stationId: stationParisFast.id } });
  await prisma.favoriteStation.create({ data: { userId: clientAlice.id, stationId: stationMarseille.id } });

  // ----------------------------------------------------------------------
  // 7. REVIEWS (Created separately - No relation from Reservation)
  // ----------------------------------------------------------------------
  await prisma.review.create({
    data: {
      userId: clientJean.id,
      stationId: stationParisFast.id,
      rating: 5,
      comment: "Super charge, rapide et facile !",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientAlice.id,
      stationId: stationMarseille.id,
      rating: 4,
      comment: "Bien mais un peu cher.",
    },
  });
  console.log("Avis créés/liés");

  // ----------------------------------------------------------------------
  // 8. REPORTS
  // ----------------------------------------------------------------------
  await prisma.report.create({
    data: {
      reporterId: clientJean.id,
      targetStationId: stationBroken.id,
      reason: ReportReason.BROKEN_STATION,
      description: "Station decharge pas du tout. Severity High.",
      status: ReportStatus.PENDING,
    },
  });

  console.log("Signalements créés");
  console.log("Seeding terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
