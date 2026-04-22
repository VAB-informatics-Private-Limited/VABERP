import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class SuggestSparesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
