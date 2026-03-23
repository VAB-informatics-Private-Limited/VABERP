import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSourceDto {
  @ApiPropertyOptional({ example: 'Website' })
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiPropertyOptional({ example: 'website' })
  @IsOptional()
  @IsString()
  sourceCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sequenceOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
