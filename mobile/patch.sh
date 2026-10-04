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
s = s.replace('versionName = "0.11.8"', 'versionName = "1.4.0-beta"')
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
s = s.replace(
    'val start = if (sourcesUi.sources.isEmpty()) Routes.ADD_SOURCE else Routes.HOME',
    'val start = Routes.HOME'
)
s = s.replace('OpenTV/0.1 (Android)', 'UniaoTV/1.4 Beta (Android)')
if 'import app.opentv.ui.UniaoLoginGate' not in s:
    s = s.replace('import app.opentv.ui.MainScreen\n', 'import app.opentv.ui.MainScreen\nimport app.opentv.ui.UniaoLoginGate\n')
s = s.replace('                    OpenTvApp(isTelevision = isTelevision)', '                    UniaoLoginGate { OpenTvApp(isTelevision = isTelevision) }')
main.write_text(s)


# UniaoTV self-update: check this repository's latest GitHub release and offer in-app APK update.
checker = Path('app/src/main/java/app/opentv/update/UpdateChecker.kt')
s = checker.read_text()
s = s.replace('const val REPO_SLUG = "opentvproject/opentv"', 'const val REPO_SLUG = "felipekingx-maker/smart-tv-player"')
s = s.replace('.header("User-Agent", "OpenTV")', '.header("User-Agent", "UniaoTV")')
old_parts = """        private fun versionParts(v: String): List<Int> =
            v.trim().trimStart('v', 'V')
                .split('.', '-', '+')
                .map { part -> part.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }
"""
new_parts = """        private fun versionParts(v: String): List<Int> {
            val match = Regex("""\\d+(?:\\.\\d+)+""").find(v)?.value ?: return emptyList()
            return match.split('.').mapNotNull { it.toIntOrNull() }
        }
"""
s = s.replace(old_parts, new_parts)
checker.write_text(s)

update_ui = Path('app/src/main/java/app/opentv/update/UpdateScreen.kt')
s = update_ui.read_text()
s = s.replace('Text("Update")', 'Text("Atualizar agora")')
s = s.replace('Text("Later")', 'Text("Depois")')
s = s.replace('Text("Update available")', 'Text("Nova atualização disponível")')
s = s.replace('Text("OpenTV ${s.update.versionName} is available. You have ${BuildConfig.VERSION_NAME}.")',
              'Text("UniaoTV ${s.update.versionName} está disponível. Sua versão é ${BuildConfig.VERSION_NAME}.")')
s = s.replace('Text("Downloading update…")', 'Text("Baixando atualização…")')
s = s.replace('Text("Retry")', 'Text("Tentar novamente")')
s = s.replace('Text("Close")', 'Text("Fechar")')
s = s.replace('Text("Update failed")', 'Text("Falha na atualização")')
s = s.replace('Text("Could not download the update. Check the connection and try again.")',
              'Text("Não foi possível baixar a atualização. Verifique a conexão e tente novamente.")')
s = s.replace('const val CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000L // 6 hours',
              'const val CHECK_INTERVAL_MS = 30 * 60 * 1000L // 30 minutes')
update_ui.write_text(s)


# Auto-provision the public beta Xtream test account on app startup.
app = Path('app/src/main/java/app/opentv/OpenTvApp.kt')
s = app.read_text()
s = s.replace(
    '        SyncWorker.schedule(this)\n',
    '        SyncWorker.schedule(this)\n        app.opentv.core.BetaAutoProvision.start(this, graph)\n',
)
app.write_text(s)

# Phone split-pane fix: the upstream 240dp category rail consumes roughly two thirds of a phone screen.
# Keep folders on the left, but reserve enough width on the right for channel logo + number + name.
guide = Path('app/src/main/java/app/opentv/ui/channels/HomeScreen.kt')
s = guide.read_text()
s = s.replace(
    'targetValue = if (railExpanded) 240.dp else 0.dp',
    'targetValue = if (railExpanded) 145.dp else 0.dp'
)
guide.write_text(s)

# Mobile folder drill-in: tapping a TV folder hides the folder rail and gives the full width to channels.
# Android Back reopens the folder rail before leaving the TV section.
guide = Path('app/src/main/java/app/opentv/ui/channels/HomeScreen.kt')
s = guide.read_text()
if 'import androidx.activity.compose.BackHandler' not in s:
    s = s.replace(
        'package app.opentv.ui.channels\n\n',
        'package app.opentv.ui.channels\n\nimport androidx.activity.compose.BackHandler\n'
    )
if 'import androidx.compose.runtime.saveable.rememberSaveable' not in s:
    s = s.replace(
        'import androidx.compose.runtime.remember\n',
        'import androidx.compose.runtime.remember\nimport androidx.compose.runtime.saveable.rememberSaveable\n'
    )
s = s.replace(
    '    var railExpanded by rememberSaveable { mutableStateOf(true) }',
    '    var railExpanded by remember { mutableStateOf(true) }\n    BackHandler(enabled = !railExpanded) { railExpanded = true }'
)
s = s.replace(
    'onClick = viewModel::selectFavourites,',
    'onClick = { viewModel.selectFavourites(); railExpanded = false },'
)
s = s.replace(
    'onClick = { viewModel.selectCategory(null) },',
    'onClick = { viewModel.selectCategory(null); railExpanded = false },'
)
s = s.replace(
    'onClick = { viewModel.selectCategory(group.key) },',
    'onClick = { viewModel.selectCategory(group.key); railExpanded = false },'
)
guide.write_text(s)

