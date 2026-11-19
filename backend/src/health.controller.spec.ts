import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responde ok cuando la base de datos contesta', async () => {
    const ds = { query: jest.fn(async () => [{ '?column?': 1 }]) } as unknown as DataSource;
    await expect(new HealthController(ds).check()).resolves.toMatchObject({ status: 'ok', db: 'ok' });
  });
  it('responde degraded cuando la base de datos no contesta', async () => {
    const ds = { query: jest.fn(async () => { throw new Error('sin base'); }) } as unknown as DataSource;
    await expect(new HealthController(ds).check()).resolves.toMatchObject({ status: 'degraded', db: 'error' });
  });
});
