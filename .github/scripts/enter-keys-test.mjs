// Drives src/utils/keyboard.ts in a real Electron window: key presses sent
// with sendInputEvent go through attachEnterKeys, as typing does in a
// WhatsApp tab, and the page records which Enter key downs reach it.
// Run with `yarn test:keys` (needs a desktop session; Windows in CI).
import { app, BrowserWindow } from "electron";
import { attachEnterKeys } from "../../src/utils/keyboard.ts";

const settings = { preventEnter: false, sendWithRightShiftEnter: false };
const shift = (type, side) => ({ type, keyCode: "Shift", modifiers: type === "keyDown" ? ["shift", side] : [side] });
const enter = (...modifiers) => ({ type: "keyDown", keyCode: "Return", modifiers });
const letter = { type: "keyDown", keyCode: "A" };

// [name, settings, keys, Enter key downs the page must get]
const cases = [
  ["Enter, default", [false, false], [enter()], ["Enter"]],
  ["Enter, preventEnter: new line", [true, false], [enter()], ["Shift+Enter"]],
  ["Ctrl+Enter, preventEnter: sends", [true, false], [enter("control")], ["Enter"]],
  ["Right Shift+Enter, option on: sends", [true, true], [shift("keyDown", "right"), enter("shift"), shift("keyUp", "right")], ["Enter"]],
  ["Right Shift+Enter, option on, Enter sends anyway", [false, true], [shift("keyDown", "right"), enter("shift"), shift("keyUp", "right")], ["Enter"]],
  ["Right Shift+Enter, option off: new line", [true, false], [shift("keyDown", "right"), enter("shift"), shift("keyUp", "right")], ["Shift+Enter"]],
  ["Left Shift+Enter, option on: new line", [true, true], [shift("keyDown", "left"), enter("shift"), shift("keyUp", "left")], ["Shift+Enter"]],
  ["Right Shift released, then Left Shift+Enter: new line", [true, true],
    [shift("keyDown", "right"), shift("keyUp", "right"), shift("keyDown", "left"), enter("shift"), shift("keyUp", "left")], ["Shift+Enter"]],
  ["Right Shift then a letter without Shift, then Left Shift+Enter: new line", [true, true],
    [shift("keyDown", "right"), letter, shift("keyDown", "left"), enter("shift"), shift("keyUp", "left")], ["Shift+Enter"]],
  ["Two sends in a row, then Enter is a new line again", [true, true],
    [shift("keyDown", "right"), enter("shift"), enter("shift"), shift("keyUp", "right"), enter()], ["Enter", "Enter", "Shift+Enter"]],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 400, height: 200, show: true });
  await win.loadURL(`data:text/html,<textarea id="t" autofocus></textarea><script>
    window.enters = [];
    t.addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.enters.push((e.ctrlKey ? "Ctrl+" : "") + (e.shiftKey ? "Shift+" : "") + "Enter");
    });
  </script>`);
  attachEnterKeys(win.webContents, () => ({ ...settings }));
  win.focus();
  win.webContents.focus();
  await sleep(500);

  let failed = 0;
  for (const [name, [preventEnter, sendWithRightShiftEnter], keys, expected] of cases) {
    Object.assign(settings, { preventEnter, sendWithRightShiftEnter });
    await win.webContents.executeJavaScript("window.enters = []");
    for (const event of keys) {
      win.webContents.sendInputEvent(event);
      await sleep(80);
    }
    await sleep(300);
    const got = await win.webContents.executeJavaScript("window.enters");
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  }
  console.log(failed ? `${failed} case(s) failed` : "all cases passed");
  app.exit(failed ? 1 : 0);
});
