import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateSourceDto {
  @ApiProperty({ example: 'Website' })
  @IsString()
  sourceName: string;

  @ApiProperty({ example: 'website' })
  @IsString()
  sourceCode: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sequenceOrder?: number;
}
