// ============================================================
// DatSanVN — Query Venue DTO
// Filter + pagination for listing venues
// ============================================================

import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import type { SportType } from '@dat-san-vn/types';

export class QueryVenueDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  /**
   * Filter by sportType — trả về venues có ít nhất 1 field thuộc sportType này.
   */
  @IsOptional()
  @IsString()
  sportType?: SportType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
