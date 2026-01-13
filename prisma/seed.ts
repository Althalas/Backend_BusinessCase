import { PrismaClient, UserRole, ConnectorType, ReservationStatus, PaymentStatus, ReportStatus, ReportReason } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Script de seeding complet pour la base de données Electricity Business.
 *
 * Données centrées sur Clermont-Ferrand et ses environs (Auvergne).
 * Inclut un flux complet de réservations cohérent avec tous les statuts.
 *
 * Mots de passe : TestPassword123!
 */
async function main() {
  console.log("🚀 Démarrage du seed Clermont-Ferrand...");

  // ----------------------------------------------------------------------
  // 1. NETTOYAGE DE LA BASE
  // ----------------------------------------------------------------------
  try {
    await prisma.report.deleteMany();
    await prisma.review.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.favoriteStation.deleteMany();
    await prisma.pricing.deleteMany();
    await prisma.chargingStation.deleteMany();
    await prisma.location.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
    console.log("✅ Base de données nettoyée");
  } catch (error) {
    console.warn("⚠️ Erreur lors du nettoyage (tables peut-être vides)");
  }

  // ----------------------------------------------------------------------
  // 2. UTILISATEURS
  // ----------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("TestPassword123!", 12);

  // Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@elec.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      phone: "0100000000",
      address: "1 Place de Jaude",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.admin],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=admin",
    },
  });

  // Propriétaires (Owners) - Région Clermont-Ferrand
  const ownerPierre = await prisma.user.create({
    data: {
      email: "pierre.volcan@test.com",
      passwordHash,
      firstName: "Pierre",
      lastName: "Volcan",
      phone: "0473010101",
      address: "15 Avenue Julien",
      postalCode: "63400",
      city: "Chamalières",
      roles: [UserRole.owner, UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=pierre",
    },
  });

  const ownerCamille = await prisma.user.create({
    data: {
      email: "camille.puy@test.com",
      passwordHash,
      firstName: "Camille",
      lastName: "Puy",
      phone: "0473020202",
      address: "8 Rue Blatin",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.owner, UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=camille",
    },
  });

  const ownerMarc = await prisma.user.create({
    data: {
      email: "marc.auvergne@test.com",
      passwordHash,
      firstName: "Marc",
      lastName: "Auvergne",
      phone: "0473030303",
      address: "22 Place de la Victoire",
      postalCode: "63200",
      city: "Riom",
      roles: [UserRole.owner],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=marc",
    },
  });

  const ownerSophie = await prisma.user.create({
    data: {
      email: "sophie.thermal@test.com",
      passwordHash,
      firstName: "Sophie",
      lastName: "Thermal",
      phone: "0473040404",
      address: "5 Boulevard Barrieu",
      postalCode: "63130",
      city: "Royat",
      roles: [UserRole.owner, UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=sophie",
    },
  });

  // Clients
  const clientLucie = await prisma.user.create({
    data: {
      email: "lucie.driver@test.com",
      passwordHash,
      firstName: "Lucie",
      lastName: "Martin",
      phone: "0601010101",
      address: "10 Rue Pascal",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=lucie",
    },
  });

  const clientThomas = await prisma.user.create({
    data: {
      email: "thomas.eco@test.com",
      passwordHash,
      firstName: "Thomas",
      lastName: "Bernard",
      phone: "0602020202",
      address: "45 Avenue de la République",
      postalCode: "63170",
      city: "Aubière",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=thomas",
    },
  });

  const clientEmma = await prisma.user.create({
    data: {
      email: "emma.green@test.com",
      passwordHash,
      firstName: "Emma",
      lastName: "Dubois",
      phone: "0603030303",
      address: "3 Place Delille",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=emma",
    },
  });

  const clientNicolas = await prisma.user.create({
    data: {
      email: "nicolas.test@test.com",
      passwordHash,
      firstName: "Nicolas",
      lastName: "Petit",
      phone: "0604040404",
      address: "12 Rue Fontgiève",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=nicolas",
    },
  });

  // Client problématique (pour tests de signalements)
  const clientPaul = await prisma.user.create({
    data: {
      email: "paul.trouble@test.com",
      passwordHash,
      firstName: "Paul",
      lastName: "Trouble",
      phone: "0605050505",
      city: "Cournon-d'Auvergne",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=paul",
    },
  });

  // E2E Test User
  const testVerified = await prisma.user.create({
    data: {
      email: "test.verified@example.com",
      passwordHash,
      firstName: "Test",
      lastName: "Verified",
      phone: "0699999999",
      address: "123 Test Street",
      postalCode: "63000",
      city: "Clermont-Ferrand",
      roles: [UserRole.client],
      isValidated: true,
      isActive: true,
      avatarUrl: "https://i.pravatar.cc/150?u=testverified",
    },
  });

  // Utilisateur supprimé (RGPD)
  await prisma.user.create({
    data: {
      email: "deleted_user_001@anonymized.local",
      passwordHash,
      firstName: "Utilisateur",
      lastName: "Supprimé",
      phone: "0000000000",
      city: "N/A",
      roles: [UserRole.client],
      isValidated: true,
      isActive: false,
      deletedAt: new Date("2024-06-15"),
    },
  });

  console.log("✅ Utilisateurs créés (12)");

  // ----------------------------------------------------------------------
  // 3. VÉHICULES
  // ----------------------------------------------------------------------
  const vTeslaM3 = await prisma.vehicle.create({
    data: { userId: clientLucie.id, brand: "Tesla", model: "Model 3", licensePlate: "LU-CI-001", connectorType: ConnectorType.CCS, batteryCapacity: 60.0 },
  });
  const vZoe = await prisma.vehicle.create({
    data: { userId: clientLucie.id, brand: "Renault", model: "Zoe", licensePlate: "LU-CI-002", connectorType: ConnectorType.TYPE2, batteryCapacity: 52.0 },
  });
  const vID4 = await prisma.vehicle.create({
    data: { userId: clientThomas.id, brand: "Volkswagen", model: "ID.4", licensePlate: "TH-OM-001", connectorType: ConnectorType.CCS, batteryCapacity: 77.0 },
  });
  const vE208 = await prisma.vehicle.create({
    data: { userId: clientEmma.id, brand: "Peugeot", model: "e-208", licensePlate: "EM-MA-001", connectorType: ConnectorType.CCS, batteryCapacity: 50.0 },
  });
  const vLeaf = await prisma.vehicle.create({
    data: { userId: clientNicolas.id, brand: "Nissan", model: "Leaf", licensePlate: "NI-CO-001", connectorType: ConnectorType.CHADEMO, batteryCapacity: 40.0 },
  });
  const vMG4 = await prisma.vehicle.create({
    data: { userId: clientPaul.id, brand: "MG", model: "MG4", licensePlate: "PA-UL-666", connectorType: ConnectorType.CCS, batteryCapacity: 64.0 },
  });
  const vTeslaMS = await prisma.vehicle.create({
    data: { userId: testVerified.id, brand: "Tesla", model: "Model S", licensePlate: "TE-ST-999", connectorType: ConnectorType.TYPE2, batteryCapacity: 100.0 },
  });
  const vMegane = await prisma.vehicle.create({
    data: { userId: ownerPierre.id, brand: "Renault", model: "Megane E-Tech", licensePlate: "PI-ER-001", connectorType: ConnectorType.CCS, batteryCapacity: 60.0 },
  });
  const vSpring = await prisma.vehicle.create({
    data: { userId: ownerSophie.id, brand: "Dacia", model: "Spring", licensePlate: "SO-PH-001", connectorType: ConnectorType.CCS, batteryCapacity: 27.0 },
  });

  console.log("✅ Véhicules créés (9)");

  // ----------------------------------------------------------------------
  // 4. LOCATIONS & STATIONS - Clermont-Ferrand et environs
  // ----------------------------------------------------------------------

  // Location 1: Chamalières (Pierre)
  const locChamalieres = await prisma.location.create({
    data: { userId: ownerPierre.id, address: "15 Avenue Julien", postalCode: "63400", city: "Chamalières", latitude: 45.7700, longitude: 3.0600 },
  });

  const stationChamalieresFast = await prisma.chargingStation.create({
    data: {
      locationId: locChamalieres.id,
      name: "Borne Chamalières Express",
      powerKw: 22.0,
      connectorType: ConnectorType.TYPE2,
      instructions: "Sonnez au portail, code 4521. Place au fond à gauche.",
      isOnStand: true,
      latitude: 45.7700,
      longitude: 3.0600,
      city: "Chamalières",
      isActive: true,
      isAvailable: true,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400"]),
      pricing: { create: { hourlyRate: 12.0, validFrom: new Date() } },
    },
  });

  const stationChamalieresHome = await prisma.chargingStation.create({
    data: {
      locationId: locChamalieres.id,
      name: "Borne Chamalières Maison",
      powerKw: 7.4,
      connectorType: ConnectorType.TYPE2,
      instructions: "Prise murale dans le garage. Accès par allée latérale.",
      isOnStand: false,
      latitude: 45.7702,
      longitude: 3.0605,
      city: "Chamalières",
      isActive: true,
      isAvailable: true,
      pricing: { create: { hourlyRate: 5.0, validFrom: new Date() } },
    },
  });

  // Location 2: Clermont Centre (Camille)
  const locClermontCentre = await prisma.location.create({
    data: { userId: ownerCamille.id, address: "8 Rue Blatin", postalCode: "63000", city: "Clermont-Ferrand", latitude: 45.7772, longitude: 3.0870 },
  });

  const stationJaude = await prisma.chargingStation.create({
    data: {
      locationId: locClermontCentre.id,
      name: "Borne Place de Jaude",
      powerKw: 50.0,
      connectorType: ConnectorType.CCS,
      instructions: "Parking souterrain Jaude, niveau -2, emplacement 42.",
      isOnStand: true,
      latitude: 45.7772,
      longitude: 3.0870,
      city: "Clermont-Ferrand",
      isActive: true,
      isAvailable: true,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"]),
      pricing: { create: { hourlyRate: 18.0, validFrom: new Date() } },
    },
  });

  const stationBlatin = await prisma.chargingStation.create({
    data: {
      locationId: locClermontCentre.id,
      name: "Borne Rue Blatin Résidentiel",
      powerKw: 11.0,
      connectorType: ConnectorType.TYPE2,
      instructions: "Cour intérieure de l'immeuble. Digicode 1234B.",
      isOnStand: true,
      latitude: 45.7775,
      longitude: 3.0865,
      city: "Clermont-Ferrand",
      isActive: true,
      isAvailable: true,
      pricing: { create: { hourlyRate: 8.0, validFrom: new Date() } },
    },
  });

  // Location 3: Riom (Marc)
  const locRiom = await prisma.location.create({
    data: { userId: ownerMarc.id, address: "22 Place de la Victoire", postalCode: "63200", city: "Riom", latitude: 45.8900, longitude: 3.1150 },
  });

  const stationRiom = await prisma.chargingStation.create({
    data: {
      locationId: locRiom.id,
      name: "Borne Riom Centre",
      powerKw: 50.0,
      connectorType: ConnectorType.CHADEMO,
      instructions: "Derrière la mairie, parking gratuit 2h. Charge rapide CHAdeMO.",
      isOnStand: true,
      latitude: 45.8900,
      longitude: 3.1150,
      city: "Riom",
      isActive: true,
      isAvailable: true,
      pricing: { create: { hourlyRate: 10.0, validFrom: new Date() } },
    },
  });

  const stationRiomDomestic = await prisma.chargingStation.create({
    data: {
      locationId: locRiom.id,
      name: "Prise Riom Dépannage",
      powerKw: 3.7,
      connectorType: ConnectorType.DOMESTIC,
      instructions: "Prise domestique renforcée. Pour dépannage uniquement.",
      isOnStand: false,
      latitude: 45.8905,
      longitude: 3.1145,
      city: "Riom",
      isActive: true,
      isAvailable: true,
      pricing: { create: { hourlyRate: 2.0, validFrom: new Date() } },
    },
  });

  // Location 4: Royat (Sophie)
  const locRoyat = await prisma.location.create({
    data: { userId: ownerSophie.id, address: "5 Boulevard Barrieu", postalCode: "63130", city: "Royat", latitude: 45.7650, longitude: 3.0500 },
  });

  const stationRoyatThermes = await prisma.chargingStation.create({
    data: {
      locationId: locRoyat.id,
      name: "Borne Thermes de Royat",
      powerKw: 22.0,
      connectorType: ConnectorType.TYPE2,
      instructions: "Parking des Thermes, place dédiée VE près de l'entrée.",
      isOnStand: true,
      latitude: 45.7650,
      longitude: 3.0500,
      city: "Royat",
      isActive: true,
      isAvailable: true,
      photos: JSON.stringify(["https://images.unsplash.com/photo-1647500679670-d8e4f97f9b7b?w=400"]),
      pricing: { create: { hourlyRate: 9.0, validFrom: new Date() } },
    },
  });

  // Location 5: Aubière (Camille - 2ème adresse)
  const locAubiere = await prisma.location.create({
    data: { userId: ownerCamille.id, address: "12 Avenue du Parc", postalCode: "63170", city: "Aubière", latitude: 45.7600, longitude: 3.1100 },
  });

  const stationAubiere = await prisma.chargingStation.create({
    data: {
      locationId: locAubiere.id,
      name: "Borne Campus Aubière",
      powerKw: 50.0,
      connectorType: ConnectorType.CCS,
      instructions: "Près de l'université, parking étudiant. Accès libre.",
      isOnStand: true,
      latitude: 45.7600,
      longitude: 3.1100,
      city: "Aubière",
      isActive: true,
      isAvailable: true,
      pricing: { create: { hourlyRate: 15.0, validFrom: new Date() } },
    },
  });

  // Station en maintenance
  const stationMaintenance = await prisma.chargingStation.create({
    data: {
      locationId: locClermontCentre.id,
      name: "Borne Cathédrale (Maintenance)",
      powerKw: 22.0,
      connectorType: ConnectorType.TYPE2,
      latitude: 45.7795,
      longitude: 3.0830,
      city: "Clermont-Ferrand",
      isActive: false,
      isAvailable: false,
      statusMessage: "En maintenance jusqu'au 20/01/2026",
      pricing: { create: { hourlyRate: 10.0, validFrom: new Date() } },
    },
  });

  // Station supprimée
  await prisma.chargingStation.create({
    data: {
      locationId: locChamalieres.id,
      name: "Ancienne Borne Chamalières",
      powerKw: 7.0,
      connectorType: ConnectorType.TYPE2,
      latitude: 45.7680,
      longitude: 3.0580,
      city: "Chamalières",
      isActive: false,
      deletedAt: new Date("2024-11-01"),
      deletionReason: "Remplacée par une borne plus puissante",
      deletedBy: "owner",
      pricing: { create: { hourlyRate: 4.0, validFrom: new Date("2023-01-01") } },
    },
  });

  console.log("✅ Stations créées (11) - Clermont-Ferrand et environs");

  // ----------------------------------------------------------------------
  // 5. RÉSERVATIONS - Flux complet et cohérent
  // ----------------------------------------------------------------------
  const now = new Date();
  const oneDay = 86400000;
  const oneHour = 3600000;

  // === RÉSERVATIONS PASSÉES (Historique) ===

  // Resa 1: Complétée il y a 15 jours (Lucie @ Chamalières) - TYPE2 compatible
  const resa1 = await prisma.reservation.create({
    data: {
      renterId: clientLucie.id,
      chargingStationId: stationChamalieresFast.id,
      vehicleId: vZoe.id, // Zoe TYPE2 → Station TYPE2 ✅
      startDatetime: new Date(now.getTime() - oneDay * 15 + oneHour * 10),
      endDatetime: new Date(now.getTime() - oneDay * 15 + oneHour * 12),
      totalAmount: 24.0, // 2h x 12€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 24.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_001",
          cardLastDigits: "4242",
          paymentDate: new Date(now.getTime() - oneDay * 15),
        },
      },
    },
  });

  // Resa 2: Complétée il y a 12 jours (Thomas @ Jaude)
  const resa2 = await prisma.reservation.create({
    data: {
      renterId: clientThomas.id,
      chargingStationId: stationJaude.id,
      vehicleId: vID4.id,
      startDatetime: new Date(now.getTime() - oneDay * 12 + oneHour * 14),
      endDatetime: new Date(now.getTime() - oneDay * 12 + oneHour * 16),
      totalAmount: 36.0, // 2h x 18€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 36.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_002",
          cardLastDigits: "1234",
          paymentDate: new Date(now.getTime() - oneDay * 12),
        },
      },
    },
  });

  // Resa 3: Complétée il y a 10 jours (Emma @ Jaude) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientEmma.id,
      chargingStationId: stationJaude.id, // Station CCS
      vehicleId: vE208.id, // e-208 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() - oneDay * 10 + oneHour * 9),
      endDatetime: new Date(now.getTime() - oneDay * 10 + oneHour * 12),
      totalAmount: 54.0, // 3h x 18€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 54.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_003",
          cardLastDigits: "5678",
          paymentDate: new Date(now.getTime() - oneDay * 10),
        },
      },
    },
  });

  // Resa 4: Complétée il y a 8 jours (Nicolas @ Riom) - CHADEMO compatible
  await prisma.reservation.create({
    data: {
      renterId: clientNicolas.id,
      chargingStationId: stationRiom.id, // Station CHADEMO
      vehicleId: vLeaf.id, // Leaf CHADEMO → Station CHADEMO ✅
      startDatetime: new Date(now.getTime() - oneDay * 8 + oneHour * 11),
      endDatetime: new Date(now.getTime() - oneDay * 8 + oneHour * 14),
      totalAmount: 30.0, // 3h x 10€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 30.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_004",
          cardLastDigits: "9012",
          paymentDate: new Date(now.getTime() - oneDay * 8),
        },
      },
    },
  });

  // Resa 5: Complétée il y a 5 jours (Lucie @ Aubière) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientLucie.id,
      chargingStationId: stationAubiere.id, // Station CCS
      vehicleId: vTeslaM3.id, // Tesla M3 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() - oneDay * 5 + oneHour * 8),
      endDatetime: new Date(now.getTime() - oneDay * 5 + oneHour * 10),
      totalAmount: 30.0, // 2h x 15€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 30.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_005",
          cardLastDigits: "4242",
          paymentDate: new Date(now.getTime() - oneDay * 5),
        },
      },
    },
  });

  // Resa 6: Complétée il y a 3 jours - Test User (pour E2E avis) - TYPE2 compatible
  await prisma.reservation.create({
    data: {
      renterId: testVerified.id,
      chargingStationId: stationBlatin.id, // Station TYPE2
      vehicleId: vTeslaMS.id, // Tesla MS TYPE2 → Station TYPE2 ✅
      startDatetime: new Date(now.getTime() - oneDay * 3 + oneHour * 15),
      endDatetime: new Date(now.getTime() - oneDay * 3 + oneHour * 17),
      totalAmount: 16.0, // 2h x 8€
      status: ReservationStatus.completed,
      payment: {
        create: {
          amount: 16.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_test_e2e",
          cardLastDigits: "4242",
          paymentDate: new Date(now.getTime() - oneDay * 3),
        },
      },
    },
  });

  // Resa 7: Annulée par l'utilisateur il y a 7 jours (avec remboursement) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientThomas.id,
      chargingStationId: stationAubiere.id, // Station CCS
      vehicleId: vID4.id, // ID.4 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() - oneDay * 6 + oneHour * 10),
      endDatetime: new Date(now.getTime() - oneDay * 6 + oneHour * 12),
      totalAmount: 30.0, // 2h x 15€
      status: ReservationStatus.cancelled,
      cancelledBy: "user",
      cancellationReason: "Imprévu personnel - Remboursement intégral effectué",
      payment: {
        create: {
          amount: 30.0,
          paymentStatus: PaymentStatus.refunded,
          stripePaymentId: "pi_clermont_cancelled",
          cardLastDigits: "1234",
          paymentDate: new Date(now.getTime() - oneDay * 7),
        },
      },
    },
  });

  // Resa 8: Refusée par le propriétaire il y a 4 jours - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientPaul.id,
      chargingStationId: stationJaude.id, // Station CCS
      vehicleId: vMG4.id, // MG4 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() - oneDay * 3 + oneHour * 10),
      endDatetime: new Date(now.getTime() - oneDay * 3 + oneHour * 14),
      totalAmount: 72.0, // 4h x 18€
      status: ReservationStatus.refused,
      refusedBy: "owner",
      cancellationReason: "Indisponibilité exceptionnelle",
    },
  });

  // === RÉSERVATIONS EN COURS / FUTURES ===

  // Resa 9: Acceptée pour demain (Thomas @ Jaude) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientThomas.id,
      chargingStationId: stationJaude.id, // Station CCS
      vehicleId: vID4.id, // ID.4 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() + oneDay + oneHour * 10),
      endDatetime: new Date(now.getTime() + oneDay + oneHour * 13),
      totalAmount: 54.0, // 3h x 18€
      status: ReservationStatus.accepted,
      payment: {
        create: {
          amount: 54.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_future_001",
          cardLastDigits: "1234",
          paymentDate: new Date(),
        },
      },
    },
  });

  // Resa 10: Acceptée pour après-demain (Emma @ Aubière) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientEmma.id,
      chargingStationId: stationAubiere.id, // Station CCS
      vehicleId: vE208.id, // e-208 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() + oneDay * 2 + oneHour * 14),
      endDatetime: new Date(now.getTime() + oneDay * 2 + oneHour * 17),
      totalAmount: 45.0, // 3h x 15€
      status: ReservationStatus.accepted,
      payment: {
        create: {
          amount: 45.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_future_002",
          cardLastDigits: "5678",
          paymentDate: new Date(),
        },
      },
    },
  });

  // Resa 11: En attente (pending) - Nicolas dans 3 jours - CHADEMO compatible
  await prisma.reservation.create({
    data: {
      renterId: clientNicolas.id,
      chargingStationId: stationRiom.id, // Station CHADEMO
      vehicleId: vLeaf.id, // Leaf CHADEMO → Station CHADEMO ✅
      startDatetime: new Date(now.getTime() + oneDay * 3 + oneHour * 9),
      endDatetime: new Date(now.getTime() + oneDay * 3 + oneHour * 11),
      totalAmount: 20.0, // 2h x 10€
      status: ReservationStatus.pending,
    },
  });

  // Resa 12: En attente (pending) - Lucie dans 4 jours - TYPE2 compatible
  await prisma.reservation.create({
    data: {
      renterId: clientLucie.id,
      chargingStationId: stationRoyatThermes.id, // Station TYPE2
      vehicleId: vZoe.id, // Zoe TYPE2 → Station TYPE2 ✅
      startDatetime: new Date(now.getTime() + oneDay * 4 + oneHour * 16),
      endDatetime: new Date(now.getTime() + oneDay * 4 + oneHour * 19),
      totalAmount: 27.0,
      status: ReservationStatus.pending,
    },
  });

  // Resa 13: En attente (pending) - Paul dans 5 jours (potentiellement refusable) - CCS compatible
  await prisma.reservation.create({
    data: {
      renterId: clientPaul.id,
      chargingStationId: stationAubiere.id, // Station CCS
      vehicleId: vMG4.id, // MG4 CCS → Station CCS ✅
      startDatetime: new Date(now.getTime() + oneDay * 5 + oneHour * 11),
      endDatetime: new Date(now.getTime() + oneDay * 5 + oneHour * 14),
      totalAmount: 45.0, // 3h x 15€
      status: ReservationStatus.pending,
    },
  });

  // Resa 14: Acceptée pour la semaine prochaine (Lucie @ Chamalières) - TYPE2 compatible
  await prisma.reservation.create({
    data: {
      renterId: clientLucie.id,
      chargingStationId: stationChamalieresFast.id, // Station TYPE2
      vehicleId: vZoe.id, // Zoe TYPE2 → Station TYPE2 ✅
      startDatetime: new Date(now.getTime() + oneDay * 7 + oneHour * 10),
      endDatetime: new Date(now.getTime() + oneDay * 7 + oneHour * 12),
      totalAmount: 24.0, // 2h x 12€
      status: ReservationStatus.accepted,
      payment: {
        create: {
          amount: 24.0,
          paymentStatus: PaymentStatus.completed,
          stripePaymentId: "pi_clermont_future_003",
          cardLastDigits: "4242",
          paymentDate: new Date(),
        },
      },
    },
  });

  console.log("✅ Réservations créées (14) - Flux complet");

  // ----------------------------------------------------------------------
  // 6. FAVORIS
  // ----------------------------------------------------------------------
  await prisma.favoriteStation.createMany({
    data: [
      { userId: clientLucie.id, stationId: stationChamalieresFast.id },
      { userId: clientLucie.id, stationId: stationJaude.id },
      { userId: clientThomas.id, stationId: stationJaude.id },
      { userId: clientThomas.id, stationId: stationAubiere.id },
      { userId: clientEmma.id, stationId: stationRoyatThermes.id },
      { userId: clientNicolas.id, stationId: stationRiom.id },
      { userId: testVerified.id, stationId: stationJaude.id },
    ],
  });

  console.log("✅ Favoris créés (7)");

  // ----------------------------------------------------------------------
  // 7. AVIS (Reviews)
  // ----------------------------------------------------------------------
  await prisma.review.create({
    data: {
      userId: clientLucie.id,
      stationId: stationChamalieresFast.id,
      rating: 5,
      comment: "Excellente borne ! Charge rapide et propriétaire très accueillant. Je recommande vivement.",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientThomas.id,
      stationId: stationJaude.id,
      rating: 4,
      comment: "Très bien située en centre-ville. Charge rapide. Un peu cher mais pratique pour le shopping.",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientEmma.id,
      stationId: stationRoyatThermes.id,
      rating: 5,
      comment: "Cadre magnifique près des thermes. J'ai pu me balader pendant la charge. Parfait !",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientNicolas.id,
      stationId: stationRiom.id,
      rating: 4,
      comment: "Borne fiable à Riom. Facile d'accès. Tarif correct.",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientLucie.id,
      stationId: stationAubiere.id,
      rating: 4,
      comment: "Pratique pour les étudiants et employés du campus. Charge rapide.",
    },
  });

  await prisma.review.create({
    data: {
      userId: clientThomas.id,
      stationId: stationChamalieresFast.id,
      rating: 5,
      comment: "Deuxième utilisation, toujours au top ! Pierre est très arrangeant.",
    },
  });

  // Avis mitigé
  await prisma.review.create({
    data: {
      userId: clientPaul.id,
      stationId: stationBlatin.id,
      rating: 2,
      comment: "Difficile à trouver, le digicode ne marchait pas du premier coup. Bof.",
    },
  });

  // Avis négatif (pour tests modération)
  const badReview = await prisma.review.create({
    data: {
      userId: clientPaul.id,
      stationId: stationRiom.id,
      rating: 1,
      comment: "Arnaque totale ! La borne ne charge pas correctement. À éviter absolument !!!",
    },
  });

  console.log("✅ Avis créés (8)");

  // ----------------------------------------------------------------------
  // 8. SIGNALEMENTS (Reports)
  // ----------------------------------------------------------------------

  // Signalement d'une station en panne
  await prisma.report.create({
    data: {
      reporterId: clientLucie.id,
      targetStationId: stationMaintenance.id,
      reason: ReportReason.BROKEN_STATION,
      description: "La borne ne démarre plus depuis ce matin. Le voyant reste rouge.",
      status: ReportStatus.PENDING,
    },
  });

  // Signalement d'informations incorrectes
  await prisma.report.create({
    data: {
      reporterId: clientThomas.id,
      targetStationId: stationRiomDomestic.id,
      reason: ReportReason.INCORRECT_INFO,
      description: "L'adresse indiquée n'est pas exacte. La borne est à 50m de là.",
      status: ReportStatus.RESOLVED,
    },
  });

  // Signalement d'un avis inapproprié
  await prisma.report.create({
    data: {
      reporterId: ownerMarc.id,
      targetReviewId: badReview.id,
      reason: ReportReason.INAPPROPRIATE_CONTENT,
      description: "Cet avis est diffamatoire. La borne fonctionne parfaitement, j'ai vérifié.",
      status: ReportStatus.PENDING,
    },
  });

  // Signalement autre
  await prisma.report.create({
    data: {
      reporterId: clientEmma.id,
      targetStationId: stationChamalieresHome.id,
      reason: ReportReason.OTHER,
      description: "Le câble de la borne semble usé et nécessite un remplacement préventif.",
      status: ReportStatus.PENDING,
    },
  });

  console.log("✅ Signalements créés (4)");

  // ----------------------------------------------------------------------
  // FIN
  // ----------------------------------------------------------------------
  console.log("\n🎉 Seeding Clermont-Ferrand terminé avec succès !");
  console.log("📊 Résumé :");
  console.log("   - 12 utilisateurs (1 admin, 4 owners, 6 clients, 1 supprimé)");
  console.log("   - 9 véhicules");
  console.log("   - 11 stations (9 actives, 1 maintenance, 1 supprimée)");
  console.log("   - 14 réservations (flux complet)");
  console.log("   - 7 favoris");
  console.log("   - 8 avis");
  console.log("   - 4 signalements");
  console.log("\n🔑 Mot de passe universel : TestPassword123!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
