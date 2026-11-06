import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AvisoMantenimiento {
  numeroSerie: string;
  descripcion: string;
  fecha: string;
  tecnico: string;
}

@Injectable()
export class MailtrapService {
  private readonly logger = new Logger(MailtrapService.name);

  constructor(private configService: ConfigService) {}

  // Envía el aviso al buzón de pruebas de Mailtrap sin usar credenciales en el código.
  async enviarAvisoMantenimiento(datos: AvisoMantenimiento) {
    const token = this.configService.get<string>('MAILTRAP_API_TOKEN');
    const inboxId = this.configService.get<string>('MAILTRAP_INBOX_ID');

    if (!token || !inboxId) {
      this.logger.warn('Mailtrap no está configurado. No se envió el aviso de mantenimiento.');
      return { enviado: false, motivo: 'Mailtrap no está configurado' };
    }

    const correo = {
      from: {
        email: this.configService.get<string>('MAILTRAP_FROM_EMAIL') || 'inventario@ejemplo.com',
        name: this.configService.get<string>('MAILTRAP_FROM_NAME') || 'Inventario TI',
      },
      to: [
        {
          email: this.configService.get<string>('MAILTRAP_TO_EMAIL') || 'pruebas@ejemplo.com',
        },
      ],
      subject: `Equipo enviado a mantenimiento: ${datos.numeroSerie}`,
      text: [
        'Se registró una nueva orden de mantenimiento.',
        `Equipo: ${datos.numeroSerie}`,
        `Descripción: ${datos.descripcion}`,
        `Fecha programada: ${datos.fecha}`,
        `Técnico responsable: ${datos.tecnico}`,
      ].join('\n'),
    };

    try {
      const respuesta = await fetch(
        `https://sandbox.api.mailtrap.io/api/send/${inboxId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(correo),
        },
      );

      if (!respuesta.ok) {
        this.logger.error(`Mailtrap respondió con el estado ${respuesta.status}.`);
        return { enviado: false, motivo: 'Mailtrap no pudo enviar el aviso' };
      }

      return { enviado: true };
    } catch (error) {
      this.logger.error(`No fue posible conectar con Mailtrap: ${String(error)}`);
      return { enviado: false, motivo: 'No fue posible conectar con Mailtrap' };
    }
  }
}

// (A J A D)
