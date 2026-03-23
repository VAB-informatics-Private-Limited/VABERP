import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 'IN', enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] })
  @IsString()
  @IsIn(['IN', 'OUT', 'ADJUSTMENT', 'RETURN'])
  transactionType: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'PURCHASE', enum: ['PURCHASE', 'SALE', 'MANUFACTURING', 'MANUAL'] })
  @IsOptional()
  @IsString()
  @IsIn(['PURCHASE', 'SALE', 'MANUFACTURING', 'MANUAL'])
  referenceType?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  referenceId?: number;

  @ApiPropertyOptional({ example: 'Stock received from supplier' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
