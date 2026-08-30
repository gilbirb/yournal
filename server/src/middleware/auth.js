import { db } from '../db.js';

export async function requireAuth(req, res, next) {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        if (process.env.DEV_USER_ID) {
            req.userId = process.env.DEV_USER_ID;
            return next();
        }
        return res.status(401).json({ error: 'missing bearer token' });
    }

    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ error: 'invalid token '});
    }

    req.userId = data.user.id;
    next();
}