/**
 * Canonical Bot business-logic layer.
 * All Firestore access flows through api/BotAPI.js.
 */
import BotAPI from '../api/BotAPI';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';

class BotService {
  getDiscoverableBots() {
    return BotAPI.searchBots('');
  }

  getUserBots(userId) {
    return BotAPI.getUserBots(userId);
  }

  getBotById(botId) {
    return BotAPI.getBot(botId);
  }

  checkUsernameAvailable(username) {
    return BotAPI.isBotUsernameAvailable(username);
  }

  createBot(userId, botData) {
    return BotAPI.createValidatedBot(userId, botData).then(bot => { EventBus.emit(EventTypes.BOT_CREATED, { botId: bot.id, userId }); return bot; });
  }

  updateBot(botId, updates) {
    return BotAPI.updateValidatedBot(botId, updates);
  }

  deleteBot(botId) {
    return BotAPI.deleteBot(botId);
  }

  recordBotUsage(botId) {
    return BotAPI.recordBotUsage(botId).then(result => { EventBus.emit(EventTypes.BOT_STARTED, { botId }); return result; });
  }
}

const botService = new BotService();
export { botService as BotService };
export default botService;
