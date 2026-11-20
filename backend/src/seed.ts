import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { Usuario, RolUsuario } from './usuarios/usuario.entity';
import { Compra } from './compras/compra.entity';
import { Equipo, EstadoEquipo } from './equipos/equipo.entity';
import { Movimiento, TipoMovimiento, MotivoSalida } from './equipos/movimiento.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const usuarios = dataSource.getRepository(Usuario);
  const compras = dataSource.getRepository(Compra);
  const equipos = dataSource.getRepository(Equipo);
  const movimientos = dataSource.getRepository(Movimiento);

 const tecnicos = await usuarios.countBy({
  rol: RolUsuario.TECNICO,
});

// Si ya existen técnicos, no ejecutar el seed
if (tecnicos > 0) {
  await app.close();
  return;
}

// Validar la contraseña de inicialización
const seedPassword = process.env.SEED_ADMIN_PASSWORD;

if (
  !seedPassword ||
  seedPassword.length < 12 ||
  Buffer.byteLength(seedPassword, 'utf8') > 72
) {
  await app.close();

  throw new Error(
    'Para inicializar usuarios, configura SEED_ADMIN_PASSWORD ' +
    'con al menos 12 caracteres y un máximo de 72 bytes.',
  );
}

// Crear el usuario inicial con una contraseña segura
const admin = await usuarios.save({
  nombre: 'Admin TI',
  email: 'admin@ti.com',
  departamento: 'TI',
  rol: RolUsuario.TECNICO,
  passwordHash: bcrypt.hashSync(seedPassword, 12),
});

  const [ana, luis, maria] = await usuarios.save([
    { nombre: 'Ana Pérez', email: 'ana.perez@empresa.com', departamento: 'Contabilidad' },
    { nombre: 'Luis García', email: 'luis.garcia@empresa.com', departamento: 'Ventas' },
    { nombre: 'María Rodríguez', email: 'maria.rodriguez@empresa.com', departamento: 'Recursos Humanos' },
    { nombre: 'Pedro Sánchez', email: 'pedro.sanchez@empresa.com', departamento: 'Operaciones' },
  ]);

  const compra1 = await compras.save({
    proveedor: 'Compudom SRL',
    numeroFactura: 'FAC-0001',
    fechaCompra: '2026-07-15',
    costoTotal: 385000,
    registradaPor: admin.id,
  });

  const compra2 = await compras.save({
    proveedor: 'Tecnología Global',
    numeroFactura: 'FAC-0034',
    fechaCompra: '2026-08-10',
    costoTotal: 152500,
    registradaPor: admin.id,
  });

  const [lap1, lap2, , mon1, mon2] = await equipos.save([
    { compraId: compra1.id, tipo: 'laptop', marca: 'Dell', modelo: 'Latitude 5440', numeroSerie: 'DL-5440-001' },
    { compraId: compra1.id, tipo: 'laptop', marca: 'Dell', modelo: 'Latitude 5440', numeroSerie: 'DL-5440-002' },
    { compraId: compra1.id, tipo: 'laptop', marca: 'HP', modelo: 'ProBook 450', numeroSerie: 'HP-450-101' },
    { compraId: compra1.id, tipo: 'monitor', marca: 'Samsung', modelo: 'S24C310', numeroSerie: 'SM-S24-301' },
    { compraId: compra1.id, tipo: 'monitor', marca: 'LG', modelo: '20MK400', numeroSerie: 'LG-20MK-777' },
    { compraId: compra2.id, tipo: 'impresora', marca: 'Epson', modelo: 'EcoTank L3250', numeroSerie: 'EP-L3250-050' },
    { compraId: compra2.id, tipo: 'laptop', marca: 'Lenovo', modelo: 'ThinkPad E14', numeroSerie: 'LN-E14-220' },
    { compraId: compra2.id, tipo: 'monitor', marca: 'Samsung', modelo: 'S27C390', numeroSerie: 'SM-S27-410' },
  ]);

  await movimientos.save({
    equipoId: lap1.id,
    tipo: TipoMovimiento.ENTREGA,
    usuarioId: ana.id,
    tecnicoId: admin.id,
    observacion: 'Laptop nueva para contabilidad',
  });
  await equipos.update(lap1.id, { estado: EstadoEquipo.ENTREGADO, usuarioActualId: ana.id });

  await movimientos.save({
    equipoId: lap2.id,
    tipo: TipoMovimiento.ENTREGA,
    usuarioId: luis.id,
    tecnicoId: admin.id,
  });
  await equipos.update(lap2.id, { estado: EstadoEquipo.ENTREGADO, usuarioActualId: luis.id });

  // este monitor se entregó y luego se devolvió: queda disponible con historial
  await movimientos.save({
    equipoId: mon1.id,
    tipo: TipoMovimiento.ENTREGA,
    usuarioId: maria.id,
    tecnicoId: admin.id,
  });
  await movimientos.save({
    equipoId: mon1.id,
    tipo: TipoMovimiento.DEVOLUCION,
    usuarioId: maria.id,
    tecnicoId: admin.id,
    observacion: 'Cambio de puesto, ya no lo necesita',
  });

  await movimientos.save({
    equipoId: mon2.id,
    tipo: TipoMovimiento.SALIDA,
    tecnicoId: admin.id,
    motivoSalida: MotivoSalida.OBSOLESCENCIA,
    observacion: 'Modelo descontinuado, sin repuestos',
  });
  await equipos.update(mon2.id, { estado: EstadoEquipo.DE_BAJA });

  console.log('Datos iniciales creados correctamente.');
  await app.close();
}

seed();
