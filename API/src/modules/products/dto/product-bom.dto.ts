import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductBomItemDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  rawMaterialId?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  componentProductId?: number;

  @ApiProperty({ example: 'Steel Rod 12mm' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  requiredQuantity: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpsertProductBomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ProductBomItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductBomItemDto)
  items: ProductBomItemDto[];
}
