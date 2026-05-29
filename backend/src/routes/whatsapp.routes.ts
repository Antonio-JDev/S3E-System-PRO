import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  deleteWhatsappChatConversation,
  deleteWhatsappContactCacheAll,
  getWhatsappResolveOpenChat,
  getWhatsappProfileFetchTarget,
  deleteWhatsappMessage,
  deleteWhatsappMessageForMe,
  getWhatsappMediaById,
  getWhatsappConnectionStatus,
  getWhatsappConnectionQr,
  postWhatsappProviderLogout,
  getWhatsappProviderCheckPhone,
  getWhatsappGroupParticipantNames,
  getWhatsappProviderContactMeta,
  postWhatsappUpsertContactCache,
  getWhatsappProviderContactsIndex,
  getWhatsappProviderContactsSearch,
  getWhatsappProviderGroupsIndex,
  getWhatsappProviderMediaProxy,
  getWhatsappProviderProfilePicture,
  getWhatsappProfilePictureImageController,
  getWhatsappChats,
  getWhatsappActionsContextController,
  getWhatsappArchivedChats,
  getWhatsappOrcamentoStatusModeController,
  getWhatsappMessages,
  getWhatsappMessageMediaDiagnostics,
  getWhatsappSessionProfile,
  postWhatsappArchiveConversation,
  postWhatsappLinkCliente,
  postWhatsappUnlinkCliente,
  postWhatsappMarkRead,
  postWhatsappMarkAllRead,
  getWhatsappUnreadCount,
  postWhatsappSendOrcamentoPdf,
  postWhatsappUnarchive,
  postWhatsappPinConversation,
  postWhatsappFavoriteConversation,
  putWhatsappOrcamentoStatusModeController,
  postWhatsappSubscribePresence,
  postWhatsappSend,
  postWhatsappSendFile,
  postWhatsappSendMedia,
  postWhatsappForwardMessages,
  postWhatsappReactToMessage,
  putWhatsappMessage,
  whatsappSendFileMulter
} from '../controllers/whatsappController';
import {
  listChatLabelsController,
  createChatLabelController,
  updateChatLabelController,
  deleteChatLabelController,
  putChatLabelChatsController,
  postChatLabelChatsController,
  deleteChatLabelChatsController
} from '../controllers/whatsappChatLabelsController';
import {
  deleteEvolutionMessageForEveryone,
  deleteEvolutionSessionProfilePicture,
  getEvolutionPrivacySettings,
  postEvolutionArchiveChat,
  postEvolutionFetchBusinessProfile,
  postEvolutionFetchContactProfile,
  postEvolutionFetchProfilePicture,
  postEvolutionFindChats,
  postEvolutionFindContacts,
  postEvolutionFindMessages,
  postEvolutionFindStatusMessage,
  postEvolutionGetBase64Media,
  postEvolutionMarkChatUnread,
  postEvolutionMarkMessageAsRead,
  postEvolutionSendPresence,
  postEvolutionSetInstancePresence,
  postEvolutionUpdateBlockStatus,
  postEvolutionUpdateMessage,
  postEvolutionUpdatePrivacySettings,
  postEvolutionUpdateSessionProfileName,
  postEvolutionUpdateSessionProfilePicture,
  postEvolutionUpdateSessionProfileStatus,
  postEvolutionWhatsappNumbers,
  // Message Controller
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
  // Group Controller
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
  deleteEvolutionGroupLeave
} from '../controllers/whatsappEvolutionChatController';

const router = Router();
router.use(authenticate);

router.get('/connection-status', getWhatsappConnectionStatus);
router.get('/connection-qr', getWhatsappConnectionQr);
router.post('/logout-session', postWhatsappProviderLogout);
router.get('/contacts/check-exists', getWhatsappProviderCheckPhone);
router.get('/provider-contacts/search', getWhatsappProviderContactsSearch);
router.get('/provider-contacts', getWhatsappProviderContactsIndex);
router.get('/provider-groups', getWhatsappProviderGroupsIndex);
router.get('/profile-picture', getWhatsappProviderProfilePicture);
router.get('/profile-picture/image', getWhatsappProfilePictureImageController);
router.get('/media/:mediaId', getWhatsappMediaById);
router.get('/media-proxy', getWhatsappProviderMediaProxy);
router.get('/contact-meta', getWhatsappProviderContactMeta);
router.get('/group-participants-cache', getWhatsappGroupParticipantNames);
router.post('/contact-cache', postWhatsappUpsertContactCache);
router.delete('/contact-cache', deleteWhatsappContactCacheAll);
router.get('/chats/resolve-open', getWhatsappResolveOpenChat);
router.get('/profile-fetch-target', getWhatsappProfileFetchTarget);
router.get('/chats', getWhatsappChats);
router.get('/actions/context', getWhatsappActionsContextController);
router.post('/actions/link-cliente', postWhatsappLinkCliente);
router.post('/actions/unlink-cliente', postWhatsappUnlinkCliente);
router.get('/actions/orcamento-status-mode', getWhatsappOrcamentoStatusModeController);
router.put('/actions/orcamento-status-mode', putWhatsappOrcamentoStatusModeController);
router.post('/actions/send-orcamento-pdf', postWhatsappSendOrcamentoPdf);
router.get('/chats/archived', getWhatsappArchivedChats);
router.delete('/conversations', deleteWhatsappChatConversation);
router.post('/conversations/archive', postWhatsappArchiveConversation);
router.post('/conversations/unarchive', postWhatsappUnarchive);
router.post('/conversations/pin', postWhatsappPinConversation);
router.post('/conversations/favorite', postWhatsappFavoriteConversation);
router.post('/mark-all-read', postWhatsappMarkAllRead);
router.get('/unread-count', getWhatsappUnreadCount);
router.get('/session-profile', getWhatsappSessionProfile);
router.post('/presence/subscribe', postWhatsappSubscribePresence);
router.post('/mark-read', postWhatsappMarkRead);
router.get('/messages/:messageId/media-diagnostics', getWhatsappMessageMediaDiagnostics);
router.get('/messages', getWhatsappMessages);
router.delete('/messages/:messageId', deleteWhatsappMessage);
router.delete('/messages/:messageId/for-me', deleteWhatsappMessageForMe);
router.put('/messages/:messageId', putWhatsappMessage);
router.post('/messages/:messageId/react', postWhatsappReactToMessage);
router.post('/messages/forward', postWhatsappForwardMessages);
router.post('/send', postWhatsappSend);
router.post('/send-media', postWhatsappSendMedia);
router.post('/send-file', whatsappSendFileMulter.single('file'), postWhatsappSendFile);

