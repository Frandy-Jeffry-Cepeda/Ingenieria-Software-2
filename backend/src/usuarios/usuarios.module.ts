import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './usuario.entity';
import { Equipo } from '../equipos/equipo.entity';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Equipo])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
