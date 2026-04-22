import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMapDto {
  @ApiProperty()
  @IsInt()
  sparePartId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  defaultQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpsertMapBulkDto {
  @ApiProperty({ type: [UpsertMapDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertMapDto)
  items: UpsertMapDto[];
}
