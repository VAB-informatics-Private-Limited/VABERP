import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['new', 'contacted', 'interested', 'not_interested', 'follow_up', 'converted', 'lost'])
  status: string;
}
