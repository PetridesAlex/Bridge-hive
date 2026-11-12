const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Metro watches `additionalExts` including `local`, so a file like
// `.env.staging.local` is treated as a JS module via require.context and
// crashes Expo web SSR. Keep private staging overrides out of the graph.
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previousBlockList)
    ? previousBlockList
    : previousBlockList
      ? [previousBlockList]
      : []),
  /(^|[/\\])\.env\.staging(\.local)?$/,
];

module.exports = config;
