import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ComprasModule } from './compras/compras.module';
import { EquiposModule } from './equipos/equipos.module';
import { HealthController } from './health.controller';
import { MantenimientosModule } from './mantenimientos/mantenimientos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // En Coolify/producción basta con pasar DATABASE_URL; en local se usan las DB_*
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASS || 'postgres',
            database: process.env.DB_NAME || 'inventario_ti',
          }),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
      autoLoadEntities: true,
    }),
    AuthModule,
    UsuariosModule,
    ComprasModule,
    EquiposModule,
    MantenimientosModule,
  ],
  controllers: [HealthController],
})


export class AppModule {}
