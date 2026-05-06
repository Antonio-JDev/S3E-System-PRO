import { Router } from 'express';
import { whatsappWebhook } from '../controllers/whatsappWebhookController';

const router = Router();
router.post('/whatsapp', whatsappWebhook);
// Evolution pode enviar para subpaths como /whatsapp/messages-upsert, /whatsapp/messages-update, etc.
// O handler decide pelo `body.event`, então aceitamos o path extra para evitar 404.
router.post('/whatsapp/:any(*)', whatsappWebhook);

export default router;
