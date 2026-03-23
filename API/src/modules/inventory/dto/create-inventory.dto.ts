import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  currentStock?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  reservedStock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  maxStockLevel?: number;

  @ApiPropertyOptional({ example: 'Warehouse A, Shelf 3' })
  @IsOptional()
  @IsString()
  warehouseLocation?: string;
}
