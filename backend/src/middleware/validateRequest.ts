// backend/src/middleware/validateRequest.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar que los parámetros de query sean strings
 * Previene inyección NoSQL cuando se espera string pero se recibe objeto
 */
export const validateQueryStrings = (...paramNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const param of paramNames) {
      const value = req.query[param];
      
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({
          error: 'Invalid parameter type',
          message: `El parámetro '${param}' debe ser una cadena de texto`,
          param
        });
      }
    }
    next();
  };
};

/**
 * Middleware para validar que los parámetros de body sean del tipo correcto
 */
export const validateBodyTypes = (schema: Record<string, 'string' | 'number' | 'boolean' | 'object'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, expectedType] of Object.entries(schema)) {
      const value = req.body[key];
      
      if (value !== undefined && typeof value !== expectedType) {
        return res.status(400).json({
          error: 'Invalid body parameter type',
          message: `El campo '${key}' debe ser de tipo ${expectedType}`,
          field: key,
          expectedType,
          receivedType: typeof value
        });
      }
    }
    next();
  };
};

/**
 * Sanitiza strings eliminando caracteres peligrosos
 */
export const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') return '';
  return String(str)
    .replace(/[\r\n\t\u0000]/g, '') // Eliminar caracteres de control
    .trim()
    .slice(0, 500); // Limitar longitud máxima
};

/**
 * Middleware para prevenir NoSQL injection bloqueando objetos en query params
 * Detecta intentos de inyección como: ?field[$ne]=value
 */
export const preventNoSQLInjection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar query params
    for (const key in req.query) {
      const value = req.query[key];
      
      // Bloquear si el valor es un objeto (posible inyección)
      if (typeof value === 'object' && value !== null) {
        return res.status(400).json({ 
          message: 'Parámetros de consulta inválidos detectados',
          code: 'invalid_query_params'
        });
      }
      
      // Bloquear si la clave contiene $ (operador MongoDB)
      if (key.includes('$') || key.includes('.')) {
        return res.status(400).json({ 
          message: 'Parámetros de consulta inválidos detectados',
          code: 'invalid_query_params'
        });
      }
    }
    
    // Verificar body params
    if (req.body && typeof req.body === 'object') {
      const checkObject = (obj: any): boolean => {
        for (const key in obj) {
          // Bloquear claves con $ o . en cualquier nivel
          if (key.includes('$') || key.includes('.')) {
            return false;
          }
          
          // Revisar recursivamente objetos anidados
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            if (!checkObject(obj[key])) {
              return false;
            }
          }
        }
        return true;
      };
      
      if (!checkObject(req.body)) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos detectados',
          code: 'invalid_body_params'
        });
      }
    }
    
    next();
  };
};
