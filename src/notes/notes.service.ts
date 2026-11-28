import { Cron } from '@nestjs/schedule';
import { buildSearchFilter } from './../utils/prisma-search.util';
import { PrismaService } from 'src/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ShareNoteDto, SharePermission } from './dto/share-note.dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly PrismaService: PrismaService) {}

  // Create note with activity log in a transaction
  async create(createNoteDto: CreateNoteDto, userId: number) {
    return await this.PrismaService.$transaction(async (tx) => {
      // 1. If folderId is provided, check if it belongs to the user
      if (createNoteDto.folderId) {
        const folder = await tx.folder.findFirst({
          where: { id: createNoteDto.folderId, userId },
        });
        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
      }

      // 2. Create the note
      const note = await tx.note.create({
        data: {
          title: createNoteDto.title,
          content: createNoteDto.content,
          userId: userId,
          folderId: createNoteDto.folderId,
        },
      });

      // 3. Record Activity Log
      await tx.activityLog.create({
        data: {
          userId: userId,
          action: 'CREATE',
          entity: 'NOTE',
          entityId: note.id,
          details: {
            title: note.title,
          },
        },
      });

      return note;
    });
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
    const note = await this.PrismaService.note.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { userId }, // Caller is the owner
          { shares: { some: { userId } } }, // Note is shared with caller
        ],
      },
      include: {
        shares: {
          where: { userId },
          select: { permission: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  // Update note with activity log in a transaction
  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    return await this.PrismaService.$transaction(async (tx) => {
      const note = await tx.note.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      const isOwner = note.userId === userId;

      if (!isOwner) {
        const editShare = await tx.noteShare.findFirst({
          where: {
            noteId: id,
            userId,
            permission: SharePermission.EDIT,
          },
        });

        if (!editShare) {
          throw new ForbiddenException('Not Allowed');
        }
      }

      const updated = await tx.note.update({
        where: {
          id,
        },
        data: updateNoteDto,
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'NOTE',
          entityId: id,
          details: {
            updatedFields: Object.keys(updateNoteDto),
          },
        },
      });

      return updated;
    });
  }

  // Soft delete note with activity log in a transaction
  async remove(id: number, userId: number) {
    return await this.PrismaService.$transaction(async (tx) => {
      const note = await tx.note.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      // Soft delete
      await tx.note.update({
        where: { id: note.id },
        data: { deletedAt: new Date() },
      });

      // Log the deletion
      await tx.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          entity: 'NOTE',
          entityId: note.id,
          details: { title: note.title },
        },
      });

      return { message: 'Note deleted successfully' };
    });
  }

  // Share a note with activity log in a transaction
  async shareNote(noteId: number, ownerId: number, dto: ShareNoteDto) {
    return await this.PrismaService.$transaction(async (tx) => {
      // 1. Verify note exists and belongs to caller
      const note = await tx.note.findFirst({
        where: { id: noteId, userId: ownerId, deletedAt: null },
      });
      if (!note) {
        throw new NotFoundException(
          'Note not found or you do not have permission to share it',
        );
      }

      // 2. Find recipient user
      const recipient = await tx.user.findUnique({
        where: { email: dto.email },
      });
      if (!recipient) {
        throw new NotFoundException(`User with email "${dto.email}" not found`);
      }
      if (recipient.id === ownerId) {
        throw new BadRequestException('You cannot share a note with yourself');
      }

      // 3. Upsert note share
      const share = await tx.noteShare.upsert({
        where: {
          noteId_userId: { noteId, userId: recipient.id },
        },
        update: { permission: dto.permission },
        create: { noteId, userId: recipient.id, permission: dto.permission },
      });

      // 4. Create Activity Log
      await tx.activityLog.create({
        data: {
          userId: ownerId,
          action: 'SHARE',
          entity: 'NOTE',
          entityId: noteId,
          details: {
            sharedWithUserEmail: recipient.email,
            sharedWithUserId: recipient.id,
            permission: dto.permission,
          },
        },
      });

      return { message: `Note shared successfully with ${dto.email}`, share };
    });
  }

  async getSharedWithMe(userId: number) {
    return this.PrismaService.noteShare.findMany({
      where: { userId },
      include: {
        note: {
          include: {
            user: { select: { id: true, name: true, email: true } }, // Owner details
          },
        },
      },
    });
  }

  // Revoke share access with activity log in a transaction
  async revokeShare(noteId: number, ownerId: number, targetUserId: number) {
    return await this.PrismaService.$transaction(async (tx) => {
      const note = await tx.note.findFirst({
        where: { id: noteId, userId: ownerId },
      });
      if (!note) {
        throw new ForbiddenException('Only the note owner can revoke sharing');
      }

      await tx.noteShare.deleteMany({
        where: { noteId, userId: targetUserId },
      });

      await tx.activityLog.create({
        data: {
          userId: ownerId,
          action: 'REVOKE_SHARE',
          entity: 'NOTE',
          entityId: noteId,
          details: { revokedUserId: targetUserId },
        },
      });

      return { message: 'Share access revoked successfully' };
    });
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
