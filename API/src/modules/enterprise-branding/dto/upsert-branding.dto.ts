import { IsOptional, IsString, IsInt, Min, Max, Matches } from 'class-validator';

export class UpsertBrandingDto {
  @IsOptional() @IsString()
  appName?: string;

  @IsOptional() @IsString()
  tagline?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  logoSmallUrl?: string;

  @IsOptional() @IsString()
  faviconUrl?: string;

  @IsOptional() @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, { message: 'primaryColor must be a valid hex color' })
  primaryColor?: string;

  @IsOptional() @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, { message: 'secondaryColor must be a valid hex color' })
  secondaryColor?: string;

  @IsOptional() @IsString()
  accentColor?: string;

  @IsOptional() @IsString()
  colorBgLayout?: string;

  @IsOptional() @IsString()
  loginBgImageUrl?: string;

  @IsOptional() @IsString()
  fontFamily?: string;

  @IsOptional() @IsInt() @Min(0) @Max(24)
  borderRadius?: number;

  @IsOptional() @IsString()
  sidebarBgColor?: string;

  @IsOptional() @IsString()
  sidebarTextColor?: string;

  @IsOptional() @IsString()
  changeNotes?: string;
}
