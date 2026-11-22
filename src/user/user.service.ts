import { Injectable } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
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

  // Always USER — role is never taken from the client
  async createUser(registerDto: RegisterDto) {
    return await this.prismaService.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        role: Role.USER,
      },
    });
  }

  async findAll() {
    return await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { id: 'asc' },
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
