import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { updateProfileSchema } from '../middleware/validate';

const router = Router();

// GET /api/profile
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await db.getProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        code: 'PROFILE_NOT_FOUND',
        message: 'User profile not found.',
      });
    }
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: 'PROFILE_FETCH_FAILED',
      message: err.message || 'Unable to retrieve user profile.',
    });
  }
});

// PUT /api/profile
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid profile data provided.',
        errors: parsed.error.issues,
      });
    }

    const updated = await db.upsertProfile({
      id: req.user!.id,
      email: req.user!.email,
      ...parsed.data,
      default_reminder_channel: req.body.default_reminder_channel,
      email_reminders_enabled: req.body.email_reminders_enabled,
      whatsapp_reminders_enabled: req.body.whatsapp_reminders_enabled,
    });

    return res.json({
      success: true,
      message: 'Profile saved successfully.',
      profile: updated,
    });
  } catch (err: any) {
    console.error('[Profile Update Exception]', err);
    return res.status(500).json({
      success: false,
      code: 'INTEGRATION_SAVE_FAILED',
      message: err.message || 'Unable to save integration settings.',
    });
  }
});

export default router;
