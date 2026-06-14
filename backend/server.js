import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { seedData } from './data/store.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import teamsRoutes from './routes/teams.js';
import projectsRoutes from './routes/projects.js';
import ticketsRoutes from './routes/tickets.js';
import boardsRoutes from './routes/boards.js';
import sprintsRoutes from './routes/sprints.js';
import dashboardRoutes from './routes/dashboard.js';
import chatRoutes from './routes/chat.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/sprints', sprintsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

seedData().then(() => {
  app.listen(PORT, () => {
    console.log(`Planner Backend läuft auf http://localhost:${PORT}`);
    console.log(`API verfügbar unter http://localhost:${PORT}/api`);
  });
}).catch((err) => {
  console.error('Fehler beim Laden der Seed-Daten:', err);
  process.exit(1);
});
