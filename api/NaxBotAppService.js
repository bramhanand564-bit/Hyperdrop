import { auth } from '../firebaseConfig';
import NaxAppStoreAPI from './NaxAppStoreAPI';
import BotAPI from './BotAPI';
import { DEFAULT_GATEWAY } from './ExperienceGateway';

const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const buttonData = bot => (Array.isArray(bot?.buttons) ? bot.buttons : []).slice(0, 20).map((button, index) => ({
  id: String(button?.id || button?.buttonId || button?.name || ('button_' + index)).slice(0, 80),
  label: String(button?.label || button?.text || button?.name || ('Option ' + (index + 1))).slice(0, 60),
  type: String(button?.type || 'text').toLowerCase(),
  command: String(button?.command || '').replace(/^\/+/, '').slice(0, 100),
  text: String(button?.text || button?.label || '').slice(0, 500),
}));

const createBotConnector = bot => ({
  version: 1,
  enabled: true,
  sourceType: 'bot',
  sourceId: bot?.id || '',
  title: bot?.name || 'Bot App',
  description: bot?.description || 'A bot-powered Nax App.',
  icon: '🤖',
  mode: 'compact',
  capabilities: ['bot','chat','share','open'],
  permissions: { read:true, write:true, share:true },
  fields: [{ id:'message', label:'Message', type:'text', placeholder:'Message the bot…', required:false }],
  actions: [{ id:'send', label:'Send', type:'submit', fieldId:'message', primary:true, requiresAuth:true }].concat(buttonData(bot).map(button => ({
    id:'button_' + button.id,
    label:button.label,
    type:'submit',
    fieldId:'message',
    value:button.type === 'command' ? '/' + button.command : (button.text || button.label),
    primary:false,
    requiresAuth:true,
  }))),
  initialState: { message:'' },
  chat: { presentation:'bot', showDescription:true, showStatus:true, allowInlineActions:true, maxFields:1, maxActions:5 },
});

const createHtml = bot => {
  const title = esc(bot?.name || 'Bot App');
  const description = esc(bot?.description || 'Bot-powered Nax App');
  const buttons = buttonData(bot);
  const buttonsHtml = buttons.map(button => '<button data-id="' + esc(button.id) + '" data-command="' + esc(button.command || '') + '">' + esc(button.label) + '</button>').join('');
  const botPayload = JSON.stringify({ botId:bot?.id || '', name:bot?.name || 'Bot App', username:bot?.username || '' }).replace(/<\/script/gi,'<\\/script');
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>' +
    'body{margin:0;background:#f5f7fb;color:#142532;font-family:system-ui}.wrap{max-width:760px;margin:auto;padding:20px}.card{background:#fff;border:1px solid #dbe5ef;border-radius:22px;padding:18px}.head{display:flex;gap:12px;align-items:center}.icon{width:48px;height:48px;border-radius:15px;background:#eef6ff;display:flex;align-items:center;justify-content:center;font-size:24px}.sub{color:#6c8494;font-size:12px;margin-top:3px}.status{color:#34a853;font-size:9px;font-weight:900;margin-top:4px}.log{height:46vh;overflow:auto;margin-top:15px;border:1px solid #e5edf5;border-radius:15px;padding:10px;background:#f9fbfd}.m{padding:9px 11px;border-radius:14px;margin:6px 0;max-width:82%;font-size:13px;line-height:18px}.u{background:#087eff;color:#fff;margin-left:auto}.b{background:#eef5fb;color:#142532}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}button{border:1px solid #bcd3ea;background:#fff;border-radius:11px;padding:9px 12px;font-weight:800;color:#087eff}input{flex:1;border:1px solid #cbd9e7;border-radius:12px;padding:11px;font-size:13px}.send{background:#087eff;color:#fff;border-color:#087eff}</style></head><body><main class="wrap"><section class="card"><div class="head"><div class="icon">🤖</div><div><h2 style="margin:0">' + title + '</h2><div class="sub">' + description + '</div><div class="status">LIVE BOT APP · CONNECTED TO ORIGINAL BOT</div></div></div><div id="log" class="log"><div class="m b">' + esc(bot?.welcomeMessage || ('Welcome to ' + (bot?.name || 'this bot') + '.')) + '</div></div><div class="row" id="buttons">' + buttonsHtml + '</div><div class="row"><input id="input" placeholder="Message the bot…"><button class="send" id="send">Send</button></div></section></main><script>const BOT=' + botPayload + ';const log=document.getElementById("log");const input=document.getElementById("input");function add(text,cls){const el=document.createElement("div");el.className="m "+cls;el.textContent=String(text||"");log.appendChild(el);log.scrollTop=log.scrollHeight;}function send(text){const value=String(text||input.value||"").trim();if(!value)return;input.value="";add(value,"u");window.Nax&&window.Nax.sendBotMessage(value);}document.getElementById("send").onclick=function(){send("");};document.getElementById("buttons").querySelectorAll("button").forEach(function(b){b.onclick=function(){const command=b.getAttribute("data-command");send(command ? ("/"+command) : b.textContent);};});input.addEventListener("keydown",function(e){if(e.key==="Enter")send("");});window.__naxBotResponse=function(reply){if(reply&&reply.text)add(reply.text,"b");};</script></body></html>';
};

const NaxBotAppService = {
  normalizeBotConnector: createBotConnector,
  async convertBotToApp(bot) {
    const uid = auth?.currentUser?.uid;
    if (!uid) throw new Error('Authentication required.');
    if (!bot?.id) throw new Error('Bot data is required.');
    if (bot.developerId !== uid && bot.ownerId !== uid && bot.creatorId !== uid) throw new Error('Only the bot creator can convert this bot to an app.');
    const connector = createBotConnector(bot);
    const published = await NaxAppStoreAPI.publishStandalone({
      name: bot.name || 'Bot App',
      title: bot.name || 'Bot App',
      description: bot.description || 'Bot-powered Nax App.',
      icon: '🤖',
      category: 'ai',
      html: createHtml(bot),
      sourceType: 'bot',
      sourceId: bot.id,
      botId: bot.id,
      connector,
      gateway: DEFAULT_GATEWAY,
    });
    await BotAPI.updateValidatedBot(bot.id, { naxAppId: published.id, convertedToApp: true, convertedAt: new Date().toISOString() }).catch(() => {});
    return published;
  },
};

export default NaxBotAppService;