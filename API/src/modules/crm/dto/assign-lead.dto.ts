import { IsNumber, IsNotEmpty } from 'class-validator';

export class AssignLeadDto {
  @IsNumber()
  @IsNotEmpty()
  assignedTo: number;
}
