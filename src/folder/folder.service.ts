import { Injectable } from '@nestjs/common';
import { CreateFolderDto } from './dto/create-folder.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class FolderService {
  constructor(private readonly PrismaService: PrismaService) {}

  async create(createFolderDto: CreateFolderDto, userId: number) {
    return this.PrismaService.folder.create({
      data: {
        name: createFolderDto.name,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.PrismaService.folder.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });
  }
}
