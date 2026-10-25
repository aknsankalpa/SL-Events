import { useEffect, useRef, type ComponentType, type Ref } from "react";
import { BackHandler, Linking, Platform } from "react-native";
import { WebView as NativeWebView, type WebViewProps } from "react-native-webview";
import { colors } from "@/theme";
import { classify } from "./classify";
import type { FrameProps } from "./types";

// The library types its props as `WebViewProps & undefined` (which is `never`), so give it the props it really takes.
type WebViewHandle = { goBack: () => void };
const WebView = NativeWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

/** The website's mobile view inside the app, on a phone. */
export function PortalFrame({ url, base, reloadKey, onLoaded, onFailed, onLogout, onEvent }: FrameProps) {
  const ref = useRef<WebViewHandle>(null);
  const canGoBack = useRef(false);

  // Android's back button goes back inside the website first, and only leaves the screen from its first page.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false;
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  /** Returns true when the address may load inside the app. */
  function allowed(target: string): boolean {
    const d = classify(target, base);
    if (d.kind === "allow") return true;
    if (d.kind === "logout") onLogout();
    else if (d.kind === "event") onEvent(d.slug);
    else Linking.openURL(d.url).catch(() => undefined);
    return false;
  }

  return (
    <WebView
      key={reloadKey}
      ref={ref}
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: colors.page }}
      containerStyle={{ backgroundColor: colors.page }}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      // Lets the website tell it is running inside the app.
      applicationNameForUserAgent="SLEventsApp/1.0"
      injectedJavaScriptBeforeContentLoaded="window.__SL_EVENTS_APP__ = true; true;"
      setSupportMultipleWindows={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      pullToRefreshEnabled
      allowsBackForwardNavigationGestures
      onLoadEnd={onLoaded}
      onError={(e) => onFailed(e.nativeEvent.description || "The page could not be loaded.")}
      onHttpError={(e) => onFailed(`The website answered with an error (${e.nativeEvent.statusCode}).`)}
      onShouldStartLoadWithRequest={(req) => {
        // Frames inside the page (like the event preview) are part of it, not navigation.
        if (req.isTopFrame === false) return true;
        return allowed(req.url);
      }}
      onNavigationStateChange={(nav) => {
        canGoBack.current = nav.canGoBack;
        // The website moves between its own pages without reloading, so check those moves here too.
        if (!allowed(nav.url)) ref.current?.goBack();
      }}
    />
  );
}
