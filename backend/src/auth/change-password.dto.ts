
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, {
    message: 'La nueva contraseña debe tener al menos 12 caracteres.',
  })
  @MaxLength(72, {
    message: 'La nueva contraseña no debe superar los 72 caracteres.',
  })
  newPassword!: string;
}
