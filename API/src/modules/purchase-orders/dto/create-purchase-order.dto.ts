import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rawMaterialId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  indentItemId?: number;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  materialRequestId?: number;

  @ApiProperty()
  @IsString()
  supplierName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDelivery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
