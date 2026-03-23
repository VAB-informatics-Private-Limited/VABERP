import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialRequestItemDto {
  @ApiProperty()
  @IsNumber()
  productId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rawMaterialId?: number;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty()
  @IsNumber()
  quantityRequested: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaterialRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  jobCardId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [MaterialRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialRequestItemDto)
  items: MaterialRequestItemDto[];
}

export class ApproveMaterialRequestDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  items: { itemId: number; quantityApproved: number; status: string; notes?: string }[];
}
