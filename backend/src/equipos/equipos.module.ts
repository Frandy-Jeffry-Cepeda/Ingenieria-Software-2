import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from './equipo.entity';
import { Mantenimiento } from './mantenimiento.entity';
import { Movimiento } from './movimiento.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { OrdenMantenimiento } from '../mantenimientos/orden-mantenimiento.entity';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { MailtrapModule } from '../integraciones/mailtrap/mailtrap.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipo, Mantenimiento, Movimiento, Usuario, OrdenMantenimiento]),
    MailtrapModule,
  ],
  controllers: [EquiposController],
  providers: [EquiposService],
})
export class EquiposModule {}
