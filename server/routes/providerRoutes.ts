import { Router, Request, Response } from 'express';
import { providerRegistry } from '../providers/ProviderRegistry.js';
import { jobService } from '../services/jobService.js';

const router = Router();

/**
 * GET /api/voice/providers
 * Returns all voice providers status, model info, GPU availability
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const providerStatuses = await providerRegistry.getAllStatuses();
    const onlineWorker = jobService.getOnlineWorker();

    return res.json({
      providers: providerStatuses,
      gpu_worker: onlineWorker ? {
        status: onlineWorker.status,
        gpu_name: onlineWorker.gpu_name,
        vram_total_mb: onlineWorker.vram_total_mb,
        vram_free_mb: onlineWorker.vram_free_mb,
        cuda_version: onlineWorker.cuda_version,
        xtts_loaded: onlineWorker.xtts_loaded,
        last_heartbeat: onlineWorker.last_heartbeat
      } : null
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
