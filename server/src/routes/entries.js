import { db } from "../db.js";
import { isValidDateKey } from "../lib/entries.js";
import { requireAuth } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const userId = req.userId;

  if (!from || !to || !isValidDateKey(from) || !isValidDateKey(to)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const { data, error } = await db.from('entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

router.get('/:date', async (req, res) => {
  const { date } = req.params;
  const userId = req.userId;

  if (!date || !isValidDateKey(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const { data, error } = await db.from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

router.put('/:date', async (req, res) => {
  const { content, mood } = req.body ?? {};
  const { date } = req.params;

  if (!date || !isValidDateKey(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const { data, error } = await db.from('entries')
    .upsert( {user_id: req.userId, date, content, mood}, { onConflict: 'user_id,date' })
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;