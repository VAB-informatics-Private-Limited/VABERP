import { IsString, IsOptional, IsNotEmpty, MaxLength, IsNumber, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DisposalLineDto {
  @ApiProperty()
  @IsNumber()
  inventoryId: number;

  @ApiProperty()
  @IsNumber()
  quantityRequested: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateDisposalTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  partyId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transactionType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  disposalMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false, type: [DisposalLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisposalLineDto)
  lines?: DisposalLineDto[];
}

export class UpdateDisposalTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  partyId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transactionType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  disposalMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CompleteDisposalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  lines?: Array<{ id?: number; quantityActual?: number; rate?: number }>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
