import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFollowupDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  enquiryId?: number;

  @ApiPropertyOptional({ example: 'Call', enum: ['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp'] })
  @IsOptional()
  @IsString()
  followupType?: string;

  @ApiPropertyOptional({ example: '2026-02-23T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  followupDate?: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  followupTime?: string;

  @ApiProperty({ example: 'Follow Up' })
  @IsString()
  interestStatus: string;

  @ApiPropertyOptional({ example: 'Discussed pricing, customer is interested' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Discussed pricing, customer is interested' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ example: '2026-02-28' })
  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;

  @ApiPropertyOptional({ example: 'Call' })
  @IsOptional()
  @IsString()
  nextFollowupType?: string;
}
