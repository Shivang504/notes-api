import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserService } from './user.service';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Super admin only — list every user
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.userService.findAll();
  }
}
