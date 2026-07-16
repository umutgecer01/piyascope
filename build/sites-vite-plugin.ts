import { Plugin } from 'vite';

export function sites(): Plugin {
  return {
    name: 'sites-plugin',
    apply: 'serve',
    configResolved(config) {
      // Plugin configuration
    },
  };
}
