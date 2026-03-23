import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateInterestStatusDto {
  @ApiProperty({ example: 'New Enquiry' })
  @IsString()
  statusName: string;

  @ApiProperty({ example: 'NEW' })
  @IsString()
  statusCode: string;

  @ApiPropertyOptional({ example: '#1890ff' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sequenceOrder?: number;
}
