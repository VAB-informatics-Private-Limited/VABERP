import { IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BomItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rawMaterialId?: number;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty()
  @IsNumber()
  requiredQuantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateBomDto {
  @ApiProperty()
  @IsNumber()
  purchaseOrderId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [BomItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items?: BomItemDto[];
}
