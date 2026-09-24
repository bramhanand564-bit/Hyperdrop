// telegram/TelegramUpdateProcessor.js
// Maps Telegram updates to the existing Nax BotRuntime. No duplicate bot engine is created.

import BotRuntime from '../bot-runtime/BotRuntime';
import TelegramBotService from './TelegramBotService';

function getMessage(update) {
  return update?.message || update?.edited_message || null;
}

function getText(message) {
  return message?.text || message?.caption || '';
}

function normalizeUser(message) {
  const user = message?.from || {};
  return {
    id: user.id,
    telegramId: user.id,
    username: user.username || '',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    languageCode: user.language_code || '',
    isBot: !!user.is_bot,
  };
}

function inlineKeyboard(buttons = []) {
  return buttons.map(row => row.map(button => ({
    text: String(button.label || button.text || 'Button'),
    callback_data: String(button.id || button.callback_data || button.command || '').slice(0, 64),
    ...(button.url ? { url: button.url } : {}),
  })));
}

const TelegramUpdateProcessor = {
  async process(bot, update) {
    const message = getMessage(update);
    if (!message) {
      if (update?.callback_query) {
        const q = update.callback_query;
        await TelegramBotService.answerCallback(bot.id, q.id);
        const chatId = q.message?.chat?.id;
        if (chatId !== undefined && q.data) {
          const runtime = new BotRuntime({
            bot,
            user: { id:q.from?.id, telegramId:q.from?.id, username:q.from?.username || '', firstName:q.from?.first_name || '' },
            metadata: { source:'telegram', updateId:update.update_id, chatId, callback:true },
          });
          runtime.start();
          const result = runtime.handleMessage({ id:String(update.update_id || Date.now()), text:String(q.data), type:'callback', metadata:{telegramCallback:q} });
          if (result?.response?.text) await TelegramBotService.sendMessage(bot.id, chatId, result.response.text);
          return result;
        }
      }
      return { handled: false, reason: 'non_message_update' };
    }

    const chatId = message.chat?.id;
    if (chatId === undefined || chatId === null) return { handled: false, reason: 'missing_chat' };

    const runtime = new BotRuntime({
      bot,
      user: normalizeUser(message),
      metadata: { source: 'telegram', updateId: update.update_id, chatId },
    });

    runtime.start();
    const result = runtime.handleMessage({
      id: String(update.update_id || Date.now()),
      text: getText(message),
      type: message.photo ? 'photo' : message.video ? 'video' : message.audio ? 'audio' : message.voice ? 'voice' : message.document ? 'document' : message.sticker ? 'sticker' : message.location ? 'location' : message.contact ? 'contact' : message.poll ? 'poll' : 'text',
      metadata: { telegramMessage: message },
    });

    if (result?.response?.text) {
      const options = {};
      if (Array.isArray(result.response.buttons) && result.response.buttons.length) {
        options.reply_markup = { inline_keyboard: inlineKeyboard([result.response.buttons]) };
      }
      if (result.response.link) {
        options.reply_markup = { inline_keyboard: [[{ text: 'Open', url: result.response.link }]] };
      }
      await TelegramBotService.sendMessage(bot.id, chatId, result.response.text, options);
    }

    return result;
  },
};

export default TelegramUpdateProcessor;
