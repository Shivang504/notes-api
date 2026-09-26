import { Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async getUserByEmail(email: string) {
    return await this.prismaService.user.findFirst({
      where: { email },
    });
  }

  async createUser(registerDto: RegisterDto) {
    return await this.prismaService.user.create({
      data: registerDto,
    });
  }

  async update(
    id: number,
    data: { otp?: string | null; otpExpiredAt?: Date | null },
  ) {
    return await this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
