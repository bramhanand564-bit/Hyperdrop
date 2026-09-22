export const AIModelUtils = {
  normalizeModelList(value) {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  },
};
export default AIModelUtils;
