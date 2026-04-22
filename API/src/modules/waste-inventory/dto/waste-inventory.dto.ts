import { IsString, IsOptional, IsNotEmpty, MaxLength, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  classification?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiresManifest?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxStorageDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  handlingNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  classification?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiresManifest?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxStorageDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  handlingNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateSourceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateSourceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateWasteInventoryDto {
  @ApiProperty()
  @IsNumber()
  categoryId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sourceId?: number;

  @ApiProperty()
  @IsNumber()
  quantityGenerated: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  storageDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryAlertDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  storageLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manifestNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hazardLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  force?: any;
}

export class UpdateWasteInventoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sourceId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  quantityGenerated?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  storageDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryAlertDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  storageLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manifestNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hazardLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class QuarantineDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class WriteOffDto {
  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
