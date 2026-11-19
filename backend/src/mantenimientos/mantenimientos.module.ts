import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenMantenimiento } from './orden-mantenimiento.entity';
import { Equipo } from '../equipos/equipo.entity';
import { Movimiento } from '../equipos/movimiento.entity';
import { MantenimientosController } from './mantenimientos.controller';
import { MantenimientosService } from './mantenimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenMantenimiento, Equipo, Movimiento])],
  controllers: [MantenimientosController],
  providers: [MantenimientosService],
})
export class MantenimientosModule {}