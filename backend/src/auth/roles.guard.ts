import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';
import { ROLES_KEY } from './roles.decorator';

interface RequestWithUser { user?: { id?: number } }

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const id = request.user?.id;
    if (!id) throw new ForbiddenException('No tienes permisos para realizar esta operación');
    const usuario = await this.usuariosRepo.findOne({ where: { id }, select: { id: true, rol: true, activo: true } });
    if (!usuario || !usuario.activo || !roles.includes(usuario.rol)) throw new ForbiddenException('No tienes permisos para realizar esta operación');
    return true;
  }
}
