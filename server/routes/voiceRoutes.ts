import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { voiceService } from '../services/voiceService.js';

const router = Router();

// Configure multer for voice reference uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CONFIG.VOICES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.wav';
    const uniqueName = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: CONFIG.MAX_VOICE_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Supported: WAV, MP3, M4A, OGG'));
    }
  }
});

/**
 * POST /api/voices
 * Upload audio & create voice profile
 */
router.post('/', upload.single('reference_audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio reference file is required' });
    }

    const { name, description = '', language = 'en', pronunciation_dict } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      // Cleanup uploaded file if validation fails
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Voice name is required' });
    }

    let parsedDict: Record<string, string> = {};
    if (pronunciation_dict) {
      try {
        parsedDict = typeof pronunciation_dict === 'string' ? JSON.parse(pronunciation_dict) : pronunciation_dict;
      } catch (e) {
        console.warn('Failed parsing pronunciation dict JSON:', e);
      }
    }

    const profile = await voiceService.createVoiceProfile(
      name.trim(),
      description.trim(),
      req.file.filename,
      language,
      parsedDict
    );

    return res.status(201).json({
      message: 'Voice profile created successfully',
      voice: profile
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ error: error.message || 'Failed creating voice profile' });
  }
});

/**
 * GET /api/voices
 */
router.get('/', (_req: Request, res: Response) => {
  const voices = voiceService.getAllVoices();
  return res.json(voices);
});

/**
 * GET /api/voices/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const voice = voiceService.getVoiceById(id);

  if (!voice) {
    return res.status(404).json({ error: `Voice profile '${id}' not found` });
  }

  return res.json(voice);
});

/**
 * PUT /api/voices/:id/pronunciation
 */
router.put('/:id/pronunciation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pronunciation_dict } = req.body;

    if (!pronunciation_dict || typeof pronunciation_dict !== 'object') {
      return res.status(400).json({ error: 'pronunciation_dict object is required' });
    }

    const updated = await voiceService.updatePronunciationDict(id, pronunciation_dict);
    return res.json({ message: 'Pronunciation dictionary updated', voice: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/voices/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = voiceService.deleteVoice(id);

  if (!deleted) {
    return res.status(404).json({ error: `Voice profile '${id}' not found` });
  }

  return res.json({ message: `Voice profile '${id}' deleted successfully` });
});

/**
 * GET /api/voices/file/:filename
 * Serves stored reference audio file
 */
router.get('/file/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(CONFIG.VOICES_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Voice file not found' });
  }

  return res.sendFile(filePath);
});

export default router;
