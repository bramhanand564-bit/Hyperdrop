import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BotService } from '../services/BotService';

/**
 * BotMessageHandler
 * Handles incoming messages directed at a bot and generates automatic responses.
 */
export const BotMessageHandler = {
  
  processMessage: async (chatId, botId, userMessageText, userName) => {
    try {
      const bot = await BotService.getBotById(botId);
      if (!bot) return;

      let responseText = "Sorry, I am still learning!";
      let buttons = null; // ---> NEW: Array for Telegram-style inline buttons <---
      
      const text = userMessageText.trim().toLowerCase();

      // --- COMMANDS & BUTTON RESPONSES ---
      if (text === '/start') {
        responseText = bot.welcomeMessage || `Hello ${userName}! I am ${bot.name}. How can I help you?`;
        buttons = [
          { text: '🛠 Help Menu', action: '/help' },
          { text: 'ℹ️ About Bot', action: '/about' }
        ];
      } 
      else if (text === '/help') {
        responseText = `Here are my available commands:\n\n/start - Restart the bot\n/help - Show this menu\n/about - Learn more about me`;
        buttons = [
          { text: '📞 Contact Creator', action: '/support' }
        ];
      } 
      else if (text === '/about') {
        responseText = bot.description || `I am a smart bot running on the Nax Super App ecosystem!`;
      } 
      else if (text === '/support') {
        responseText = `My creator is currently upgrading my features. Please check back later!`;
      }
      else {
        responseText = `I received: "${userMessageText}". My AI functions are currently being upgraded by my creator!`;
      }

      // --- SEND BOT MESSAGE TO FIRESTORE ---
      const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
      
      await addDoc(collection(db, collectionPath), {
        text: responseText,
        type: 'text',
        senderId: bot.id,
        senderName: `🤖 ${bot.name}`,
        senderUniqueId: `@${bot.username}`,
        isBot: true,
        botButtons: buttons, // ---> NEW: Save buttons to database <---
        createdAt: serverTimestamp(),
        read: false,
      });

    } catch (error) {
      console.log('Bot Message Handler Error:', error);
    }
  }
};
