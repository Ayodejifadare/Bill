// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// Monorepo root: two levels up from apps/mobile
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// Allow importing files from the monorepo (e.g., ../../shared)
config.watchFolders = [workspaceRoot];

// Ensure Metro can resolve modules from both app and workspace node_modules
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  // Allow Metro to resolve nested dependencies from package node_modules
  // (needed for packages like Storybook and RN internals)
};

module.exports = config;
