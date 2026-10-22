const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// The booking rules, mock data and stores live in the website's lib folder and are shared with this app as "@core/*".
// Metro only bundles files it watches, so the folder is added here; "@/*" is this app's own src folder.
const shared = path.resolve(__dirname, "../web/src/lib");
config.watchFolders = [...(config.watchFolders ?? []), shared];

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let name = moduleName;
  if (name.startsWith("@core/")) name = path.join(shared, name.slice("@core/".length));
  else if (name.startsWith("@/")) name = path.join(__dirname, "src", name.slice(2));
  return (upstream ?? context.resolveRequest)(context, name, platform);
};

module.exports = config;
