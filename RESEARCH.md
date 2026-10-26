# Integration choice and verification

Target: Omarchy with Quickshell; official Discord 1.0.166, Electron 42.11.15, Chromium 148; native Steam; Node 26. No active Vesktop package, executable, desktop launcher, or Flatpak was found. Its old configuration remains untouched.

## Alternatives checked

- SteamHide upstream: https://github.com/michaelsucks/SteamHide — uses Steam status URLs and the saved persona state; retained for Steam control.
- Discord RPC: https://github.com/discord/discord-api-docs/blob/main/developers/topics/rpc.mdx — no documented personal online/invisible setter.
- Discord support: https://support.discord.com/hc/en-us/articles/227779547-Changing-Online-Status — native profile status picker.
- Vencord custom plugins: https://docs.vencord.dev/installing/custom-plugins/ — requires a custom build/client integration, which the user did not want.
- Electron: https://www.electronjs.org/docs/latest/api/command-line-switches — supplies the local debugging transport used here.
- Direct user-token automation was rejected as unnecessary; Discord's policy: https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots.

Chosen design: localhost CDP drives Discord's existing DOM controls. Compared with screen-coordinate automation, it does not depend on monitor layout, window position, pointer position, or foreground focus, and can read the current account status for reverse synchronization. It still depends on Discord UI implementation and is not an official integration.

## Observations

- `ss -ltnp` verified the debugging listener is **127.0.0.1:19227**.
- REA Electron target-list evidence `ev_c347f5e6674016dfdf33b7594c8042acf16e3b617ee1e3f26a33e72040b0ef68` identified Electron/Chromium versions but listed no local file pages: Discord loads an HTTPS page instead.
- REA browser inspection `ev_c7a38f28a84c69c15b58c30e7b1ebf105ee6d4da840aa5037ed743d1f0aa8f40` observed the Discord page at the loopback endpoint. Coverage was limited to the attach window and selected origin; it did not establish a status change or duration.
- Subsequent explicit CDP UI probes established the profile button, status submenu IDs, and animated account status text. No storage/authentication values or conversation content were required.
- The Invisible duration submenu contains a `Forever` item with ID `set-status-submenu-invisible--invisible-undefined`. In this version, applying the duration without first selecting Invisible left the account Online. The implementation therefore selects Invisible, then Forever, then checks the settled status.
- Live end-to-end checks passed for shared Online, Steam Invisible → Discord Invisible Forever, Steam Online → Discord Online, Discord Invisible Forever → Steam Invisible, Discord Online → Steam Online, and widget IPC toggle. Final status was invisible in both apps, with no pending change or error.

## Limits

The UI reports the status; we do not read private server settings to independently verify the saved duration. Indefinite duration is established by invoking the native **Forever** control. App restarts test that invisibility persists. A future Discord UI update may require selector maintenance; errors are exposed in the widget tooltip and service journal.
