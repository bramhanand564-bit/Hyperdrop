export const EventTypes = Object.freeze({
  MESSAGE_SENT:'message.sent', MESSAGE_RECEIVED:'message.received',
  BOT_CREATED:'bot.created', BOT_STARTED:'bot.started', BOT_COMMAND:'bot.command', BOT_MESSAGE:'bot.message', BOT_BUTTON_CLICKED:'bot.button_clicked',
  MINIAPP_CREATED:'miniapp.created', MINIAPP_OPENED:'miniapp.opened', MINIAPP_INSTALLED:'miniapp.installed', MINIAPP_UPDATED:'miniapp.updated',
  GAME_STARTED:'game.started', GAME_WON:'game.won', GAME_LOST:'game.lost', GAME_SCORE_UPDATED:'game.score_updated',
  PAYMENT_CREATED:'payment.created', PAYMENT_RECEIVED:'payment.received', PAYMENT_FAILED:'payment.failed',
  QR_SCANNED:'qr.scanned', QR_OPENED:'qr.opened',
  USER_CREATED:'user.created', USER_JOINED:'user.joined', USER_FOLLOWED:'user.followed',
  MOMENT_CREATED:'moment.created', MOMENT_LIKED:'moment.liked', MOMENT_SHARED:'moment.shared',
  AUTOMATION_CREATED:'automation.created', AUTOMATION_STARTED:'automation.started', AUTOMATION_COMPLETED:'automation.completed', AUTOMATION_FAILED:'automation.failed',
  AI_REQUESTED:'ai.requested', AI_COMPLETED:'ai.completed', AI_FAILED:'ai.failed'
});