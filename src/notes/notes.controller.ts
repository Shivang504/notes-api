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
}
