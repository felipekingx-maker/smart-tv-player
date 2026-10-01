#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

# Brand + mobile package identity. Namespace stays app.opentv so upstream source paths remain stable.
python3 - <<'PY'
from pathlib import Path
p = Path('app/build.gradle.kts')
s = p.read_text()
s = s.replace('applicationId = "app.opentv"', 'applicationId = "app.uniaotv.mobile"')
s = s.replace('versionName = "0.11.8"', 'versionName = "1.0.0-mobile"')
p.write_text(s)

# All visible strings: rebrand OpenTV -> UniaoTV while preserving the GPL notices in source headers.
for p in Path('app/src/main/res').glob('values*/strings.xml'):
    s = p.read_text()
    s = s.replace('OpenTV', 'UniaoTV').replace('opentv', 'uniaotv')
    p.write_text(s)

# Portuguese strings should use Brazilian labels on the main navigation.
pt = Path('app/src/main/res/values-pt/strings.xml')
if pt.exists():
    s = pt.read_text()
    s = s.replace('Definições', 'Configurações')
    pt.write_text(s)

# Accent palette: dark navy + electric cyan/blue matching the UniaoTV logo.
Path('app/src/main/res/values/colors.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="window_background">#FF020817</color>\n    <color name="accent">#FF00C8FF</color>\n</resources>\n''')

# First launch opens the 4-item mobile home. Playlist setup stays inside Configurações.
main = Path('app/src/main/java/app/opentv/MainActivity.kt')
s = main.read_text()
s = s.replace('import app.opentv.update.UpdateGate\n', '')
s = s.replace('val start = if (sourcesUi.sources.isEmpty()) Routes.ADD_SOURCE else Routes.HOME', 'val start = Routes.HOME')
s = s.replace('        UpdateGate()\n', '')
s = s.replace('OpenTV/0.1 (Android)', 'UniaoTV/1.0 (Android)')
main.write_text(s)

# Disable Android TV launcher entry in this build; a TV Box edition will be made separately.
man = Path('app/src/main/AndroidManifest.xml')
s = man.read_text()
s = s.replace('''            <!-- Android TV / Fire TV home screen -->\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />\n            </intent-filter>\n''', '')
s = s.replace('android:banner="@drawable/banner"', 'android:banner="@drawable/uniaotv_logo"')
s = s.replace('android:icon="@mipmap/ic_launcher"', 'android:icon="@drawable/uniaotv_logo"')
man.write_text(s)

# Source/About links identify the modified project instead of the upstream release channel.
for p in Path('app/src/main/java').rglob('*.kt'):
    s = p.read_text()
    s = s.replace('https://github.com/opentvproject/opentv', 'https://github.com/felipekingx-maker/smart-tv-player')
    p.write_text(s)
PY

cp "$OLDPWD/mobile/MainScreen.kt" app/src/main/java/app/opentv/ui/MainScreen.kt
cp "$OLDPWD/mobile/uniaotv_logo.png" app/src/main/res/drawable/uniaotv_logo.png

# Keep the upstream GPL license in the corresponding source bundle and add modification notice.
cat > UNIAOTV_MODIFICATIONS.md <<'TXT'
# UniaoTV Mobile

This build is a modified version of OpenTV (GPL-3.0-or-later).

Changes in this build:
- UniaoTV branding, app id and logo.
- Mobile-only launcher configuration.
- Four-item touch-first home: TV, Filmes, Series, Configuracoes.
- Dark navy / cyan visual theme.
- First launch starts at the home hub; playlist/provider setup is available from Configuracoes.
- Upstream self-update prompt disabled so this build does not offer OpenTV binaries as UniaoTV updates.

Upstream project: https://github.com/opentvproject/opentv
Modified project: https://github.com/felipekingx-maker/smart-tv-player
TXT
