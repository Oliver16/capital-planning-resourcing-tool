const SUPABASE_ENV_MAPPINGS = {
  REACT_APP_SUPABASE_URL: [
    'REACT_APP_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'STORAGE_NEXT_PUBLIC_SUPABASE_URL',
    'STORAGE_SUPABASE_URL',
  ],
  REACT_APP_SUPABASE_ANON_KEY: [
    'REACT_APP_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'STORAGE_SUPABASE_ANON_KEY',
  ],
};

const normalizeEnvDefinitions = (config) => {
  const definePlugin = (config.plugins || []).find(
    (plugin) => plugin && plugin.constructor && plugin.constructor.name === 'DefinePlugin'
  );

  if (!definePlugin || !definePlugin.definitions) {
    return;
  }

  const envDefinitions = definePlugin.definitions['process.env'] || {};

  Object.entries(SUPABASE_ENV_MAPPINGS).forEach(([targetKey, aliases]) => {
    const resolvedValue = aliases
      .map((alias) => process.env[alias])
      .find((value) => value !== undefined && value !== null && value !== '');

    const stringifiedResolved =
      resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== ''
        ? JSON.stringify(resolvedValue)
        : null;

    if (stringifiedResolved) {
      envDefinitions[targetKey] = stringifiedResolved;
    } else if (!envDefinitions[targetKey]) {
      envDefinitions[targetKey] = JSON.stringify('');
    }

    aliases.forEach((alias) => {
      if (stringifiedResolved) {
        envDefinitions[alias] = stringifiedResolved;
      } else if (!envDefinitions[alias]) {
        envDefinitions[alias] = JSON.stringify('');
      }
    });
  });

  definePlugin.definitions['process.env'] = envDefinitions;
};

module.exports = function override(config) {
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    fs: false,
    path: false,
    crypto: false,
  };

  normalizeEnvDefinitions(config);

  return config;
};
