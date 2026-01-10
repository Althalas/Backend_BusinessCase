import { IsString, MinLength, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    example: "oldPassword123!",
    description: "Mot de passe actuel",
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: "newPassword456!",
    description: "Nouveau mot de passe",
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères",
  })
  newPassword: string;
}
