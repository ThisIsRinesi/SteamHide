#!/bin/bash
set -euo pipefail
repo=$(cd -- "$(dirname -- "$0")" && pwd)
node_bin=$(command -v node)
"$node_bin" -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
omarchy plugin validate "$repo"
id=io.github.thisisrinesi.presence-hide
plugin="$HOME/.config/omarchy/plugins/$id"
backup="$HOME/.local/state/presence-hide/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup" "$HOME/.config/systemd/user" "$HOME/.local/bin" "$HOME/.local/share/applications"
for file in "$HOME/.config/omarchy/shell.json" "$HOME/.local/share/applications/discord.desktop" "$HOME/.local/bin/discord" "$HOME/.config/systemd/user/presence-hide.service"; do
  if [[ -e $file || -L $file ]]; then cp -a "$file" "$backup/$(basename "$file")"; fi
done
if [[ -e $plugin || -L $plugin ]]; then
  [[ $(readlink -f "$plugin") == "$repo" ]] || { echo "Plugin path already exists: $plugin" >&2; exit 1; }
else
  ln -s "$repo" "$plugin"
fi
ln -sfn "$repo/discord-launch" "$HOME/.local/bin/discord"
# A user desktop entry overrides the packaged launcher, including URL opens.
sed "s|^Exec=.*|Exec=\"$repo/discord-launch\" --url -- %u|" /usr/share/applications/discord.desktop > "$HOME/.local/share/applications/discord.desktop"
cat > "$HOME/.config/systemd/user/presence-hide.service" <<SERVICE
[Unit]
Description=Synchronize Steam and Discord visibility
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
ExecStart="$node_bin" "$repo/sync.mjs"
Environment="PATH=$(dirname "$node_bin"):/usr/local/bin:/usr/bin:/bin"
RuntimeDirectory=presence-hide
RuntimeDirectoryMode=0700
Restart=on-failure
RestartSec=3

[Install]
WantedBy=graphical-session.target
SERVICE
systemctl --user daemon-reload
systemctl --user enable --now presence-hide.service
# Preserve the old widget's position while replacing its identity.
python3 - "$HOME/.config/omarchy/shell.json" <<'PY'
import json,os,sys
p=sys.argv[1]
s=json.load(open(p))
old='io.github.michaelsucks.steam-hide';new='io.github.thisisrinesi.presence-hide'
found=False
for items in s.get('bar',{}).get('layout',{}).values():
    for item in items:
        if isinstance(item,dict) and item.get('id')==old:
            item['id']=new;found=True
if not found and not any(isinstance(i,dict) and i.get('id')==new for items in s.get('bar',{}).get('layout',{}).values() for i in items):
    s.setdefault('bar',{}).setdefault('layout',{}).setdefault('right',[]).append({'id':new})
with open(p+'.presence-hide.tmp','w') as f: json.dump(s,f,indent=2);f.write('\n')
os.replace(p+'.presence-hide.tmp',p)
PY
omarchy-shell shell rescanPlugins >/dev/null
# Archive upstream outside the discovery directory, including its git history.
old="$HOME/.config/omarchy/plugins/io.github.michaelsucks.steam-hide"
if [[ -e $old || -L $old ]]; then mv "$old" "$backup/upstream-plugin"; fi
omarchy-shell shell rescanPlugins >/dev/null
command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" || true
echo "Installed Presence Hide. Backups: $backup"
echo "Restart Discord once if it is not already running with --remote-debugging-port=19227."
