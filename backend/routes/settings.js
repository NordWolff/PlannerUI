import { Router } from 'express';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json({
    ticketPrefix: store.settings.ticketPrefix,
    ticketCounter: store.settings.ticketCounter,
    nextTicketNumber: `${store.settings.ticketPrefix}-${String(store.settings.ticketCounter).padStart(4, '0')}`,
  });
});

router.put('/ticket-prefix', requireAdmin, (req, res) => {
  const { prefix } = req.body;
  if (!prefix) return res.status(400).json({ error: 'prefix ist erforderlich' });
  if (!/^[A-Za-z0-9\-]{1,10}$/.test(prefix)) {
    return res.status(400).json({ error: 'Präfix darf nur Buchstaben, Zahlen und Bindestriche enthalten (max. 10 Zeichen)' });
  }
  store.settings.ticketPrefix = prefix.toUpperCase();
  return res.json({
    ticketPrefix: store.settings.ticketPrefix,
    ticketCounter: store.settings.ticketCounter,
    nextTicketNumber: `${store.settings.ticketPrefix}-${String(store.settings.ticketCounter).padStart(4, '0')}`,
  });
});

router.put('/ticket-counter', requireAdmin, (req, res) => {
  const { counter } = req.body;
  const n = parseInt(counter);
  if (isNaN(n) || n < 1) return res.status(400).json({ error: 'counter muss eine positive Zahl sein' });
  store.settings.ticketCounter = n;
  return res.json({
    ticketPrefix: store.settings.ticketPrefix,
    ticketCounter: store.settings.ticketCounter,
    nextTicketNumber: `${store.settings.ticketPrefix}-${String(store.settings.ticketCounter).padStart(4, '0')}`,
  });
});

export default router;
