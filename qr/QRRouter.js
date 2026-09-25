import QRParser from './QRParser';
import { URLValidator } from '../security/URLValidator';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';
import { MiniAppAPI } from '../api/MiniAppAPI';
import BotAPI from '../api/BotAPI';

export const QRRouter = {
  resolve(value) {
    const target = QRParser.parse(value);
    if (!target) throw new Error('Invalid Nax QR code.');
    if (target.type === 'external' && !URLValidator.validateExternalLink(target.url).valid) {
      throw new Error('External URL blocked.');
    }
    EventBus.emit(EventTypes.QR_SCANNED, { target });
    return target;
  },

  async navigate(navigation, target) {
    if (target.type === 'app') {
      const app = await MiniAppAPI.getMiniApp(target.id);
      if (!app) throw new Error('Mini App not found.');
      return navigation.navigate('MiniAppViewer', {
        title: app.name,
        url: app.url,
        appConfig: app,
        entryType: app.entryType || (app.url ? 'web' : 'declarative'),
      });
    }

    if (target.type === 'bot') {
      const bot = await BotAPI.getBot(target.id);
      if (!bot) throw new Error('Bot not found.');
      return navigation.navigate('BotChat', { botData: bot });
    }

    if (target.type === 'pay') {
      return navigation.navigate('Wallet', { transactionId: target.id });
    }

    if (target.type === 'user') {
      return navigation.navigate('PortalHome', { userId: target.id });
    }

    if (target.type === 'store') {
      return navigation.navigate('PortalHome', { itemId: target.id });
    }

    if (target.type === 'external') {
      return navigation.navigate('WebPortal', { url: target.url, title: 'Secure Web' });
    }

    throw new Error('Unsupported QR destination.');
  },
};

export default QRRouter;
