import { buildSearchFilter } from './../utils/prisma-search.util';
import { PrismaService } from 'src/prisma.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly PrismaService: PrismaService) {}

  //create
  async create(createNoteDto: CreateNoteDto, userId: number) {
    this.logger.log(`Notes created ${createNoteDto.title} successfully`);
    const notes = await this.PrismaService.note.create({
      data: {
        title: createNoteDto.title,
        content: createNoteDto.content,
        userId: userId,
        folderId: createNoteDto.folderId,
      },
    });

    return notes;
  }

  async findAll(
    { skip, take, search }: { skip: number; take: number; search?: string },
    userId: number,
  ) {
    const notes = await this.PrismaService.note.findMany({
      skip,
      take,
      where: {
        userId,
        ...buildSearchFilter(search, ['title', 'content']),
      },
    });
    return notes;
  }

  async findOne(id: number, userId: number) {
    const note = await this.PrismaService.note.findUnique({
      where: {
        id,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    const note = await this.PrismaService.note.findUnique({
      where: {
        id,
      },
    });

    if (!note) {
      throw new NotFoundException();
    }

    if (note?.userId !== userId) {
      throw new ForbiddenException('Not Allowed');
    }

    const updated = await this.PrismaService.note.update({
      where: {
        id,
      },
      data: updateNoteDto,
    });

    return updated;
  }

  async remove(id: number, userId: number) {
    const note = await this.PrismaService.note.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    await this.PrismaService.note.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Note deleted successfully',
    };
  }
}
