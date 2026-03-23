import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TemplateStageDto {
  @ApiProperty({ example: 'Cutting' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cut raw material to required dimensions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  sortOrder: number;
}

export class CreateProcessTemplateDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ example: 'Standard Motor Assembly Process' })
  @IsString()
  templateName: string;

  @ApiPropertyOptional({ example: 'Standard process for assembling motors' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [TemplateStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateStageDto)
  stages: TemplateStageDto[];
}
