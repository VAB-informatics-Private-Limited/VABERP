import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class UpsertPrintTemplateDto {
  @IsOptional() @IsString()
  companyName?: string;

  @IsOptional() @IsString()
  tagline?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsNumber()
  logoWidth?: number;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  gstNumber?: string;

  @IsOptional() @IsString()
  cinNumber?: string;

  @IsOptional() @IsString()
  headerAlignment?: string;

  @IsOptional() @IsString()
  headerStyle?: string;

  @IsOptional() @IsBoolean()
  showGst?: boolean;

  @IsOptional() @IsBoolean()
  showEmail?: boolean;

  @IsOptional() @IsBoolean()
  showPhone?: boolean;

  @IsOptional() @IsBoolean()
  showTagline?: boolean;

  @IsOptional() @IsBoolean()
  showLogo?: boolean;

  @IsOptional() @IsString()
  footerText?: string;

  @IsOptional() @IsBoolean()
  showFooter?: boolean;

  @IsOptional() @IsString()
  watermarkText?: string;

  @IsOptional() @IsBoolean()
  showWatermark?: boolean;

  @IsOptional() @IsString()
  changeNotes?: string;
}