// Listas/etiquetas customizadas por usuário (filtro extra na sidebar do CRM).
router.get('/chat-labels', listChatLabelsController);
router.post('/chat-labels', createChatLabelController);
router.patch('/chat-labels/:id', updateChatLabelController);
router.delete('/chat-labels/:id', deleteChatLabelController);
router.put('/chat-labels/:id/chats', putChatLabelChatsController);
router.post('/chat-labels/:id/chats', postChatLabelChatsController);
router.delete('/chat-labels/:id/chats', deleteChatLabelChatsController);

/** Evolution API v2 — Chat Controller (proxy autenticado; requer WHATSAPP_PROVIDER_KIND=evolution) */
router.post('/evolution/chat/whatsapp-numbers', postEvolutionWhatsappNumbers);
router.post('/evolution/chat/find-contacts', postEvolutionFindContacts);
router.post('/evolution/chat/find-chats', postEvolutionFindChats);
router.post('/evolution/chat/find-messages', postEvolutionFindMessages);
router.post('/evolution/chat/find-status-message', postEvolutionFindStatusMessage);
router.post('/evolution/chat/mark-messages-read', postEvolutionMarkMessageAsRead);
router.post('/evolution/chat/mark-chat-unread', postEvolutionMarkChatUnread);
router.post('/evolution/chat/archive', postEvolutionArchiveChat);
router.delete('/evolution/chat/delete-for-everyone', deleteEvolutionMessageForEveryone);
router.post('/evolution/chat/update-message', postEvolutionUpdateMessage);
router.post('/evolution/chat/send-presence', postEvolutionSendPresence);
router.post('/evolution/instance/set-presence', postEvolutionSetInstancePresence);
router.post('/evolution/chat/block-status', postEvolutionUpdateBlockStatus);
router.post('/evolution/chat/profile-picture', postEvolutionFetchProfilePicture);
router.post('/evolution/chat/media-base64', postEvolutionGetBase64Media);

/** Evolution API v2 — Profile settings (sessão conectada + privacidade) */
router.post('/evolution/profile/fetch-contact', postEvolutionFetchContactProfile);
router.post('/evolution/profile/fetch-business', postEvolutionFetchBusinessProfile);
router.post('/evolution/profile/update-name', postEvolutionUpdateSessionProfileName);
router.post('/evolution/profile/update-status', postEvolutionUpdateSessionProfileStatus);
router.post('/evolution/profile/update-picture', postEvolutionUpdateSessionProfilePicture);
router.delete('/evolution/profile/picture', deleteEvolutionSessionProfilePicture);
router.get('/evolution/profile/privacy', getEvolutionPrivacySettings);
router.post('/evolution/profile/privacy', postEvolutionUpdatePrivacySettings);

/** Evolution API v2 — Message Controller (envio de mensagens) */
router.post('/evolution/message/send-text', postEvolutionSendText);
router.post('/evolution/message/send-status', postEvolutionSendStatus);
router.post('/evolution/message/send-media', postEvolutionSendMedia);
router.post('/evolution/message/send-audio', postEvolutionSendWhatsAppAudio);
router.post('/evolution/message/send-sticker', postEvolutionSendSticker);
router.post('/evolution/message/send-location', postEvolutionSendLocation);
router.post('/evolution/message/send-contact', postEvolutionSendContact);
router.post('/evolution/message/send-reaction', postEvolutionSendReaction);
router.post('/evolution/message/send-poll', postEvolutionSendPoll);
router.post('/evolution/message/send-list', postEvolutionSendList);

/** Evolution API v2 — Group Controller (gestão de grupos) */
router.post('/evolution/group/create', postEvolutionGroupCreate);
router.post('/evolution/group/update-picture', postEvolutionGroupUpdatePicture);
router.post('/evolution/group/update-subject', postEvolutionGroupUpdateSubject);
router.post('/evolution/group/update-description', postEvolutionGroupUpdateDescription);
router.get('/evolution/group/invite-code', getEvolutionGroupFetchInviteCode);
router.post('/evolution/group/revoke-invite-code', postEvolutionGroupRevokeInviteCode);
router.post('/evolution/group/send-invite', postEvolutionGroupSendInvite);
router.get('/evolution/group/find-by-invite', getEvolutionGroupFindByInviteCode);
router.get('/evolution/group/find-by-jid', getEvolutionGroupFindByJid);
router.get('/evolution/group/fetch-all', getEvolutionGroupFetchAll);
router.get('/evolution/group/members', getEvolutionGroupFindMembers);
router.post('/evolution/group/update-members', postEvolutionGroupUpdateMembers);
router.post('/evolution/group/update-setting', postEvolutionGroupUpdateSetting);
router.post('/evolution/group/toggle-ephemeral', postEvolutionGroupToggleEphemeral);
router.delete('/evolution/group/leave', deleteEvolutionGroupLeave);

export default router;
