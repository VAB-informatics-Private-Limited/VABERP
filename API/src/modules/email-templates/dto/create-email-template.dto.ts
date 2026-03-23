import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmailTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ enum: ['quotation', 'invoice', 'follow_up', 'welcome', 'other'] })
  @IsString()
  @IsIn(['quotation', 'invoice', 'follow_up', 'welcome', 'other'])
  templateType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}
