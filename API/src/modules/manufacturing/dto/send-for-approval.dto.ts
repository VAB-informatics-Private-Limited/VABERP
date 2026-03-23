import { IsOptional, IsNumber, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateItemDto {
  @IsNumber()
  itemId: number;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class SendForApprovalDto {
  @IsOptional()
  @IsNumber()
  priority?: number; // 0=normal, 1=high, 2=urgent

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  expectedDelivery?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items?: UpdateItemDto[];
}

export class UpdateManufacturingDetailsDto {
  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  expectedDelivery?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items?: UpdateItemDto[];
}
