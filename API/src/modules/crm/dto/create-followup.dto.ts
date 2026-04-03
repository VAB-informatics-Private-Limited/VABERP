import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateFollowupDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp'])
  followupType: string;

  @IsString()
  @IsNotEmpty()
  followupDate: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;

  @IsOptional()
  @IsString()
  nextFollowupType?: string;
}
