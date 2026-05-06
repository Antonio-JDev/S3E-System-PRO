/**
 * Testes do WhatsApp Evolution Chat Controller — Message + Group
 * Rodar: npm test -- whatsappEvolutionChatController.test.ts
 */
import { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';

jest.mock('../services/whatsappProvider.evolution', () => ({
  isEvolutionProviderKind: jest.fn(() => true),
}));

const evoMocks = {
  evolutionSendText: jest.fn(),
  evolutionSendStatus: jest.fn(),
  evolutionSendMediaMsg: jest.fn(),
  evolutionSendWhatsAppAudio: jest.fn(),
  evolutionSendSticker: jest.fn(),
  evolutionSendLocation: jest.fn(),
  evolutionSendContact: jest.fn(),
  evolutionSendReaction: jest.fn(),
  evolutionSendPoll: jest.fn(),
  evolutionSendList: jest.fn(),
  evolutionGroupCreate: jest.fn(),
  evolutionGroupUpdatePicture: jest.fn(),
  evolutionGroupUpdateSubject: jest.fn(),
  evolutionGroupUpdateDescription: jest.fn(),
  evolutionGroupFetchInviteCode: jest.fn(),
  evolutionGroupRevokeInviteCode: jest.fn(),
  evolutionGroupSendInvite: jest.fn(),
  evolutionGroupFindByInviteCode: jest.fn(),
  evolutionFindGroupByJid: jest.fn(),
  evolutionFetchAllGroups: jest.fn(),
  evolutionGroupFindMembers: jest.fn(),
  evolutionGroupUpdateMembers: jest.fn(),
  evolutionGroupUpdateSetting: jest.fn(),
  evolutionGroupToggleEphemeral: jest.fn(),
  evolutionGroupLeave: jest.fn(),
};

jest.mock('../services/whatsappEvolutionChat.service', () => evoMocks);

import {
  postEvolutionSendText,
  postEvolutionSendStatus,
  postEvolutionSendMedia,
  postEvolutionSendWhatsAppAudio,
  postEvolutionSendSticker,
  postEvolutionSendLocation,
  postEvolutionSendContact,
  postEvolutionSendReaction,
  postEvolutionSendPoll,
  postEvolutionSendList,
  postEvolutionGroupCreate,
  postEvolutionGroupUpdatePicture,
  postEvolutionGroupUpdateSubject,
  postEvolutionGroupUpdateDescription,
  getEvolutionGroupFetchInviteCode,
  postEvolutionGroupRevokeInviteCode,
  postEvolutionGroupSendInvite,
  getEvolutionGroupFindByInviteCode,
  getEvolutionGroupFindByJid,
  getEvolutionGroupFetchAll,
  getEvolutionGroupFindMembers,
  postEvolutionGroupUpdateMembers,
  postEvolutionGroupUpdateSetting,
  postEvolutionGroupToggleEphemeral,
  deleteEvolutionGroupLeave,
} from './whatsappEvolutionChatController';

function makeReqRes(body: Record<string, unknown> = {}, query: Record<string, string> = {}) {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const req = { user: { userId: 'u1' }, body, query } as unknown as AuthRequest;
  const res = { status: statusMock, json: jsonMock } as unknown as Response;
  return { req, res, jsonMock, statusMock };
}

describe('Evolution Message Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── sendText ───
  describe('postEvolutionSendText', () => {
    it('retorna 400 se number ou text ausentes', async () => {
      const { req, res, statusMock, jsonMock } = makeReqRes({ number: '5511999' });
      await postEvolutionSendText(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('retorna 201 com dados ao enviar texto', async () => {
      evoMocks.evolutionSendText.mockResolvedValue({ key: { id: 'msg-1' } });
      const { req, res, statusMock, jsonMock } = makeReqRes({ number: '5511999', text: 'Olá' });
      await postEvolutionSendText(req, res);
      expect(evoMocks.evolutionSendText).toHaveBeenCalledWith(expect.objectContaining({ number: '5511999', text: 'Olá' }));
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { key: { id: 'msg-1' } } });
    });

    it('retorna 500 ao lançar exceção', async () => {
      evoMocks.evolutionSendText.mockRejectedValue(new Error('timeout'));
      const { req, res, statusMock, jsonMock } = makeReqRes({ number: '5511999', text: 'x' });
      await postEvolutionSendText(req, res);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'timeout' }));
    });
  });

  // ─── sendStatus ───
  describe('postEvolutionSendStatus', () => {
    it('retorna 400 se type ou content ausentes', async () => {
      const { req, res, statusMock } = makeReqRes({ type: 'text' });
      await postEvolutionSendStatus(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar status (story)', async () => {
      evoMocks.evolutionSendStatus.mockResolvedValue({ key: { id: 'st-1' } });
      const { req, res, statusMock, jsonMock } = makeReqRes({
        type: 'text', content: 'Meu status', allContacts: true,
      });
      await postEvolutionSendStatus(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── sendMedia ───
  describe('postEvolutionSendMedia', () => {
    it('retorna 400 sem number ou media', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '5511999' });
      await postEvolutionSendMedia(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar mídia', async () => {
      evoMocks.evolutionSendMediaMsg.mockResolvedValue({ key: { id: 'md-1' } });
      const { req, res, statusMock } = makeReqRes({
        number: '5511999', media: 'https://img.png', mediatype: 'image',
      });
      await postEvolutionSendMedia(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendWhatsAppAudio ───
  describe('postEvolutionSendWhatsAppAudio', () => {
    it('retorna 400 sem audio', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '5511999' });
      await postEvolutionSendWhatsAppAudio(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar áudio', async () => {
      evoMocks.evolutionSendWhatsAppAudio.mockResolvedValue({ key: { id: 'au-1' } });
      const { req, res, statusMock } = makeReqRes({ number: '5511999', audio: 'base64audio==' });
      await postEvolutionSendWhatsAppAudio(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendSticker ───
  describe('postEvolutionSendSticker', () => {
    it('retorna 400 sem sticker', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '55' });
      await postEvolutionSendSticker(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar sticker', async () => {
      evoMocks.evolutionSendSticker.mockResolvedValue({});
      const { req, res, statusMock } = makeReqRes({ number: '55', sticker: 'https://stk.webp' });
      await postEvolutionSendSticker(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendLocation ───
  describe('postEvolutionSendLocation', () => {
    it('retorna 400 sem latitude/longitude', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '55' });
      await postEvolutionSendLocation(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar localização', async () => {
      evoMocks.evolutionSendLocation.mockResolvedValue({ key: { id: 'loc-1' } });
      const { req, res, statusMock } = makeReqRes({
        number: '55', latitude: -23.55, longitude: -46.63,
      });
      await postEvolutionSendLocation(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendContact ───
  describe('postEvolutionSendContact', () => {
    it('retorna 400 sem contact array', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '55', contact: 'invalido' });
      await postEvolutionSendContact(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar contato', async () => {
      evoMocks.evolutionSendContact.mockResolvedValue({ key: { id: 'ct-1' } });
      const { req, res, statusMock } = makeReqRes({
        number: '55',
        contact: [{ fullName: 'João', wuid: '5511999', phoneNumber: '+55 11 999' }],
      });
      await postEvolutionSendContact(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendReaction ───
  describe('postEvolutionSendReaction', () => {
    it('retorna 400 sem key ou reaction', async () => {
      const { req, res, statusMock } = makeReqRes({ key: { remoteJid: 'x' } });
      await postEvolutionSendReaction(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar reação', async () => {
      evoMocks.evolutionSendReaction.mockResolvedValue({ key: { id: 'rc-1' } });
      const { req, res, statusMock } = makeReqRes({
        key: { remoteJid: '55@s.whatsapp.net', fromMe: true, id: 'msg-x' },
        reaction: '🚀',
      });
      await postEvolutionSendReaction(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendPoll ───
  describe('postEvolutionSendPoll', () => {
    it('retorna 400 sem name ou values', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '55', name: 'Poll' });
      await postEvolutionSendPoll(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar enquete', async () => {
      evoMocks.evolutionSendPoll.mockResolvedValue({ key: { id: 'pl-1' } });
      const { req, res, statusMock } = makeReqRes({
        number: '55', name: 'Cor favorita?', values: ['Azul', 'Verde'],
      });
      await postEvolutionSendPoll(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  // ─── sendList ───
  describe('postEvolutionSendList', () => {
    it('retorna 400 sem title ou sections', async () => {
      const { req, res, statusMock } = makeReqRes({ number: '55', title: 'Menu' });
      await postEvolutionSendList(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao enviar lista', async () => {
      evoMocks.evolutionSendList.mockResolvedValue({ key: { id: 'ls-1' } });
      const { req, res, statusMock } = makeReqRes({
        number: '55',
        title: 'Menu',
        sections: [{ title: 'Sec1', rows: [{ title: 'Item', rowId: 'r1' }] }],
      });
      await postEvolutionSendList(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });
});

describe('Evolution Group Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── create ───
  describe('postEvolutionGroupCreate', () => {
    it('retorna 400 sem subject ou participants', async () => {
      const { req, res, statusMock } = makeReqRes({ subject: 'Grupo' });
      await postEvolutionGroupCreate(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('retorna 201 ao criar grupo', async () => {
      evoMocks.evolutionGroupCreate.mockResolvedValue({ id: 'grp-1@g.us' });
      const { req, res, statusMock, jsonMock } = makeReqRes({
        subject: 'Equipe S3E', participants: ['5511999'],
      });
      await postEvolutionGroupCreate(req, res);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { id: 'grp-1@g.us' } });
    });

    it('retorna 500 ao lançar exceção', async () => {
      evoMocks.evolutionGroupCreate.mockRejectedValue(new Error('fail'));
      const { req, res, statusMock } = makeReqRes({
        subject: 'X', participants: ['55'],
      });
      await postEvolutionGroupCreate(req, res);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  // ─── updatePicture ───
  describe('postEvolutionGroupUpdatePicture', () => {
    it('retorna 400 sem groupJid ou image', async () => {
      const { req, res, statusMock } = makeReqRes({ groupJid: 'g@g.us' });
      await postEvolutionGroupUpdatePicture(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao atualizar imagem', async () => {
      evoMocks.evolutionGroupUpdatePicture.mockResolvedValue({ ok: true });
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', image: 'https://img.png',
      });
      await postEvolutionGroupUpdatePicture(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { ok: true } });
    });
  });

  // ─── updateSubject ───
  describe('postEvolutionGroupUpdateSubject', () => {
    it('retorna 400 sem subject', async () => {
      const { req, res, statusMock } = makeReqRes({ groupJid: 'g@g.us' });
      await postEvolutionGroupUpdateSubject(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao atualizar assunto', async () => {
      evoMocks.evolutionGroupUpdateSubject.mockResolvedValue({});
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', subject: 'Novo Nome',
      });
      await postEvolutionGroupUpdateSubject(req, res);
      expect(evoMocks.evolutionGroupUpdateSubject).toHaveBeenCalledWith('g@g.us', 'Novo Nome');
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── updateDescription ───
  describe('postEvolutionGroupUpdateDescription', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({ description: 'desc' });
      await postEvolutionGroupUpdateDescription(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao atualizar descrição', async () => {
      evoMocks.evolutionGroupUpdateDescription.mockResolvedValue({});
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', description: 'Desc atualizada',
      });
      await postEvolutionGroupUpdateDescription(req, res);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── fetchInviteCode ───
  describe('getEvolutionGroupFetchInviteCode', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({}, {});
      await getEvolutionGroupFetchInviteCode(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao buscar invite code', async () => {
      evoMocks.evolutionGroupFetchInviteCode.mockResolvedValue({ inviteCode: 'ABC123' });
      const { req, res, jsonMock } = makeReqRes({}, { groupJid: 'g@g.us' });
      await getEvolutionGroupFetchInviteCode(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { inviteCode: 'ABC123' } });
    });
  });

  // ─── revokeInviteCode ───
  describe('postEvolutionGroupRevokeInviteCode', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({});
      await postEvolutionGroupRevokeInviteCode(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao revogar invite', async () => {
      evoMocks.evolutionGroupRevokeInviteCode.mockResolvedValue({ revoked: true });
      const { req, res, jsonMock } = makeReqRes({ groupJid: 'g@g.us' });
      await postEvolutionGroupRevokeInviteCode(req, res);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── sendInvite ───
  describe('postEvolutionGroupSendInvite', () => {
    it('retorna 400 sem numbers', async () => {
      const { req, res, statusMock } = makeReqRes({ groupJid: 'g@g.us' });
      await postEvolutionGroupSendInvite(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao enviar convite', async () => {
      evoMocks.evolutionGroupSendInvite.mockResolvedValue({ sent: true });
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', description: 'Venha!', numbers: ['5511999'],
      });
      await postEvolutionGroupSendInvite(req, res);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── findByInviteCode ───
  describe('getEvolutionGroupFindByInviteCode', () => {
    it('retorna 400 sem inviteCode', async () => {
      const { req, res, statusMock } = makeReqRes({}, {});
      await getEvolutionGroupFindByInviteCode(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao buscar grupo por invite', async () => {
      evoMocks.evolutionGroupFindByInviteCode.mockResolvedValue({ subject: 'Grupo X' });
      const { req, res, jsonMock } = makeReqRes({}, { inviteCode: 'XYZ' });
      await getEvolutionGroupFindByInviteCode(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { subject: 'Grupo X' } });
    });
  });

  // ─── findByJid ───
  describe('getEvolutionGroupFindByJid', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({}, {});
      await getEvolutionGroupFindByJid(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao buscar grupo por JID', async () => {
      evoMocks.evolutionFindGroupByJid.mockResolvedValue({ id: 'g@g.us' });
      const { req, res, jsonMock } = makeReqRes({}, { groupJid: 'g@g.us' });
      await getEvolutionGroupFindByJid(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { id: 'g@g.us' } });
    });
  });

  // ─── fetchAll ───
  describe('getEvolutionGroupFetchAll', () => {
    it('sucesso ao listar todos os grupos', async () => {
      evoMocks.evolutionFetchAllGroups.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
      const { req, res, jsonMock } = makeReqRes({}, {});
      await getEvolutionGroupFetchAll(req, res);
      expect(evoMocks.evolutionFetchAllGroups).toHaveBeenCalledWith(false);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 'g1' }, { id: 'g2' }] });
    });

    it('getParticipants=true é respeitado', async () => {
      evoMocks.evolutionFetchAllGroups.mockResolvedValue([]);
      const { req, res } = makeReqRes({}, { getParticipants: 'true' });
      await getEvolutionGroupFetchAll(req, res);
      expect(evoMocks.evolutionFetchAllGroups).toHaveBeenCalledWith(true);
    });
  });

  // ─── findMembers ───
  describe('getEvolutionGroupFindMembers', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({}, {});
      await getEvolutionGroupFindMembers(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao buscar membros', async () => {
      evoMocks.evolutionGroupFindMembers.mockResolvedValue([{ id: 'p1' }]);
      const { req, res, jsonMock } = makeReqRes({}, { groupJid: 'g@g.us' });
      await getEvolutionGroupFindMembers(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 'p1' }] });
    });
  });

  // ─── updateMembers ───
  describe('postEvolutionGroupUpdateMembers', () => {
    it('retorna 400 com action inválida', async () => {
      const { req, res, statusMock } = makeReqRes({
        groupJid: 'g@g.us', action: 'invalid', participants: ['55'],
      });
      await postEvolutionGroupUpdateMembers(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao adicionar membros', async () => {
      evoMocks.evolutionGroupUpdateMembers.mockResolvedValue({ ok: true });
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', action: 'add', participants: ['5511999'],
      });
      await postEvolutionGroupUpdateMembers(req, res);
      expect(evoMocks.evolutionGroupUpdateMembers).toHaveBeenCalledWith(
        'g@g.us',
        { action: 'add', participants: ['5511999'] },
      );
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('aceita promote e demote', async () => {
      evoMocks.evolutionGroupUpdateMembers.mockResolvedValue({});
      for (const action of ['promote', 'demote', 'remove'] as const) {
        const { req, res } = makeReqRes({
          groupJid: 'g@g.us', action, participants: ['55'],
        });
        await postEvolutionGroupUpdateMembers(req, res);
        expect(evoMocks.evolutionGroupUpdateMembers).toHaveBeenCalled();
      }
    });
  });

  // ─── updateSetting ───
  describe('postEvolutionGroupUpdateSetting', () => {
    it('retorna 400 com action inválida', async () => {
      const { req, res, statusMock } = makeReqRes({
        groupJid: 'g@g.us', action: 'blah',
      });
      await postEvolutionGroupUpdateSetting(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it.each(['announcement', 'not_announcement', 'locked', 'unlocked'] as const)(
      'sucesso com action %s',
      async (action) => {
        evoMocks.evolutionGroupUpdateSetting.mockResolvedValue({});
        const { req, res, jsonMock } = makeReqRes({ groupJid: 'g@g.us', action });
        await postEvolutionGroupUpdateSetting(req, res);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      },
    );
  });

  // ─── toggleEphemeral ───
  describe('postEvolutionGroupToggleEphemeral', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({ expiration: 86400 });
      await postEvolutionGroupToggleEphemeral(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao ativar mensagens temporárias', async () => {
      evoMocks.evolutionGroupToggleEphemeral.mockResolvedValue({});
      const { req, res, jsonMock } = makeReqRes({
        groupJid: 'g@g.us', expiration: 86400,
      });
      await postEvolutionGroupToggleEphemeral(req, res);
      expect(evoMocks.evolutionGroupToggleEphemeral).toHaveBeenCalledWith('g@g.us', 86400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── leave ───
  describe('deleteEvolutionGroupLeave', () => {
    it('retorna 400 sem groupJid', async () => {
      const { req, res, statusMock } = makeReqRes({}, {});
      await deleteEvolutionGroupLeave(req, res);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('sucesso ao sair do grupo', async () => {
      evoMocks.evolutionGroupLeave.mockResolvedValue({ left: true });
      const { req, res, jsonMock } = makeReqRes({ groupJid: 'g@g.us' });
      await deleteEvolutionGroupLeave(req, res);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { left: true } });
    });
  });
});
