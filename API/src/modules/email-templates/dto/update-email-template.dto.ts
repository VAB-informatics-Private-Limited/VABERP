import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmailTemplateDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiProperty({ required: false, enum: ['quotation', 'invoice', 'follow_up', 'welcome', 'other'] })
  @IsOptional()
  @IsString()
  @IsIn(['quotation', 'invoice', 'follow_up', 'welcome', 'other'])
  templateType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
