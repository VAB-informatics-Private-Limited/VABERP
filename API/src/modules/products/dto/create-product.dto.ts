import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  subcategoryId?: number;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ example: 'IPH15PRO' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ example: 'Latest Apple smartphone with A17 chip' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'PCS' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ example: 134900 })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiPropertyOptional({ example: '8517' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
