import type { Input, WebContents } from "electron";

/**
 * What Altus + does with a key typed in a WhatsApp tab:
 * - "newline": replace Enter with Shift+Enter (a new line in WhatsApp);
 * - "send": replace the keys with a plain Enter, which sends the message;
 * - "pass": leave the key to WhatsApp.
 */
export type EnterAction = "newline" | "send" | "pass";

export type EnterSettings = {
  preventEnter: boolean;
  sendWithRightShiftEnter: boolean;
};

type KeyInput = Pick<Input, "type" | "key" | "shift" | "control" | "alt" | "meta"> &
  Partial<Pick<Input, "location" | "isComposing">>;

// KeyboardEvent.DOM_KEY_LOCATION_RIGHT: the right-hand Shift.
const RIGHT = 2;
// The Enter we send comes back through before-input-event; it is let through
// only right after we sent it, so a real Enter is never mistaken for it.
const SYNTHETIC_ENTER_MS = 500;

/** Per-tab state: whether Right Shift is down and our own Enter is on its way. */
export class EnterKeys {
  private rightShiftDown = false;
  private syntheticEnterUntil = 0;

  handle(input: KeyInput, settings: () => EnterSettings, now: number): EnterAction {
    if (input.key === "Shift") {
      if (input.location === RIGHT) this.rightShiftDown = input.type === "keyDown";
      return "pass";
    }
    const isEnterDown = input.type === "keyDown" && input.key === "Enter";
    if (isEnterDown && this.syntheticEnterUntil) {
      const ours = now <= this.syntheticEnterUntil && !input.shift && !input.control;
      this.syntheticEnterUntil = 0;
      // Our own Enter has no Shift but Right Shift may still be held.
      if (ours) return "pass";
    }
    // No Shift held: Right Shift cannot be down, whatever we saw before.
    if (!input.shift) this.rightShiftDown = false;
    if (!isEnterDown || input.isComposing || input.alt || input.meta) return "pass";

    const { preventEnter, sendWithRightShiftEnter } = settings();
    let action: EnterAction = "pass";
    if (sendWithRightShiftEnter && input.shift && this.rightShiftDown && !input.control) {
      action = "send";
    } else if (preventEnter && input.control && !input.shift) {
      action = "send";
    } else if (preventEnter && !input.shift && !input.control) {
      action = "newline";
    }
    if (action === "send") this.syntheticEnterUntil = now + SYNTHETIC_ENTER_MS;
    return action;
  }

  /** The tab lost focus: a Shift released elsewhere would otherwise stay down. */
  reset() {
    this.rightShiftDown = false;
  }
}

/** Applies the Enter settings to a WhatsApp tab. */
export function attachEnterKeys(webContents: WebContents, settings: () => EnterSettings) {
  const keys = new EnterKeys();
  webContents.on("blur", () => keys.reset());
  webContents.on("before-input-event", (event, input) => {
    const action = keys.handle(input, settings, Date.now());
    if (action === "pass") return;
    event.preventDefault();
    // Not keyCode "Shift+Return": Electron sends that as an empty key.
    webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "Return",
      modifiers: action === "newline" ? ["shift"] : [],
    });
  });
}
