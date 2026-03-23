import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateIndentFromMrDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
