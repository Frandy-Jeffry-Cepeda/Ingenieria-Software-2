import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { obtenerJwtSecret } from './auth/jwt-secret';

async function bootstrap() {
  obtenerJwtSecret(); // D-13: no arrancar sin JWT_SECRET.
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // A3 (OWASP A02): el frontend llama a /api por el mismo dominio (nginx en
  // producción, proxy de Vite en desarrollo), así que CORS queda cerrado salvo
  // que CORS_ORIGIN declare orígenes concretos separados por comas.
  const origenes = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origenes.length > 0) app.enableCors({ origin: origenes });

  // A3 (hallazgos de OWASP ZAP): cabeceras de seguridad en todas las respuestas de la API.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
