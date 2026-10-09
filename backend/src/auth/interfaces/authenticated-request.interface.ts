
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    nombre: string;
  };
} //Esta interfaz supone que req.user.id es numerico y que req.user.name esxiste, si el identificador real es una cadena, cabia id: number por id: string. (A.J.A.D)