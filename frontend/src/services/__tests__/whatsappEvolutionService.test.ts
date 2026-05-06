/**
 * Testes das funções Evolution Message + Group — frontend (Vitest)
 * Rodar: npm run test -- whatsappEvolutionService.test.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import {
  postEvolutionSendText,
  postEvolutionSendStatus,
  postEvolutionSendMedia,
  postEvolutionSendAudio,
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
  getEvolutionGroupFindByInvite,
  getEvolutionGroupFindByJid,
  getEvolutionGroupFetchAll,
  getEvolutionGroupFindMembers,
  postEvolutionGroupUpdateMembers,
  postEvolutionGroupUpdateSetting,
  postEvolutionGroupToggleEphemeral,
  deleteEvolutionGroupLeave,
  WHATSAPP_EVOLUTION_MESSAGE_BASE,
  WHATSAPP_EVOLUTION_GROUP_BASE,
} from '../whatsappChatService';

describe('Evolution Message Controller — frontend service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('postEvolutionSendText envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true, data: { key: { id: 'msg-1' } } });
    const body = { number: '5511999', text: 'Olá' };
    const res = await postEvolutionSendText(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-text`, body);
    expect(res.success).toBe(true);
  });

  it('postEvolutionSendStatus envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { type: 'text' as const, content: 'Meu status', allContacts: true };
    await postEvolutionSendStatus(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-status`, body);
  });

  it('postEvolutionSendMedia envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { number: '55', media: 'https://img.png' };
    await postEvolutionSendMedia(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-media`, body);
  });

  it('postEvolutionSendAudio envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { number: '55', audio: 'base64==' };
    await postEvolutionSendAudio(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-audio`, body);
  });

  it('postEvolutionSendSticker envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { number: '55', sticker: 'https://stk.webp' };
    await postEvolutionSendSticker(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-sticker`, body);
  });

  it('postEvolutionSendLocation envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { number: '55', latitude: -23.55, longitude: -46.63 };
    await postEvolutionSendLocation(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-location`, body);
  });

  it('postEvolutionSendContact envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = {
      number: '55',
      contact: [{ fullName: 'João', wuid: '5511999', phoneNumber: '+55 11 999' }],
    };
    await postEvolutionSendContact(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-contact`, body);
  });

  it('postEvolutionSendReaction envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = {
      key: { remoteJid: '55@s.whatsapp.net', fromMe: true, id: 'msg-x' },
      reaction: '🚀',
    };
    await postEvolutionSendReaction(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-reaction`, body);
  });

  it('postEvolutionSendPoll envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { number: '55', name: 'Cor?', values: ['Azul', 'Verde'] };
    await postEvolutionSendPoll(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-poll`, body);
  });

  it('postEvolutionSendList envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = {
      number: '55',
      title: 'Menu',
      sections: [{ title: 'Sec1', rows: [{ title: 'Item', rowId: 'r1' }] }],
    };
    await postEvolutionSendList(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-list`, body);
  });
});

describe('Evolution Group Controller — frontend service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('postEvolutionGroupCreate envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'grp@g.us' } });
    const body = { subject: 'Equipe', participants: ['5511999'] };
    const res = await postEvolutionGroupCreate(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_GROUP_BASE}/create`, body);
    expect(res.success).toBe(true);
  });

  it('postEvolutionGroupUpdatePicture envia groupJid e image', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupUpdatePicture('g@g.us', 'https://img.png');
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/update-picture`,
      { groupJid: 'g@g.us', image: 'https://img.png' },
    );
  });

  it('postEvolutionGroupUpdateSubject envia groupJid e subject', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupUpdateSubject('g@g.us', 'Novo Nome');
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/update-subject`,
      { groupJid: 'g@g.us', subject: 'Novo Nome' },
    );
  });

  it('postEvolutionGroupUpdateDescription envia groupJid e description', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupUpdateDescription('g@g.us', 'Desc');
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/update-description`,
      { groupJid: 'g@g.us', description: 'Desc' },
    );
  });

  it('getEvolutionGroupFetchInviteCode envia GET com groupJid', async () => {
    mockGet.mockResolvedValue({ success: true, data: { inviteCode: 'ABC' } });
    const res = await getEvolutionGroupFetchInviteCode('g@g.us');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/invite-code?groupJid='),
    );
    expect(res.success).toBe(true);
  });

  it('postEvolutionGroupRevokeInviteCode envia POST com groupJid', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupRevokeInviteCode('g@g.us');
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/revoke-invite-code`,
      { groupJid: 'g@g.us' },
    );
  });

  it('postEvolutionGroupSendInvite envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { groupJid: 'g@g.us', description: 'Venha!', numbers: ['55'] };
    await postEvolutionGroupSendInvite(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_GROUP_BASE}/send-invite`, body);
  });

  it('getEvolutionGroupFindByInvite envia GET com inviteCode', async () => {
    mockGet.mockResolvedValue({ success: true });
    await getEvolutionGroupFindByInvite('XYZ');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/find-by-invite?inviteCode=XYZ'),
    );
  });

  it('getEvolutionGroupFindByJid envia GET com groupJid', async () => {
    mockGet.mockResolvedValue({ success: true });
    await getEvolutionGroupFindByJid('g@g.us');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/find-by-jid?groupJid='),
    );
  });

  it('getEvolutionGroupFetchAll envia GET com flag getParticipants', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    await getEvolutionGroupFetchAll(true);
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/fetch-all?getParticipants=true'),
    );
  });

  it('getEvolutionGroupFindMembers envia GET com groupJid', async () => {
    mockGet.mockResolvedValue({ success: true });
    await getEvolutionGroupFindMembers('g@g.us');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/members?groupJid='),
    );
  });

  it('postEvolutionGroupUpdateMembers envia POST correto', async () => {
    mockPost.mockResolvedValue({ success: true });
    const body = { groupJid: 'g@g.us', action: 'add' as const, participants: ['55'] };
    await postEvolutionGroupUpdateMembers(body);
    expect(mockPost).toHaveBeenCalledWith(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-members`, body);
  });

  it('postEvolutionGroupUpdateSetting envia groupJid e action', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupUpdateSetting('g@g.us', 'announcement');
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/update-setting`,
      { groupJid: 'g@g.us', action: 'announcement' },
    );
  });

  it('postEvolutionGroupToggleEphemeral envia groupJid e expiration', async () => {
    mockPost.mockResolvedValue({ success: true });
    await postEvolutionGroupToggleEphemeral('g@g.us', 86400);
    expect(mockPost).toHaveBeenCalledWith(
      `${WHATSAPP_EVOLUTION_GROUP_BASE}/toggle-ephemeral`,
      { groupJid: 'g@g.us', expiration: 86400 },
    );
  });

  it('deleteEvolutionGroupLeave envia DELETE com groupJid', async () => {
    mockDelete.mockResolvedValue({ success: true });
    await deleteEvolutionGroupLeave('g@g.us');
    expect(mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('/leave?groupJid='),
    );
  });
});
