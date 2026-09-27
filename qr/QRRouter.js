import ExperienceAPI from '../api/ExperienceAPI';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';
import QRParser from './QRParser';
import { URLValidator } from '../security/URLValidator';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';
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
      const naxApp = await NaxAppStoreAPI.get(target.id);
      if (naxApp?.status === 'published') return navigation.navigate('NaxAppRuntime', { appId: naxApp.id });
      const experience = await ExperienceAPI.get(target.id);
      if (!experience) throw new Error('Nax App not found.');
      return navigation.navigate('ExperienceRuntime', { experienceId: experience.id });
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
      throw new Error('User QR links are not supported yet.');
    }

    if (target.type === 'store') {
      const naxApp = await NaxAppStoreAPI.get(target.id);
      if (naxApp?.status === 'published') return navigation.navigate('NaxAppRuntime', { appId: naxApp.id });
      const experience = await ExperienceAPI.get(target.id);
      if (!experience) throw new Error('Nax App not found.');
      return navigation.navigate('ExperienceRuntime', { experienceId: experience.id });
    }

    if (target.type === 'external') {
      return navigation.navigate('ExperienceWebView', { url: target.url, title: 'Secure Web' });
    }

    throw new Error('Unsupported QR destination.');
  },
};

export default QRRouter;
