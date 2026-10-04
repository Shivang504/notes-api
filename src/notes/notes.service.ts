import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly PrismaService: PrismaService) {}

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
