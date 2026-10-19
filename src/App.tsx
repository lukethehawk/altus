import {
  For,
  type Component,
  createSignal,
  createResource,
  createEffect,
  Show,
  onCleanup,
} from "solid-js";
import { stableTabArray, tabStore } from "./stores/tabs/solid";
import WebView from "./components/WebView";
import TabsList from "./components/TabsList";
import SettingsDialog from "./components/SettingsDialog";
import { twJoin } from "tailwind-merge";
import { getSettingValue } from "./stores/settings/solid";
import CustomTitlebar from "./components/CustomTitlebar";
import { I18NProvider } from "./i18n/solid";
import ThemeManagerDialog from "./components/ThemeManagerDialog";

const App: Component = () => {
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isThemeManagerOpen, setIsThemeManagerOpen] = createSignal(false);
  // WebViews consume substantial CPU during WhatsApp startup. Start the
  // selected account immediately, then spread other accounts over time.
  // Once mounted, every account remains active to keep receiving messages.
  const [startedTabIds, setStartedTabIds] = createSignal<Set<string>>(new Set());
  createEffect(() => {
    const ids = stableTabArray().map((tab) => tab.id);
    const selectedId = tabStore.selectedTabId;
    const started = startedTabIds();

    if (selectedId && ids.includes(selectedId) && !started.has(selectedId)) {
      setStartedTabIds((prev) => new Set([...prev, selectedId]));
      return;
    }

    const nextId = ids.find((id) => !started.has(id));
    if (!nextId) return;
    const timer = setTimeout(() => {
      setStartedTabIds((prev) => new Set([...prev, nextId]));
    }, 650);
    onCleanup(() => clearTimeout(timer));
  });
  const [menu, { refetch: refetchAppMenu }] = createResource(window.getAppMenu);

  const handlers = new Set<() => void>();
  onCleanup(() => {
    for (const cleanup of handlers) {
      cleanup();
    }
  });
  handlers.add(
    window.electronIPCHandlers.onOpenSettings(() => {
      setIsSettingsOpen(true);
    })
  );
  handlers.add(
    window.electronIPCHandlers.onOpenThemeManager(() => {
      setIsThemeManagerOpen(true);
    })
  );
  handlers.add(
    window.electronIPCHandlers.onReloadCustomTitleBar(refetchAppMenu)
  );

  return (
    <I18NProvider>
      <div class="flex flex-col h-full">
        {getSettingValue("customTitlebar") && window.platform !== "darwin" && (
          <CustomTitlebar menu={menu} />
        )}
        <div
          class={twJoin(
            "h-full flex overflow-hidden",
            getSettingValue("tabBarPosition") === "top"
              ? "flex-col"
              : "flex-col-reverse"
          )}
        >
          <TabsList />
          <For each={stableTabArray()}>
            {(tab) => (
              <div
                role="tabpanel"
                id={`tabpanel-${tab.id}`}
                class={twJoin(
                  "min-h-0 flex-grow text-white",
                  tabStore.selectedTabId !== tab.id && "hidden"
                )}
              >
                <Show when={startedTabIds().has(tab.id)}>
                  <WebView tab={tab} />
                </Show>
              </div>
            )}
          </For>
        </div>
        <SettingsDialog isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
        <ThemeManagerDialog
          isOpen={isThemeManagerOpen}
          setIsOpen={setIsThemeManagerOpen}
        />
      </div>
    </I18NProvider>
  );
};

export default App;
