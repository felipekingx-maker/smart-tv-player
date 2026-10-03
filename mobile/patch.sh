#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

python3 - <<'PY'
from pathlib import Path

# Keep the upstream namespace so the GPL code needs minimal changes, but make this a distinct app.
p = Path('app/build.gradle.kts')
s = p.read_text()
s = s.replace('applicationId = "app.opentv"', 'applicationId = "app.uniaotv.mobile"')
s = s.replace('versionName = "0.11.8"', 'versionName = "1.3.2-visual-beta"')
p.write_text(s)

# Add OkHttp DNS-over-HTTPS module for a secure fallback resolver.
build = Path('app/build.gradle.kts')
s = build.read_text()
if 'okhttp-dnsoverhttps' not in s:
    s = s.replace('    implementation(libs.okhttp)\n', '    implementation(libs.okhttp)\n    implementation("com.squareup.okhttp3:okhttp-dnsoverhttps:4.12.0")\n')
build.write_text(s)

# Make the shared HTTP client use Android DNS first and secure DoH only when system DNS fails.
locator = Path('app/src/main/java/app/opentv/core/ServiceLocator.kt')
s = locator.read_text()
if '.dns(FallbackDns())' not in s:
    s = s.replace('            OkHttpClient.Builder()\n', '            OkHttpClient.Builder()\n                .dns(FallbackDns())\n', 1)
locator.write_text(s)

# Rebrand visible strings while preserving source-code licence headers.
for p in Path('app/src/main/res').glob('values*/strings.xml'):
    s = p.read_text()
    s = s.replace('OpenTV', 'UniaoTV').replace('opentv', 'uniaotv')
    p.write_text(s)

pt = Path('app/src/main/res/values-pt/strings.xml')
if pt.exists():
    s = pt.read_text().replace('Definições', 'Configurações')
    pt.write_text(s)

# UniaoTV dark navy / cyan palette.
Path('app/src/main/res/values/colors.xml').write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="window_background">#FF160306</color>
    <color name="accent">#FFFF5865</color>
</resources>
""")

# First launch opens the mobile hub. Provider/list setup remains inside Configuracoes.
main = Path('app/src/main/java/app/opentv/MainActivity.kt')
s = main.read_text()
s = s.replace('import app.opentv.update.UpdateGate\n', '')
s = s.replace(
    'val start = if (sourcesUi.sources.isEmpty()) Routes.ADD_SOURCE else Routes.HOME',
    'val start = Routes.HOME'
)
s = s.replace('        UpdateGate()\n', '')
s = s.replace('OpenTV/0.1 (Android)', 'UniaoTV/1.3.2 Visual Beta (Android)')
main.write_text(s)

# Auto-provision the public beta Xtream test account on app startup.
app = Path('app/src/main/java/app/opentv/OpenTvApp.kt')
s = app.read_text()
s = s.replace(
    '        SyncWorker.schedule(this)\n',
    '        SyncWorker.schedule(this)\n        app.opentv.core.BetaAutoProvision.start(this, graph)\n',
)
app.write_text(s)

# Phone live-TV layout: force the readable list view so each logo is accompanied by the channel name.
guide = Path('app/src/main/java/app/opentv/ui/channels/HomeScreen.kt')
s = guide.read_text()
s = s.replace(
    '    val channelLayout by settings.channelLayout.collectAsState()',
    '    val channelLayout = AppSettings.ChannelLayout.LIST'
)
guide.write_text(s)

# Hide provider/source configuration from beta users. The embedded account remains internal.
hub = Path('app/src/main/java/app/opentv/ui/settings/SettingsHubScreen.kt')
s = hub.read_text()
s = s.replace(
    '        HubEntry(Icons.Filled.Dns, stringResource(R.string.settings_providers_title), stringResource(R.string.settings_providers_subtitle), onOpenProviders),\n',
    ''
)
hub.write_text(s)

# Mobile build only. TV Box receives a separate UI/build later.
man = Path('app/src/main/AndroidManifest.xml')
s = man.read_text()
s = s.replace("""            <!-- Android TV / Fire TV home screen -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
""", '')
s = s.replace('android:banner="@drawable/banner"', 'android:banner="@drawable/uniaotv_logo"')
s = s.replace('android:icon="@mipmap/ic_launcher"', 'android:icon="@drawable/uniaotv_logo"')
s = s.replace('android:roundIcon="@mipmap/ic_launcher_round"', 'android:roundIcon="@drawable/uniaotv_logo"')
man.write_text(s)

# About/source-code links point to the modified project.
for p in Path('app/src/main/java').rglob('*.kt'):
    s = p.read_text().replace(
        'https://github.com/opentvproject/opentv',
        'https://github.com/felipekingx-maker/smart-tv-player'
    )
    p.write_text(s)
PY

cp "$OLDPWD/mobile/MainScreen.kt" app/src/main/java/app/opentv/ui/MainScreen.kt
cp "$OLDPWD/mobile/FallbackDns.kt" app/src/main/java/app/opentv/core/FallbackDns.kt
cp "$OLDPWD/mobile/BetaProvider.kt" app/src/main/java/app/opentv/core/BetaProvider.kt
cp "$OLDPWD/mobile/BetaAutoProvision.kt" app/src/main/java/app/opentv/core/BetaAutoProvision.kt

cat > app/src/main/res/drawable/uniaotv_logo.xml <<'XML'
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#020817"
        android:pathData="M20,20h68a14,14 0,0 1,14 14v48a14,14 0,0 1,-14 14h-68a14,14 0,0 1,-14 -14v-48a14,14 0,0 1,14 -14z"/>
    <path android:strokeColor="#00C8FF" android:strokeWidth="6"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"
        android:pathData="M36,18 L49,31 M72,18 L59,31"/>
    <path android:strokeColor="#00C8FF" android:strokeWidth="8"
        android:strokeLineCap="round" android:strokeLineJoin="round"
        android:fillColor="@android:color/transparent"
        android:pathData="M30,40 L30,65 C30,79 40,85 54,85 C68,85 78,79 78,65 L78,40"/>
    <path android:fillColor="#00C8FF"
        android:pathData="M49,48 L49,73 L69,60.5 Z"/>
    <path android:strokeColor="#087CFF" android:strokeWidth="4"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"
        android:pathData="M91,43 C99,49 99,63 91,69 M97,35 C111,47 111,65 97,77"/>
</vector>
XML

cat > UNIAOTV_MODIFICATIONS.md <<'TXT'
# UniaoTV Mobile

This build is a modified version of OpenTV, licensed GPL-3.0-or-later.

Changes:
- UniaoTV branding and distinct Android application id.
- Mobile-only launcher configuration.
- Touch-first home with TV, Filmes, Series and Configuracoes.
- Dark navy/cyan visual identity.
- Home opens before playlist configuration.
- Upstream self-update prompt disabled for this branded build.
- v1.1: secure DNS-over-HTTPS fallback when the device/network DNS cannot resolve a provider hostname.
- HTTPS certificate validation remains enabled.\n- v1.2 beta: auto-login with a public test Xtream account and primary/secondary server fallback.\n- v1.3 visual beta: redesigned UniaoTV shell inspired by the reference app: burgundy theme, top navigation, hero and content cards.\n- v1.3.1: mobile TV list now always shows channel logo plus channel name and programme information.\n- v1.3.2: provider configuration is hidden from beta users; embedded account remains internal.

Upstream: https://github.com/opentvproject/opentv
Modified project: https://github.com/felipekingx-maker/smart-tv-player
TXT
