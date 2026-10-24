import { useCallback, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useStaffState } from "./store";

/**
 * Whether the phone can reach the server. The staff screen refuses to admit anyone while this is false: a ticket
 * can only be checked against the server, so scanning offline would let the same ticket in twice.
 * "Offline" also turns on from the account screen, so the offline design can be seen on a phone with signal.
 */
export function useConnection() {
  const { offline: forced } = useStaffState();
  const [reachable, setReachable] = useState(true);
  const [lastConnected, setLastConnected] = useState<string>(() => clockLabel());

  useEffect(() => {
    return NetInfo.addEventListener((s) => {
      const ok = s.isConnected !== false && s.isInternetReachable !== false;
      setReachable(ok);
      if (ok) setLastConnected(clockLabel());
    });
  }, []);

  const retry = useCallback(async () => {
    const s = await NetInfo.fetch();
    const ok = s.isConnected !== false && s.isInternetReachable !== false;
    setReachable(ok);
    if (ok) setLastConnected(clockLabel());
    return ok;
  }, []);

  return { online: reachable && !forced, lastConnected, retry };
}

export function clockLabel(d = new Date()) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
}
