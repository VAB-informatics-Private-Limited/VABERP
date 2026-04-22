import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MachineSpareItemDto {
  @ApiProperty()
  @IsInt()
  sparePartId: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class SaveMachineSparesDto {
  @ApiProperty({ type: [MachineSpareItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineSpareItemDto)
  items: MachineSpareItemDto[];
}

export class SaveAsTemplateDto {
  @ApiProperty({ enum: ['model', 'category'] })
  @IsString()
  scope: 'model' | 'category';
}
