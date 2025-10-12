import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ContactMessageDto {
  @ApiProperty({ example: "John Doe", description: "Nom de l'expéditeur" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: "john@example.com",
    description: "Email de l'expéditeur",
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Demande d'info", description: "Sujet du message" })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    example: "Bonjour, j'aimerais savoir...",
    description: "Contenu du message",
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
