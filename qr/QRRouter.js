import QRParser from './QRParser';
import { URLValidator } from '../security/BotValidator';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';

export const QRRouter={
  resolve(value){
    const target=QRParser.parse(value);
    if(!target) throw new Error('Invalid Nax QR code.');
    if(target.type==='external' && !URLValidator.scanMiniAppUrl(target.url).isSafe) throw new Error('External URL blocked.');
    EventBus.emit(EventTypes.QR_SCANNED,{target});
    return target;
  },
  navigate(navigation,target){
    if(target.type==='app') return navigation.navigate('MiniAppViewer',{appId:target.id});
    if(target.type==='bot') return navigation.navigate('BotChat',{botId:target.id});
    if(target.type==='pay') return navigation.navigate('Wallet',{transactionId:target.id});
    if(target.type==='user') return navigation.navigate('PortalHome',{userId:target.id});
    if(target.type==='store') return navigation.navigate('PortalHome',{itemId:target.id});
    if(target.type==='external') return navigation.navigate('WebPortal',{url:target.url});
    throw new Error('Unsupported QR destination.');
  }
};
export default QRRouter;