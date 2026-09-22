import { db } from "../db.js";
import { isValidDateKey, validatePlan } from "../lib/entries.js";
import { planSearch } from "../lib/llm.js";
import { requireAuth } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();
router.use(requireAuth);

async function findEntries({ userId, terms, from, to }) {
  let query = db
    .from('entries')
    .select('date, content')
    .eq('user_id', userId);

  if (terms.length > 0) {
    query = query.textSearch('search_vector', terms.join(' or '), { type: 'websearch' });
  }
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  return query.order('date', { ascending: false }).limit(50);
}

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

router.get('/search', async (req, res) => {
  const { q } = req.query;
  const userId = req.userId;

  if (!q || q.length < 2 || q.length > 100) {
    return res.status(400).json({ error: 'Invalid search query' });
  }

  const { data, error } = await findEntries({ userId, terms: [q] });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/search/ask', async (req, res) => {
  const { question, today } = req.body ?? {};
  const userId = req.userId;

  if (typeof question !== 'string' || question.trim().length < 3 || question.length > 300) {
    return res.status(400).json({ error: 'question must be 3 to 300 characters' });
  }
  // "today" comes from the browser: the server runs in UTC, the user doesn't
  if (!isValidDateKey(today)) {
    return res.status(400).json({ error: 'today must be YYYY-MM-DD' });
  }

  let plan;
  let mode;

  const limit = userId === process.env.DEMO_USER_ID ? 30 : 10;
  const { data: used, error: usageError } = await db.rpc('bump_llm_usage', { p_user_id: userId });
  const allowed = !usageError && used <= limit;

  if (!allowed) {
    if (usageError) console.warn('usage check failed:', usageError.message);
    plan = { terms: [question] };
    mode = 'limited';
  } else {
    try {
      plan = validatePlan(await planSearch(question, today));
      mode = 'ai';
    } catch (err) {
      // rate limits, a missing key and malformed model output all land here;
      // the user still gets keyword results, so this log is the only trace
      console.warn('AI search fell back:', err.message);
      plan = { terms: [question] };
      mode = 'fallback';
    }
  }


  const { data, error } = await findEntries({ userId, ...plan });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ mode, plan, entries: data });
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

router.delete('/:date', async (req, res) => {
  const { date } = req.params;
  const userId = req.userId;

  if (!date || !isValidDateKey(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const { data, error } = await db
    .from('entries')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
    .select()
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