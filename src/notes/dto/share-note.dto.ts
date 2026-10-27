import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum SharePermission {
  READ = 'READ',
  EDIT = 'EDIT',
}

export class ShareNoteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsEnum(SharePermission)
  permission?: SharePermission = SharePermission.READ;
}
