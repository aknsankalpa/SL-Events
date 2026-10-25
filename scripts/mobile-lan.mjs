// Starts the mobile app (Expo) pointed at the website running on this computer, so a phone on the same Wi-Fi can open
// the organizer and admin areas. Usage: npm run mobile:lan   (start the website first: npm run build && npm start)
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const port = process.env.WEB_PORT || "3000";

// A private network address (192.168.x.x, 10.x.x.x, 172.16-31.x.x), skipping virtual adapters.
const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
const skip = /vethernet|virtualbox|vmware|vpn|wsl|docker|loopback|bluetooth/i;

const candidates = Object.entries(networkInterfaces())
  .filter(([name]) => !skip.test(name))
  .flatMap(([name, list]) => (list ?? []).filter((i) => i.family === "IPv4" && !i.internal && isPrivate(i.address)).map((i) => ({ name, ip: i.address })));

const pick = candidates.find((c) => /wi-?fi|wlan|wireless/i.test(c.name)) ?? candidates[0];
if (!pick) {
  console.error("Could not find this computer's Wi-Fi address. Set it yourself, for example:\n  set EXPO_PUBLIC_WEB_URL=http://192.168.0.10:3000 && npm run mobile:clear");
  process.exit(1);
}

const url = `http://${pick.ip}:${port}`;
console.log(`\nThe app will open the website at ${url}  (${pick.name})`);
console.log("Make sure the website is running (npm run build && npm start) and your phone is on the same Wi-Fi.");
if (candidates.length > 1) console.log("Other addresses found:", candidates.filter((c) => c !== pick).map((c) => `${c.ip} (${c.name})`).join(", "));
console.log("");

if (process.env.DRY_RUN) process.exit(0);

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const child = spawn("npx", ["expo", "start", "-c"], {
  cwd: join(root, "apps", "mobile"),
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_WEB_URL: url },
});
child.on("exit", (code) => process.exit(code ?? 0));
