import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MailService } from "../mail/mail.service";
import { ContactMessageDto } from "./dto/contact-message.dto";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private mailService: MailService) {}

  @Post()
  @ApiOperation({ summary: "Envoyer un message de contact" })
  @ApiResponse({ status: 201, description: "Message envoyé avec succès." })
  async sendMessage(@Body() dto: ContactMessageDto) {
    await this.mailService.sendContactMessage(dto);
    return { message: "Message envoyé avec succès" };
  }
}
