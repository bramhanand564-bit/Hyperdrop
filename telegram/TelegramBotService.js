// telegram/TelegramBotService.js
// Lightweight Telegram Bot API adapter. Tokens stay in SecureStore on the device.
// Production background delivery still requires a webhook/backend; polling is provided for testing and foreground use.

import * as SecureStore from 'expo-secure-store';

const TOKEN_PREFIX = 'nax.telegram.token.';
const API_ROOT = 'https://api.telegram.org';

function tokenKey(botId) {
  return TOKEN_PREFIX + String(botId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function requireId(value, name) {
  if (!value) throw new Error(name + ' is required.');
  return value;
}

const TelegramBotService = {
  async saveToken(botId, token) {
    requireId(botId, 'Bot id');
    const value = String(token || '').trim();
    if (!value) throw new Error('Telegram bot token is required.');
    await SecureStore.setItemAsync(tokenKey(botId), value);
    return true;
  },

  async deleteToken(botId) {
    await SecureStore.deleteItemAsync(tokenKey(botId));
    return true;
  },

  async hasToken(botId) {
    return !!(await SecureStore.getItemAsync(tokenKey(botId)));
  },

  async call(botId, method, params = {}) {
    const token = await SecureStore.getItemAsync(tokenKey(botId));
    if (!token) throw new Error('Connect a Telegram bot token first.');
    const response = await fetch(API_ROOT + '/bot' + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data?.description || 'Telegram API request failed.');
    }
    return data.result;
  },

  getMe(botId) { return this.call(botId, 'getMe'); },
  getWebhookInfo(botId) { return this.call(botId, 'getWebhookInfo'); },
  deleteWebhook(botId, dropPendingUpdates = false) { return this.call(botId, 'deleteWebhook', { drop_pending_updates: dropPendingUpdates }); },

  setWebhook(botId, url, secretToken = '') {
    const value = String(url || '').trim();
    if (!/^https:\/\//i.test(value)) throw new Error('Webhook URL must use HTTPS.');
    const params = { url: value };
    if (secretToken) params.secret_token = String(secretToken).trim().slice(0, 256);
    return this.call(botId, 'setWebhook', params);
  },

  getUpdates(botId, offset, timeout = 0) {
    return this.call(botId, 'getUpdates', {
      ...(offset ? { offset } : {}),
      timeout: Math.max(0, Math.min(Number(timeout) || 0, 50)),
      allowed_updates: ['message','edited_message','callback_query','inline_query','chat_member','my_chat_member','message_reaction','message_reaction_count','chat_join_request'],
    });
  },

  sendMessage(botId, chatId, text, options = {}) {
    return this.call(botId, 'sendMessage', {
      chat_id: chatId, text: String(text || '').slice(0, 4096), ...options,
    });
  },
  editMessageText(botId, chatId, messageId, text, options = {}) {
    return this.call(botId, 'editMessageText', { chat_id: chatId, message_id: messageId, text, ...options });
  },
  deleteMessage(botId, chatId, messageId) {
    return this.call(botId, 'deleteMessage', { chat_id: chatId, message_id: messageId });
  },
  pinMessage(botId, chatId, messageId, disableNotification = false) {
    return this.call(botId, 'pinChatMessage', { chat_id: chatId, message_id: messageId, disable_notification: disableNotification });
  },
  answerCallback(botId, callbackQueryId, text = '', showAlert = false) {
    return this.call(botId, 'answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}), show_alert: showAlert });
  },
  sendPhoto(botId, chatId, photo, caption = '', options = {}) {
    return this.call(botId, 'sendPhoto', { chat_id: chatId, photo, ...(caption ? { caption } : {}), ...options });
  },
  sendVideo(botId, chatId, video, caption = '', options = {}) {
    return this.call(botId, 'sendVideo', { chat_id: chatId, video, ...(caption ? { caption } : {}), ...options });
  },
  sendAudio(botId, chatId, audio, options = {}) {
    return this.call(botId, 'sendAudio', { chat_id: chatId, audio, ...options });
  },
  sendVoice(botId, chatId, voice, options = {}) {
    return this.call(botId, 'sendVoice', { chat_id: chatId, voice, ...options });
  },
  sendDocument(botId, chatId, document, options = {}) {
    return this.call(botId, 'sendDocument', { chat_id: chatId, document, ...options });
  },
  sendSticker(botId, chatId, sticker) {
    return this.call(botId, 'sendSticker', { chat_id: chatId, sticker });
  },
  sendLocation(botId, chatId, latitude, longitude, options = {}) {
    return this.call(botId, 'sendLocation', { chat_id: chatId, latitude, longitude, ...options });
  },
  sendContact(botId, chatId, phoneNumber, firstName, options = {}) {
    return this.call(botId, 'sendContact', { chat_id: chatId, phone_number: phoneNumber, first_name: firstName, ...options });
  },
  sendAnimation(botId, chatId, animation, options = {}) { return this.call(botId, 'sendAnimation', { chat_id: chatId, animation, ...options }); },
  sendVideoNote(botId, chatId, videoNote, options = {}) { return this.call(botId, 'sendVideoNote', { chat_id: chatId, video_note: videoNote, ...options }); },
  sendDice(botId, chatId, emoji = '🎲') { return this.call(botId, 'sendDice', { chat_id: chatId, emoji }); },
  sendChatAction(botId, chatId, action = 'typing') { return this.call(botId, 'sendChatAction', { chat_id: chatId, action }); },
  copyMessage(botId, chatId, fromChatId, messageId, options = {}) { return this.call(botId, 'copyMessage', { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId, ...options }); },
  forwardMessage(botId, chatId, fromChatId, messageId, options = {}) { return this.call(botId, 'forwardMessage', { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId, ...options }); },
  editReplyMarkup(botId, chatId, messageId, replyMarkup) { return this.call(botId, 'editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }); },
  setMessageReaction(botId, chatId, messageId, reaction = []) { return this.call(botId, 'setMessageReaction', { chat_id: chatId, message_id: messageId, reaction }); },
  getChatMember(botId, chatId, userId) { return this.call(botId, 'getChatMember', { chat_id: chatId, user_id: userId }); },
  leaveChat(botId, chatId) { return this.call(botId, 'leaveChat', { chat_id: chatId }); },
  createInviteLink(botId, chatId, options = {}) { return this.call(botId, 'createChatInviteLink', { chat_id: chatId, ...options }); },
  approveJoinRequest(botId, chatId, userId) { return this.call(botId, 'approveChatJoinRequest', { chat_id: chatId, user_id: userId }); },
  answerInlineQuery(botId, inlineQueryId, results = [], options = {}) { return this.call(botId, 'answerInlineQuery', { inline_query_id: inlineQueryId, results, ...options }); },
  setChatTitle(botId, chatId, title) { return this.call(botId, 'setChatTitle', { chat_id: chatId, title: String(title || '').slice(0, 128) }); },
  setChatDescription(botId, chatId, description) { return this.call(botId, 'setChatDescription', { chat_id: chatId, description: String(description || '').slice(0, 255) }); },
  setChatPhoto(botId, chatId, photo) { return this.call(botId, 'setChatPhoto', { chat_id: chatId, photo }); },
  sendPoll(botId, chatId, question, options = {}) {
    return this.call(botId, 'sendPoll', { chat_id: chatId, question, ...options });
  },
  setCommands(botId, commands = []) {
    return this.call(botId, 'setMyCommands', {
      commands: commands.slice(0, 100).map(item => ({
        command: String(item.command || item.name || '').replace(/^\//, '').slice(0, 32),
        description: String(item.description || '').slice(0, 256),
      })).filter(item => item.command && item.description),
    });
  },
  setMenuButton(botId, menuButton) {
    return this.call(botId, 'setChatMenuButton', { menu_button: menuButton });
  },
  banUser(botId, chatId, userId, untilDate = 0) {
    return this.call(botId, 'banChatMember', { chat_id: chatId, user_id: userId, ...(untilDate ? { until_date: untilDate } : {}) });
  },
  unbanUser(botId, chatId, userId, onlyIfBanned = true) {
    return this.call(botId, 'unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: onlyIfBanned });
  },
  restrictUser(botId, chatId, userId, permissions, untilDate = 0) {
    return this.call(botId, 'restrictChatMember', { chat_id: chatId, user_id: userId, permissions, ...(untilDate ? { until_date: untilDate } : {}) });
  },
  promoteAdmin(botId, chatId, userId, permissions = {}) {
    return this.call(botId, 'promoteChatMember', { chat_id: chatId, user_id: userId, ...permissions });
  },
};

export default TelegramBotService;
export { TelegramBotService };
