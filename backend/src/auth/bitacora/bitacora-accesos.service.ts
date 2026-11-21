import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAcceso, ResultadoAcceso } from './registro-acceso.entity';

export type MotivoRechazo = 'cuenta_inexistente' | 'cuenta_inactiva' | 'rol_sin_acceso' | 'contrasena_incorrecta';

export interface EventoAcceso {
  email: string;
  resultado: ResultadoAcceso;
  usuarioId?: number | null;
  motivo?: MotivoRechazo | null;
  ip?: string | null;
}

@Injectable()
export class BitacoraAccesosService {
  private readonly logger = new Logger(BitacoraAccesosService.name);

  constructor(@InjectRepository(RegistroAcceso) private readonly repo: Repository<RegistroAcceso>) {}

  /**
   * Guarda un intento de acceso. Si la base falla, el error se informa en el log
   * del servidor y no se propaga: el inicio de sesión no depende de la bitácora (BA-08).
   */
  async registrar(evento: EventoAcceso): Promise<void> {
    try {
      await this.repo.insert({
        email: String(evento.email ?? '').trim().toLowerCase().slice(0, 150),
        resultado: evento.resultado,
        motivo: evento.motivo ?? null,
        usuario: evento.usuarioId ? { id: evento.usuarioId } : null,
        ip: evento.ip ? evento.ip.slice(0, 64) : null,
      });
    } catch (error) {
      this.logger.error(`No se pudo guardar el registro de acceso: ${(error as Error).message}`);
    }
  }

  /** Últimos registros, del más reciente al más antiguo. */
  listar(limite = 100) {
    const tope = Math.min(Math.max(Math.trunc(limite) || 100, 1), 500);
    return this.repo.find({
      relations: { usuario: true },
      order: { fecha: 'DESC', id: 'DESC' },
      take: tope,
    });
  }
}
