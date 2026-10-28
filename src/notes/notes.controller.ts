import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ShareNoteDto } from './dto/share-note.dto';

//api/notes
@Controller('/api/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createNoteDto: CreateNoteDto,
    // send user id from auth guard to service
    @Request() req: { user: { sub: number } },
  ) {
    return this.notesService.create(createNoteDto, req?.user?.sub);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Request() req: { user: { sub: number } },
    @Query('take', new DefaultValuePipe(10), ParseIntPipe)
    take: number,

    @Query('skip', new DefaultValuePipe(0), ParseIntPipe)
    skip: number,

    @Query('search') search?: string,
  ) {
    return this.notesService.findAll(
      { take: take || 10, skip: skip || 0, search },
      req?.user?.sub,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { sub: number } }) {
    return this.notesService.findOne(+id, req.user?.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notesService.update(+id, updateNoteDto, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notesService.remove(+id, req?.user?.sub);
  }

  @UseGuards(AuthGuard)
  @Get('shared/with-me')
  getSharedWithMe(@Request() req: { user: { sub: number } }) {
    return this.notesService.getSharedWithMe(req.user.sub);
  }

  // POST /api/notes/:id/share
  @UseGuards(AuthGuard)
  @Post(':id/share')
  shareNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() shareNoteDto: ShareNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notesService.shareNote(id, req.user.sub, shareNoteDto);
  }

  // DELETE /api/notes/:id/share/:targetUserId
  @UseGuards(AuthGuard)
  @Delete(':id/share/:targetUserId')
  revokeShare(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notesService.revokeShare(id, req.user.sub, targetUserId);
  }
}
