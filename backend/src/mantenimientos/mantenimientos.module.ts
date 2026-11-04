import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenMantenimiento } from './orden-mantenimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenMantenimiento])],
  controllers: [],
  providers: [],
})
export class MantenimientosModule {}

