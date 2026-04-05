import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { ApiKey } from '../entities/ApiKey';
import { CryptoUtils } from '../utils/cryptography';

declare global {
  namespace Express {
    interface Request {
      apiKeyId?: string;
      projectId?: string;
    }
  }
}

export class AuthMiddleware {
  /**
   * Express middleware to validate API key from headers
   * Expects: Authorization: Bearer <api_key>
   */
  static async validateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Missing or invalid authorization header',
          code: 'MISSING_API_KEY'
        });
      }

      const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

      const apiKeyRepository = AppDataSource.getRepository(ApiKey);
      
      // Find all active API keys for this key value (compare hashes)
      const hashedKey = CryptoUtils.hashApiKey(apiKey);
      const storedKey = await apiKeyRepository.findOne({
        where: {
          keyHash: hashedKey,
          isActive: true,
          revokedAt: null
        },
        relations: ['project']
      });

      if (!storedKey) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        });
      }

      // Update last used timestamp
      storedKey.lastUsed = new Date().toISOString();
      await apiKeyRepository.save(storedKey);

      // Attach to request
      req.apiKeyId = storedKey.id;
      req.projectId = storedKey.project.id;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ 
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    }
  }

  /**
   * Optional: Make specific routes require authentication
   */
  static requireAuth = this.validateApiKey;
}