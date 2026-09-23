// telegram/TelegramFeatureRegistry.js
// Ordered feature registry for Nax Telegram Bot Studio.
// Existing Nax bot/runtime capabilities remain compatible; this registry only adds missing Telegram controls.

export const TELEGRAM_FEATURES = [
  ['start','/start Command','commands'],['help','/help Command','commands'],['custom_commands','Custom Commands','commands'],
  ['auto_reply','Auto Reply','messages'],['text','Text Messages','messages'],['photo','Photo Messages','messages'],
  ['video','Video Messages','messages'],['audio','Audio Messages','messages'],['voice','Voice Messages','messages'],
  ['document','Document/File Messages','messages'],['sticker','Sticker Support','messages'],['location','Location Support','messages'],
  ['contact','Contact Support','messages'],['polls','Polls','messages'],['inline_buttons','Inline Buttons','buttons'],
  ['reply_buttons','Reply Buttons','buttons'],['inline_keyboard','Inline Keyboard','buttons'],['custom_keyboard','Custom Keyboard','buttons'],
  ['menu_button','Menu Button','buttons'],['callback_buttons','Callback Buttons','buttons'],['edit_messages','Edit Messages','messages'],
  ['delete_messages','Delete Messages','messages'],['pin_messages','Pin Messages','moderation'],['user_registration','User Registration','users'],
  ['user_profile','User Profile','users'],['user_id','User ID Management','users'],['user_database','User Database','users'],
  ['user_blocking','User Blocking','users'],['user_verification','User Verification','security'],['captcha','Captcha','security'],
  ['welcome','Welcome Message','messages'],['goodbye','Goodbye Message','messages'],['auto_moderation','Auto Moderation','moderation'],
  ['spam_filter','Spam Filter','moderation'],['keyword_filter','Keyword Filter','moderation'],['link_filter','Link Filter','moderation'],
  ['warnings','Warning System','moderation'],['mute','Mute','moderation'],['restrict','Restrict','moderation'],
  ['ban','Ban','moderation'],['unban','Unban','moderation'],['admin_controls','Admin Controls','moderation'],
  ['roles','Role/Permission System','security'],['notifications','Auto Notifications','messages'],['scheduled_messages','Scheduled Messages','automation'],
  ['reminders','Reminders','automation'],['broadcast','Broadcast Messages','messages'],['subscriptions','Subscription System','commerce'],
  ['premium','Premium/VIP System','commerce'],['payments','Payment System','commerce'],['orders','Order System','commerce'],
  ['referrals','Referral System','growth'],['invites','Invite System','growth'],['rewards','Reward System','growth'],
  ['points','Points System','growth'],['balance','Balance System','commerce'],['file_upload','File Upload','files'],
  ['file_download','File Download','files'],['file_processing','File Processing','files'],['pdf_processing','PDF Processing','files'],
  ['image_processing','Image Processing','files'],['video_processing','Video Processing','files'],['file_conversion','File Conversion','files'],
  ['search','Search','search'],['inline_search','Inline Search','search'],['ai_chat','AI Chat','ai'],['ai_commands','AI Commands','ai'],
  ['translation','Translation','ai'],['summarization','Summarization','ai'],['quiz','Quiz','engagement'],['poll_voting','Poll/Voting','engagement'],
  ['faq','FAQ','support'],['customer_support','Customer Support','support'],['tickets','Ticket System','support'],['feedback','Feedback System','support'],
  ['forms','Form System','automation'],['multi_step','Multi-Step Conversation','automation'],['deep_linking','Deep Linking','links'],
  ['start_parameters','Start Parameters','links'],['web_app','Web App/Mini App','integrations'],['webhook','Webhook Support','integrations'],
  ['api','API Integration','integrations'],['database','Database Integration','integrations'],['external_services','External Service Integration','integrations'],
  ['analytics','Analytics','analytics'],['user_stats','User Statistics','analytics'],['message_stats','Message Statistics','analytics'],
  ['order_stats','Order Statistics','analytics'],['referral_stats','Referral Statistics','analytics'],['admin_panel','Admin Panel','admin'],
  ['logs','Logs','admin'],['error_handling','Error Handling','admin'],['authentication','Authentication','security'],
  ['access_control','Access Control','security'],['rate_limiting','Rate Limiting','security'],['multi_language','Multi-Language Support','i18n'],
  ['language_detection','Automatic Language Detection','i18n'],['inline_mode','Inline Mode','integrations'],['group_support','Group Support','telegram'],
  ['channel_support','Channel Support','telegram'],
].map(([id,label,category]) => ({ id, label, category }));

export const TELEGRAM_FEATURE_IDS = TELEGRAM_FEATURES.map(item => item.id);

export function createDefaultTelegramFeatures(existing = {}) {
  const output = {};
  TELEGRAM_FEATURES.forEach(item => {
    output[item.id] = existing[item.id] !== false;
  });
  return output;
}

export function getTelegramFeatureLabel(id) {
  return TELEGRAM_FEATURES.find(item => item.id === id)?.label || id;
}

export default TELEGRAM_FEATURES;
