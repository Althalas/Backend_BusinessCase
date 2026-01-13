import { ApiProperty } from "@nestjs/swagger";

/**
 * Informations utilisateur incluses dans les avis.
 */
export class ReviewUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false, nullable: true })
  avatarUrl?: string | null;
}

/**
 * Informations station incluses dans les avis.
 */
export class ReviewStationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  city?: string;
}

/**
 * DTO de réponse pour un avis.
 */
export class ReviewResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  stationId: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false, nullable: true })
  rating: number | null;

  @ApiProperty({ required: false, nullable: true })
  comment: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: () => ReviewUserDto, required: false })
  user?: ReviewUserDto;

  @ApiProperty({ type: () => ReviewStationDto, required: false })
  station?: ReviewStationDto;
}

/**
 * DTO pour les messages de confirmation.
 */
export class ReviewMessageDto {
  @ApiProperty({ example: "Review deleted" })
  message: string;
}
