export type FrameProps = {
  /** The page to open. */
  url: string;
  /** The website's address, used to tell its own pages from other sites. */
  base: string;
  /** Changing this reloads the page from the start. */
  reloadKey: number;
  onLoaded: () => void;
  onFailed: (message: string) => void;
  /** The website's own "Log out" was pressed. */
  onLogout: () => void;
  /** The website opened a public event page. */
  onEvent: (slug: string) => void;
};
