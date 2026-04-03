import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTeamUpdateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;
}
