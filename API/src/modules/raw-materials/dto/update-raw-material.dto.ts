import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateRawMaterialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPerUnit?: number;
}

export class StockAdjustmentDto {
  @ApiPropertyOptional()
  @IsString()
  type: string; // 'purchase' | 'adjustment' | 'return'

  @ApiPropertyOptional()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
