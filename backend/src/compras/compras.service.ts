import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Compra } from './compra.entity';
import { Equipo } from '../equipos/equipo.entity';
import { CrearCompraDto } from './compras.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra) private comprasRepo: Repository<Compra>,
    private dataSource: DataSource,
  ) {}

  async crear(dto: CrearCompraDto, tecnicoId: number) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const compra = await manager.save(Compra, {
          proveedor: dto.proveedor,
          numeroFactura: dto.numeroFactura,
          fechaCompra: dto.fechaCompra,
          costoTotal: dto.costoTotal,
          registradaPor: tecnicoId,
        });
        const equipos = await manager.save(
          Equipo,
          dto.equipos.map((equipo) => ({ ...equipo, compraId: compra.id })),
        );
        return { ...compra, equipos };
      });
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un equipo con uno de los números de serie indicados');
      }
      throw error;
    }
  }

  listar() {
    return this.comprasRepo.find({ order: { id: 'DESC' } });
  }

  async detalle(id: number) {
    const compra = await this.comprasRepo.findOne({
      where: { id },
      relations: { equipos: true },
    });
    if (!compra) {
      throw new NotFoundException('Compra no encontrada');
    }
    return compra;
  }
}
