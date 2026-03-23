import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StageDto {
  @ApiProperty({ example: 'Cutting' })
  @IsString()
  stageName: string;

  @ApiPropertyOptional({ example: 'Cut raw material to size' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  assignedTo?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class JobCardMaterialDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  rawMaterialId?: number;

  @ApiProperty({ example: 'Copper Coil' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  requiredQuantity: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;
}

export class CreateJobCardDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  quotationId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  purchaseOrderId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  bomId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  stageMasterId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  assignedTo?: number;

  @ApiProperty({ example: 'Industrial Motor Assembly' })
  @IsString()
  jobName: string;

  @ApiPropertyOptional({ example: 'Assemble 5HP motor for ABC Industries' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'PCS' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: '2026-02-24' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  expectedCompletion?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ example: 'Rush order - priority customer' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: [StageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDto)
  stages?: StageDto[];

  @ApiPropertyOptional({ type: [JobCardMaterialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobCardMaterialDto)
  materials?: JobCardMaterialDto[];
}
