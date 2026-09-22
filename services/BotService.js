/**
 * Canonical Bot business-logic layer.
 * All Firestore access flows through api/BotAPI.js.
 */
import BotAPI from '../api/BotAPI';

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
    return BotAPI.createValidatedBot(userId, botData);
  }

  updateBot(botId, updates) {
    return BotAPI.updateValidatedBot(botId, updates);
  }

  deleteBot(botId) {
    return BotAPI.deleteBot(botId);
  }

  recordBotUsage(botId) {
    return BotAPI.recordBotUsage(botId);
  }
}

const botService = new BotService();
export { botService as BotService };
export default botService;
