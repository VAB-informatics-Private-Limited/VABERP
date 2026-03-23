import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RegisterEnterpriseDto {
  @ApiProperty({ example: 'VAB Informatics Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'contact@vabinformatics.com' })
  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  businessMobile: string;

  @ApiProperty({ example: '123 Business Street' })
  @IsString()
  @IsNotEmpty()
  businessAddress: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  businessState: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  businessCity: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  pincode: string;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'U72200MH2020PTC123456' })
  @IsString()
  @IsOptional()
  cinNumber?: string;
}
