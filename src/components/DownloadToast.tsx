import { Show, createSignal, onCleanup, useContext } from "solid-js";
import { I18NContext } from "../i18n/solid";

const VISIBLE_MS = 6000;

type CompletedDownload = { id: number; filename: string };

/** Short notice after a download finishes, with a shortcut to its folder. */
const DownloadToast = () => {
  const { t } = useContext(I18NContext);
  const [download, setDownload] = createSignal<CompletedDownload>();
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => setDownload(undefined), VISIBLE_MS);
  };

  onCleanup(
    window.electronIPCHandlers.onDownloadCompleted((completed) => {
      setDownload(completed);
      scheduleHide();
    })
  );
  onCleanup(() => clearTimeout(hideTimer));

  return (
    <Show when={download()}>
      {(current) => (
        <div
          role="status"
          aria-live="polite"
          title={current().filename}
          class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-stretch overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white shadow-lg shadow-black/40"
          // Keep it open while the pointer is on it.
          onMouseEnter={() => clearTimeout(hideTimer)}
          onMouseLeave={scheduleHide}
        >
          <span class="flex items-center px-4 py-3">
            {t("Attachment saved")}
          </span>
          <span class="my-2 w-px bg-zinc-600" />
          <button
            class="px-4 py-3 font-medium text-indigo-300 outline-none hover:bg-zinc-700 focus-visible:bg-zinc-700"
            onClick={() => {
              void window.showDownloadInFolder(current().id);
              clearTimeout(hideTimer);
              setDownload(undefined);
            }}
          >
            {t("Show in folder")}
          </button>
        </div>
      )}
    </Show>
  );
};

export default DownloadToast;
