import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowupOutcomeDto {
  @ApiProperty({
    example: 'sale_closed',
    enum: ['sale_closed', 'not_interested', 'follow_up', 'not_available'],
  })
  @IsString()
  @IsIn(['sale_closed', 'not_interested', 'follow_up', 'not_available'])
  outcomeStatus: string;

  @ApiPropertyOptional({ example: 'Customer agreed to purchase' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;
}
