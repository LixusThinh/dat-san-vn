// ============================================================
// DatSanVN — Create Venue DTO
// Validation rules for creating a new venue
// ============================================================

import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  district: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
