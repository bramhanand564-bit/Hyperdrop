import { MiniAppAPI } from '../api/MiniAppAPI';

export const MiniAppRegistry = {
  getAllApps: () => MiniAppAPI.getPublicMiniApps(),
  getAppsByCategory: async category => {
    const apps = await MiniAppAPI.getPublicMiniApps();
    return category === 'All' ? apps : apps.filter(app => app.category === category);
  },
  searchApps: searchQuery => MiniAppAPI.searchMiniApps(searchQuery),
  getAppById: async appId => {
    const apps = await MiniAppAPI.getPublicMiniApps();
    return apps.find(app => app.id === appId) || null;
  }
};

export default MiniAppRegistry;
