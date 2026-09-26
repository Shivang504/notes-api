import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { FolderService } from './folder.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateFolderDto } from './dto/create-folder.dto';

@Controller('/api/folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createFolderDto: CreateFolderDto,
    // send user id from auth guard to service
    @Request() req: { user: { sub: number } },
  ) {
    return this.folderService.create(createFolderDto, req?.user?.sub);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.folderService.findAll(req.user.sub);
  }
}
