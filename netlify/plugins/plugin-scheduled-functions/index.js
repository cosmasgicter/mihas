/**
 * Minimal placeholder implementation of the Netlify Scheduled Functions plugin.
 *
 * The official plugin is not available in this environment, so this shim avoids
 * local development failures by registering the hooks expected by Netlify CLI.
 */
module.exports = {
  name: '@netlify/plugin-scheduled-functions',
  // Netlify Build expects plugin hooks to be functions. We provide no-ops so
  // that the CLI can continue to run without throwing missing plugin errors.
  async onPreBuild() {
    console.log('Using local @netlify/plugin-scheduled-functions shim.');
  },
};
