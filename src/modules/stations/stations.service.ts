import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Prisma, UserRole, ReservationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStationDto } from "./dto/create-station.dto";
import { UpdateStationDto } from "./dto/update-station.dto";
import { SearchStationsDto } from "./dto/search-stations.dto";

/**
 * Service de gestion des stations de recharge.
 * Contient la logique de création, recherche géospatiale, tarification et favoris.
 */
@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Récupère les lieux (adresses) de l'utilisateur.
   */
  async findMyLocations(userId: number) {
    return this.prisma.location.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      distinct: ["address", "city"], // Éviter les doublons si nécessaire
    });
  }

  /**
   * Crée une station complète avec localisation et tarification.
   * - Réutilise une location si locationId est fourni.
   * - Sinon, crée l'entité Location.
   * - Crée l'entité ChargingStation.
   * - Initialise le Pricing.
   * - Promeut l'utilisateur au rôle 'owner' si nécessaire.
   * @param userId Propriétaire.
   * @param dto Données de création.
   * @returns La station créée.
   */
  async create(userId: number, dto: CreateStationDto) {
    let locationId = dto.locationId;

    // 1. Gestion du Lieu (Existant ou Nouveau)
    if (locationId) {
      const existingLocation = await this.prisma.location.findFirst({
        where: { id: locationId, userId },
      });
      if (!existingLocation) {
        throw new BadRequestException(
          "Lieu invalide ou non appartenant à l'utilisateur.",
        );
      }
    } else {
      const newLocation = await this.prisma.location.create({
        data: {
          userId,
          address: dto.address,
          postalCode: dto.postalCode,
          city: dto.city,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
      locationId = newLocation.id;
    }

    // 2. Création de la borne de recharge
    const chargingStation = await this.prisma.chargingStation.create({
      data: {
        locationId: locationId!,
        name: dto.name,
        powerKw: dto.power,
        connectorType: dto.connector,
        instructions: dto.description,
        isOnStand: dto.isOnStand || false,
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city,
        isActive: true,
        photos: dto.photos ?? [],
      },
      include: {
        location: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Initialisation de la tarification
    await this.prisma.pricing.create({
      data: {
        chargingStationId: chargingStation.id,
        hourlyRate: dto.pricePerKwh,
        validFrom: new Date(),
      },
    });

    // Vérifier et mettre à jour le rôle de l'utilisateur si nécessaire
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.roles.includes(UserRole.owner)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { roles: [...user.roles, UserRole.owner] },
      });
    }

    return chargingStation;
  }

  /**
   * Récupère toutes les stations actives (paginé).
   * Gère la sérialisation manuelle des Decimal (Prisma) vers Number.
   * @param page Page courante.
   * @param limit Limite par page.
   */
  async findAll(page = 1, limit = 10) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [stations, total] = await Promise.all([
        this.prisma.chargingStation.findMany({
          where: { isActive: true, isAvailable: true, deletedAt: null },
          skip,
          take: limitNum,
          include: {
            location: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
            pricing: {
              where: { validTo: null },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.chargingStation.count({
          where: { isActive: true, isAvailable: true, deletedAt: null },
        }),
      ]);

      return {
        data: stations,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error("Erreur dans findAll", error);
      throw error;
    }
  }

  /**
   * Recherche géospatiale avancée.
   * Utilise SQL Raw et la formule Haversine pour calculer la distance.
   * @param dto Paramètres de recherche (lat, lng, rayon, filtres).
   * @returns Liste des stations triées par distance.
   */
  async search(dto: SearchStationsDto) {
    try {
      // Log Removed for Production
      const {
        lat,
        lng,
        radius = 10,
        minPower,
        maxPrice,
        connectorType,
        page = 1,
        limit = 10,
        search,
      } = dto;
      const skip = (page - 1) * limit;

      // --- RECHERCHE GÉOLOCALISÉE (SQL Brut) ---
      if (lat !== undefined && lng !== undefined) {
        // Construction dynamique des clauses WHERE avec Prisma.sql
        const conditions: Prisma.Sql[] = [];

        // conditions.push(Prisma.sql`"isActive" = true`); // RETIRÉ pour montrer les stations hors ligne (Admin/Owner)
        conditions.push(Prisma.sql`"deletedAt" IS NULL`);

        if (dto.isAvailable) {
          conditions.push(Prisma.sql`"isAvailable" = true`);
        }

        if (minPower) {
          conditions.push(Prisma.sql`"powerKw" >= ${minPower}`);
        }

        if (connectorType) {
          // Cast en text pour correspondre à l'enum si nécessaire
          conditions.push(Prisma.sql`"connectorType"::text = ${connectorType}`);
        }

        // Logique Prix Max : Jointure table Pricing où validTo est null.
        // Utilisation d'une sous-requête EXISTS dans le WHERE pour simplicité.
        if (maxPrice) {
          conditions.push(Prisma.sql`
             EXISTS (
               SELECT 1 FROM "Pricing" p 
               WHERE p."chargingStationId" = "ChargingStation".id 
               AND p."validTo" IS NULL 
               AND p."hourlyRate" <= ${maxPrice}
             )
           `);
        }

        // --- REQUÊTE DE RECHERCHE ---
        if (search) {
          const searchPattern = `%${search}%`;
          conditions.push(Prisma.sql`
            (
              "name" ILIKE ${searchPattern} OR 
              "city" ILIKE ${searchPattern} OR
              EXISTS (
                SELECT 1 FROM "Location" l
                WHERE l.id = "ChargingStation"."locationId"
                AND (l.address ILIKE ${searchPattern} OR l.city ILIKE ${searchPattern})
              )
            )
          `);
        }

        const whereClause = conditions.length
          ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
          : Prisma.empty;

        // 1. Récupérer le nombre total (Total Count)
        const countQuery = Prisma.sql`
          SELECT COUNT(*)::int as total
          FROM "ChargingStation"
          ${whereClause}
          AND ( 6371 * acos(
                least(1.0, greatest(-1.0,
                  cos( radians(${lat}::float) ) * cos( radians( "latitude"::float ) )
                  * cos( radians( "longitude"::float ) - radians(${lng}::float) )
                  + sin( radians(${lat}::float) ) * sin( radians( "latitude"::float ) )
                ))
              ) ) < ${radius}
        `;

        const countResult = await this.prisma.$queryRaw<any[]>(countQuery);
        const total = countResult[0]?.total || 0;

        // 2. Récupérer les données (Data)
        const dataQuery = Prisma.sql`
          SELECT 
            *,
            ( 6371 * acos(
                least(1.0, greatest(-1.0,
                  cos( radians(${lat}::float) ) * cos( radians( "latitude"::float ) )
                  * cos( radians( "longitude"::float ) - radians(${lng}::float) )
                  + sin( radians(${lat}::float) ) * sin( radians( "latitude"::float ) )
                ))
              ) ) AS distance
          FROM "ChargingStation"
          ${whereClause}
          AND ( 6371 * acos(
                least(1.0, greatest(-1.0,
                  cos( radians(${lat}::float) ) * cos( radians( "latitude"::float ) )
                  * cos( radians( "longitude"::float ) - radians(${lng}::float) )
                  + sin( radians(${lat}::float) ) * sin( radians( "latitude"::float ) )
                ))
              ) ) < ${radius}
          ORDER BY distance
          LIMIT ${limit} OFFSET ${skip}
        `;

        const rawStations = await this.prisma.$queryRaw<any[]>(dataQuery);

        // Hydratation des relations (Location, Pricing)
        // Le résultat brut (Raw) n'a que les champs ChargingStation.
        // On récupère les objets complets via IDs pour plus de propreté et éviter le mapping snake_case manuel.

        const stationIds = rawStations.map((s) => s.id);

        const richStations = await this.prisma.chargingStation.findMany({
          where: { id: { in: stationIds } },
          include: {
            location: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            pricing: {
              where: { validTo: null },
              take: 1,
            },
          },
        });

        // Re-trier richStations par distance (correspondre à l'ordre rawStations)
        const sortedStations = stationIds.map(
          (id) => richStations.find((s) => s.id === id)!,
        );

        return {
          data: sortedStations,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      }

      // --- RECHERCHE STANDARD (Prisma) ---
      const where: Prisma.ChargingStationWhereInput = {
        isActive: true,
        isAvailable: true,
        deletedAt: null,
      };

      if (minPower) {
        where.powerKw = { gte: minPower };
      }

      if (connectorType) {
        where.connectorType = connectorType;
      }

      // Le filtre MaxPrice est complexe dans le "where" Prisma car c'est une relation "Pricing".
      // L'implémentation précédente filtrait *après* le fetch, ce qui fausse la pagination.
      // Optimisation : Utilisation du filtrage relationnel Prisma.

      if (maxPrice !== undefined) {
        where.pricing = {
          some: {
            hourlyRate: { lte: maxPrice },
            validTo: null,
          },
        };
      }

      // --- REQUÊTE DE RECHERCHE ---
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          {
            location: {
              OR: [
                { address: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const [stations, total] = await Promise.all([
        this.prisma.chargingStation.findMany({
          where,
          include: {
            location: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
            pricing: {
              where: { validTo: null },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: skip,
        }),
        this.prisma.chargingStation.count({ where }),
      ]);

      return {
        data: stations,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error("Erreur dans search", error);
      throw error;
    }
  }

  /**
   * Trouve une station par son ID.
   * Inclut relations: location, user, pricing, et dernière réservation.
   * @throws {NotFoundException} Si introuvable ou supprimée.
   */
  async findOne(id: number) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: {
        location: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        pricing: {
          where: { validTo: null },
          take: 1,
        },
        reservations: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    return station;
  }

  /**
   * Trouve toutes les stations d'un hôte donné.
   * Inclut le compteur de réservations.
   */
  async findByHost(userId: number) {
    return this.prisma.chargingStation.findMany({
      where: {
        location: {
          userId,
        },
        deletedAt: null,
      },
      include: {
        location: true,
        pricing: {
          where: { validTo: null },
          take: 1,
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met à jour une station.
   * Gère l'historisation des prix (Pricing) si le tarif change.
   * Vérifie les droits (Propriétaire ou Admin).
   */
  async update(
    id: number,
    userId: number,
    userRoles: string[],
    dto: UpdateStationDto,
  ) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    if (!userRoles.includes("admin") && station.location.userId !== userId) {
      throw new ForbiddenException("Non autorisé à modifier cette station");
    }

    // Mettre à jour la station
    const updated = await this.prisma.chargingStation.update({
      where: { id },
      data: {
        name: dto.name,
        powerKw: dto.power,
        instructions: dto.description,
        isOnStand: dto.isOnStand,
      },
      include: {
        location: true,
        pricing: {
          where: { validTo: null },
          take: 1,
        },
      },
    });

    // Mettre à jour le pricing si nécessaire
    if (dto.pricePerKwh) {
      const currentPricing = await this.prisma.pricing.findFirst({
        where: {
          chargingStationId: id,
          validTo: null,
        },
      });

      if (currentPricing) {
        await this.prisma.pricing.update({
          where: { id: currentPricing.id },
          data: {
            validTo: new Date(),
          },
        });
      }

      await this.prisma.pricing.create({
        data: {
          chargingStationId: id,
          hourlyRate: dto.pricePerKwh,
          validFrom: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Supprime une station (Soft Delete).
   * Marque `deletedAt` et `isActive = false`.
   */
  async delete(id: number, userId: number, userRoles: string[]) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    if (!userRoles.includes("admin") && station.location.userId !== userId) {
      throw new ForbiddenException("Non autorisé à supprimer cette station");
    }

    // [GAP FIX] Vérification des réservations actives
    // Empêcher la suppression si la borne a des réservations en attente ou acceptées.
    const activeReservations = await this.prisma.reservation.count({
      where: {
        chargingStationId: id,
        status: {
          in: [ReservationStatus.pending, ReservationStatus.accepted],
        },
      },
    });

    if (activeReservations > 0) {
      throw new BadRequestException(
        "Impossible de supprimer une borne avec des réservations en cours ou acceptées.",
      );
    }

    // Soft delete
    await this.prisma.chargingStation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        statusMessage: "Deleted",
      },
    });

    return { message: "Station deleted successfully" };
  }

  /**
   * Valide une station (Admin).
   * La rend active et visible publiquement.
   */
  async validate(id: number) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    return this.prisma.chargingStation.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Désactive une station avec un message d'explication.
   */
  async deactivate(id: number, message: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    return this.prisma.chargingStation.update({
      where: { id },
      data: {
        isActive: false,
        statusMessage: message,
      },
    });
  }

  /**
   * Bascule la disponibilité immédiate (On/Off) d'une station.
   * Action propriétaire.
   */
  async toggleAvailability(id: number, userId: number) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    if (station.location.userId !== userId) {
      throw new ForbiddenException("Non autorisé");
    }

    return this.prisma.chargingStation.update({
      where: { id },
      data: { isAvailable: !station.isAvailable },
    });
  }

  /**
   * Ajoute/Retire un favori.
   * Si existe déjà -> Supprime. Sinon -> Crée.
   */
  async toggleFavorite(stationId: number, userId: number) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id: stationId },
    });

    if (!station || station.deletedAt) {
      throw new NotFoundException("Station introuvable");
    }

    const existingFavorite = await this.prisma.favoriteStation.findUnique({
      where: {
        userId_stationId: {
          userId,
          stationId,
        },
      },
    });

    if (existingFavorite) {
      await this.prisma.favoriteStation.delete({
        where: {
          userId_stationId: {
            userId,
            stationId,
          },
        },
      });
      return { favorited: false };
    } else {
      await this.prisma.favoriteStation.create({
        data: {
          userId,
          stationId,
        },
      });
      return { favorited: true };
    }
  }

  /**
   * Récupère les favoris d'un utilisateur.
   * Formate les données (Decimal -> Number).
   */
  async getFavorites(userId: number) {
    const favorites = await this.prisma.favoriteStation.findMany({
      where: { userId },
      include: {
        station: {
          include: {
            location: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
            pricing: {
              where: { validTo: null },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((fav) => ({
      ...fav.station,
      favoritedAt: fav.createdAt,
    }));
  }
}
