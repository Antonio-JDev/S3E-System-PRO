import { Request, Response } from 'express';
import { getNcmByCodeBrasilApi, searchNcmBrasilApi } from '../services/brasilApiNcm.service';

export const searchNcm = async (req: Request, res: Response): Promise<void> => {
  const raw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (raw.length < 2) {
    res.status(400).json({ error: 'Informe pelo menos 2 caracteres no parâmetro search.' });
    return;
  }

  const { status, body } = await searchNcmBrasilApi(raw);
  res.status(status).json(body);
};

export const getNcmByCode = async (req: Request, res: Response): Promise<void> => {
  const code = typeof req.params.code === 'string' ? req.params.code.trim() : '';
  if (!code) {
    res.status(400).json({ error: 'Código NCM obrigatório.' });
    return;
  }

  const { status, body } = await getNcmByCodeBrasilApi(code);
  res.status(status).json(body);
};
