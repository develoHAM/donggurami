// Extends the static app.json. The only thing added here is experiments.baseUrl,
// which web needs when served from a GitHub Pages PROJECT subpath
// (https://<user>.github.io/<repo>/). The deploy workflow sets EXPO_BASE_URL to
// "/<repo>"; locally it is empty so the app builds for the root path.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments || {}),
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
});
