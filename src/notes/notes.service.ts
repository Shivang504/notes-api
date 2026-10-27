import { Cron } from '@nestjs/schedule';
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
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly PrismaService: PrismaService) {}
  //create
  async create(createNoteDto: CreateNoteDto, userId: number) {
    if (createNoteDto.folderId) {
      const folder = await this.PrismaService.folder.findFirst({
        where: {
          id: createNoteDto.folderId,
          userId: userId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const notes = await this.PrismaService.note.create({
      data: {
        title: createNoteDto.title,
        content: createNoteDto.content,
        userId: userId,
        folderId: createNoteDto.folderId,
      },
    });

    this.logger.log(`Notes created ${createNoteDto.title} successfully`);

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
        deletedAt: null,
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
    // Find the note only if it belongs to the logged-in user
    // and has not already been soft deleted.
    const note = await this.PrismaService.note.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Soft delete:
    // The note is not removed from the database.
    // We only set deletedAt to the current date/time.
    await this.PrismaService.note.update({
      where: {
        id: note.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // -------------------------------------------------------
    // HARD DELETE (For future reference)
    // -------------------------------------------------------
    // Hard delete permanently removes the note from the database.
    // Use this only if you intentionally want to permanently
    // remove the record.
    //
    // await this.PrismaService.note.delete({
    //   where: {
    //     id: note.id,
    //   },
    // });
    // -------------------------------------------------------

    return {
      message: 'Note deleted successfully',
    };
  }
  // Runs every day at 2:00 AM
  @Cron('0 2 * * *')
  async deleteOldNotes() {
    const thirtyDaysAgo = new Date();

    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.PrismaService.note.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(
      `Permanently deleted ${result.count} notes older than 30 days`,
    );
  }
}
