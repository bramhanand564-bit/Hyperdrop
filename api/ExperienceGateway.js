export const DEFAULT_GATEWAY = {
  version: 1,
  enabled: true,
  visibility: 'public',
  entrypoints: {
    chat: true,
    discover: true,
    moments: true,
    settings: true,
    web: true,
    deepLink: true,
  },
  chat: {
    enabled: true,
    presentation: 'card',
    showProgress: true,
    showStatus: true,
    actions: ['primary', 'open'],
  },
  capabilities: ['experience.read', 'experience.state', 'events.write', 'chat.share'],
};

export const normalizeGateway = gateway => ({
  ...DEFAULT_GATEWAY,
  ...(gateway || {}),
  entrypoints: { ...DEFAULT_GATEWAY.entrypoints, ...(gateway?.entrypoints || {}) },
  chat: { ...DEFAULT_GATEWAY.chat, ...(gateway?.chat || {}) },
  capabilities: Array.isArray(gateway?.capabilities) ? gateway.capabilities.slice(0, 40) : DEFAULT_GATEWAY.capabilities,
});

export const createGatewayId = experienceId => 'gw_' + String(experienceId || Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);

export const gatewayLink = experienceId => 'hyperdrop://experience/' + encodeURIComponent(experienceId);

export default { DEFAULT_GATEWAY, normalizeGateway, createGatewayId, gatewayLink };
