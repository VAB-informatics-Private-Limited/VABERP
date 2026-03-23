import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStageDto {
  @ApiPropertyOptional({ example: 'in_progress', enum: ['pending', 'in_progress', 'completed', 'skipped'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  assignedTo?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @ApiPropertyOptional({ example: '2026-02-24T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-02-24T11:30:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Completed with minor adjustments' })
  @IsOptional()
  @IsString()
  notes?: string;
}
