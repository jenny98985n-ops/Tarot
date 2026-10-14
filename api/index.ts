import express from 'express';
import { apiRouter } from '../src/apiRoutes';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount apiRouter on multiple path prefixes so Vercel rewrites match regardless of path stripping
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
