import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// Submitted by an enterprise whose status is 'approved_pending_completion'
// (super-admin has approved their lightweight signup). On success the
// enterprise transitions to 'active'.
export class CompleteRegistrationDto {
  @ApiProperty({ example: '123 Business Street, Building A' })
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

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'https://vabinformatics.com' })
  @IsString()
  @IsOptional()
  website?: string;
}
