# Presence Hide

An Omarchy bar widget that keeps **Steam and official Discord** online or invisible together. Forked from [michaelsucks/SteamHide](https://github.com/michaelsucks/SteamHide), retaining its MIT license and Steam icon.

- Click once to hide both apps; click again to go online.
- Manual visibility changes in either running app propagate to the other, usually within 2–5 seconds.
- Discord invisibility explicitly selects **Invisible → Forever**. Selecting a timed Invisible status manually is normalized to Forever when the visibility changes to invisible.
- Idle and Do Not Disturb count as visible. Automatic sync preserves those statuses unless invisibility needs to change; the widget's explicit Online command selects Online.
- Startup disagreement favors invisible. The desired visibility is saved locally across service restarts. Reopened apps adopt the current desired visibility.
- Missing/closed apps are not launched and do not count as invisible. Hover the widget to see both states and errors.
- Steam confirmation has a 20-second grace period so delayed saved-status updates cannot bounce the apps between statuses.

## How it works

Steam uses its own `steam://friends/status/online` and `/invisible` URLs and saved `ePersonaState`, using the original helper.

Discord uses Electron's [localhost debugging interface](https://www.electronjs.org/docs/latest/api/command-line-switches#--remote-debugging-portport), bound to **127.0.0.1:19227**. A small Node daemon reads only the current user's status indicator and clicks Discord's own profile/status menu. It selects Invisible first, then the duration submenu's **Forever** option. No Vencord, Vesktop, account token, private HTTP API, webpack access, or stored authentication extraction is used.

This is UI automation, not an officially supported Discord integration. Discord updates can change the menu selectors. Busy profile menus or dialogs defer updates; missing controls produce an error instead of guessing coordinates. The bridge briefly opens and closes the profile menu without focusing the window or moving the cursor. The debugging port grants local processes access to Discord's renderer; it must stay on loopback. No permissive `--remote-allow-origins` flag is used.

## Install

Requires Omarchy's Quickshell shell, Steam, official Discord installed as `/usr/bin/discord`, Node.js 22+ (tested with Node 26), and Python 3 for the installer.

```bash
git clone https://github.com/ThisIsRinesi/SteamHide ~/Projects/SteamHide
cd ~/Projects/SteamHide
./install.sh
```

The installer:

1. Backs up existing shell configuration, Discord launcher overrides, and service configuration under `~/.local/state/presence-hide/backups/`.
2. Links this checkout into `~/.config/omarchy/plugins/io.github.thisisrinesi.presence-hide`.
3. Installs a Discord launcher override and `~/.local/bin/discord` wrapper with the localhost debugging flag.
4. Enables `presence-hide.service` for the graphical session.
5. Replaces the upstream widget in its existing bar position, then archives the upstream plugin outside Omarchy's plugin directory.

Quit Discord completely and reopen it from the launcher once after installation. Keep this checkout in place: the widget and service use it directly. Upstream updates cannot overwrite the fork: `origin` should point to **ThisIsRinesi/SteamHide**, and the upstream plugin ID is no longer installed.

## Commands

```bash
./presence-hide status       # JSON: actual states, target, pending, error
./presence-hide invisible    # both invisible; Discord Forever
./presence-hide online
./presence-hide toggle
./presence-hide refresh
omarchy-shell io.github.thisisrinesi.presence-hide toggle
systemctl --user status presence-hide.service
journalctl --user -u presence-hide.service
```

The original `./steam-hide` helper remains Steam-only for diagnostics.

## Verification

```bash
npm test
# Direct invocation also shows every individual assertion group:
node tests/policy.test.mjs
node tests/status.test.mjs
```

Live verification on Discord 1.0.166 / Electron 42.11.15: shared commands, manual Steam changes in both directions, manual Discord changes in both directions, and widget IPC toggling all passed. Invisible was explicitly set using **Forever**. Restart checks verify that the remembered invisible target survives reconnection.

## Removal / rollback

```bash
systemctl --user disable --now presence-hide.service
omarchy plugin remove io.github.thisisrinesi.presence-hide --yes
```

Remove the generated `~/.local/bin/discord`, `~/.local/share/applications/discord.desktop`, and `~/.config/systemd/user/presence-hide.service` (or restore your previous versions from the installer backup), then run `systemctl --user daemon-reload`. Quit and relaunch Discord to close its debugging port. The installer backup contains the original plugin directory and `shell.json` if full rollback is needed. Restoring an old `shell.json` also restores its other settings, so merge it if those have since changed.