# Mobile landscape preview fix: shrink the mini player/header area in landscape so channel rows remain visible.
preview = Path('app/src/main/java/app/opentv/ui/channels/GuidePreview.kt')
s = preview.read_text()
if 'import androidx.compose.ui.platform.LocalConfiguration' not in s:
    s = s.replace(
        'import androidx.compose.ui.res.stringResource\n',
        'import androidx.compose.ui.res.stringResource\nimport androidx.compose.ui.platform.LocalConfiguration\n'
    )
if 'import android.content.res.Configuration' not in s:
    s = s.replace(
        'import android.view.ViewGroup\n',
        'import android.view.ViewGroup\nimport android.content.res.Configuration\n'
    )
s = s.replace(
    'fun GuidePreview(\n',
    'fun GuidePreview(\n'
)
s = s.replace(
    ') {\n    Row(\n        modifier\n            .fillMaxWidth()\n            .height(212.dp)',
    ') {\n    val configuration = LocalConfiguration.current\n    val previewHeight = if (configuration.orientation == Configuration.ORIENTATION_LANDSCAPE) 118.dp else 190.dp\n    Row(\n        modifier\n            .fillMaxWidth()\n            .height(previewHeight)'
)
preview.write_text(s)

# Compact Movies/Series landscape: the global header already has Search, so remove the large duplicate
# search box and slim the category strip to keep posters fully visible.
vod = Path('app/src/main/java/app/opentv/ui/vod/VodScreens.kt')
s = vod.read_text()
if 'import android.content.res.Configuration' not in s:
    s = s.replace(
        'package app.opentv.ui.vod\n\n',
        'package app.opentv.ui.vod\n\nimport android.content.res.Configuration\n'
    )
if 'import androidx.compose.ui.platform.LocalConfiguration' not in s:
    s = s.replace(
        'import androidx.compose.ui.layout.ContentScale\n',
        'import androidx.compose.ui.layout.ContentScale\nimport androidx.compose.ui.platform.LocalConfiguration\n'
    )

s = s.replace(
    '    Column(Modifier.fillMaxSize()) {\n        SearchAffordance(onOpenSearch)',
    '    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE\n\n    Column(Modifier.fillMaxSize()) {\n        if (!landscape) SearchAffordance(onOpenSearch)'
)

s = s.replace(
    '    LazyRow(\n        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),\n        horizontalArrangement = Arrangement.spacedBy(8.dp),\n        verticalAlignment = Alignment.CenterVertically,\n    ) {',
    '    val compact = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE\n    LazyRow(\n        contentPadding = PaddingValues(horizontal = 16.dp, vertical = if (compact) 2.dp else 6.dp),\n        horizontalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 8.dp),\n        verticalAlignment = Alignment.CenterVertically,\n    ) {',
    1
)
# There are two LazyRows with the same provider/category padding; compact the provider row too.
s = s.replace(
    '    LazyRow(\n        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),\n        horizontalArrangement = Arrangement.spacedBy(8.dp),\n        verticalAlignment = Alignment.CenterVertically,\n    ) {',
    '    val compact = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE\n    LazyRow(\n        contentPadding = PaddingValues(horizontal = 16.dp, vertical = if (compact) 2.dp else 6.dp),\n        horizontalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 8.dp),\n        verticalAlignment = Alignment.CenterVertically,\n    ) {',
    1
)

# Slim chips in landscape without affecting portrait.
s = s.replace(
    'private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {\n    var focused by remember { mutableStateOf(false) }',
    'private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {\n    val compact = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE\n    var focused by remember { mutableStateOf(false) }'
)
s = s.replace(
    '.padding(horizontal = 16.dp, vertical = 8.dp),',
    '.padding(horizontal = if (compact) 12.dp else 16.dp, vertical = if (compact) 5.dp else 8.dp),',
    1
)
vod.write_text(s)

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
cp "$OLDPWD/mobile/UniaoLoginGate.kt" app/src/main/java/app/opentv/ui/UniaoLoginGate.kt
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
- UniaoTV self-update prompt checks the UniaoTV GitHub release and offers APK installation.
- v1.1: secure DNS-over-HTTPS fallback when the device/network DNS cannot resolve a provider hostname.
- HTTPS certificate validation remains enabled.\n- v1.2 beta: auto-login with a public test Xtream account and primary/secondary server fallback.\n- v1.3 visual beta: redesigned UniaoTV shell inspired by the reference app: burgundy theme, top navigation, hero and content cards.\n- v1.3.1: mobile TV list now always shows channel logo plus channel name and programme information.\n- v1.3.2: provider configuration is hidden from beta users; embedded account remains internal.\n- v1.3.3: mobile TV split-pane narrowed the folder rail so channel cards have room for logo, number and channel name.\n- v1.3.4: selecting a TV folder hides the folder list and shows channels full-width; Back reopens folders.\n- v1.3.5: returning from the live player keeps the TV tab, selected folder and channel-list state instead of returning to Highlights.\n- v1.3.6: mini player becomes compact in landscape so the channel list stays visible.\n- v1.3.7: landscape header and Movies/Series filters are compact so poster art stays fully visible.\n- v1.4.0 beta: app access login added (beta admin/admin) and self-update enabled for UniaoTV releases.

Upstream: https://github.com/opentvproject/opentv
Modified project: https://github.com/felipekingx-maker/smart-tv-player
TXT
