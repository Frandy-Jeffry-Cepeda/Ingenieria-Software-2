import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from './compra.entity';
import { Equipo } from '../equipos/equipo.entity';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, Equipo])],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
