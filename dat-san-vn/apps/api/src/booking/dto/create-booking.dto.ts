import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @IsUUID()
  @IsNotEmpty()
  timeSlotId: string;

  @IsString()
  @IsOptional()
  note?: string;
}
