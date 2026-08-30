import express from 'express'
import cors from 'cors'
import entriesRouter from './routes/entries.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/entries', entriesRouter);

app.listen(process.env.PORT ?? 3000, () => console.log(`Server running on ${process.env.PORT ?? 3000}`));
