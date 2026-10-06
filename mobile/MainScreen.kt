/*
 * UniaoTV mobile shell based on OpenTV.
 * OpenTV is GPL-3.0-or-later; this modified file is distributed under the same license.
 */
package app.opentv.ui

import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.opentv.R
import app.opentv.core.StatusBus
import app.opentv.data.model.Channel
import app.opentv.data.model.Movie
import app.opentv.data.model.Recording
import app.opentv.data.model.Series
import app.opentv.ui.channels.HomeScreen
import app.opentv.ui.vod.MoviesScreen
import app.opentv.ui.vod.SeriesScreen

private enum class MobileSection(val label: String) {
    HOME("DESTAQUES"),
    LIVE("TV"),
    MOVIES("FILMES"),
    SERIES("SÉRIES"),
}

@Composable
fun MainScreen(
    isTelevision: Boolean,
    hasSources: Boolean,
    isSyncing: Boolean,
    onPlayChannel: (Channel) -> Unit,
    onOpenMovie: (Movie) -> Unit,
    onOpenSeries: (Series) -> Unit,
    onResume: (mediaKey: String, url: String, title: String) -> Unit,
    onAddSource: () -> Unit,
    onRefresh: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenProfiles: () -> Unit,
    onPlayRecording: (Recording) -> Unit,
    onPlayCatchup: (mediaKey: String, url: String, title: String, ua: String) -> Unit,
    activeProfileName: String,
) {
    var section by rememberSaveable { mutableStateOf(MobileSection.HOME) }

    BackHandler(enabled = section != MobileSection.HOME) {
        section = MobileSection.HOME
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF14050A),
                        Color(0xFF090A0F),
                        Color(0xFF050609),
                    ),
                ),
            ),
    ) {
        UniaoHeader(
            current = section,
            onSelect = { section = it },
            onSearch = onOpenSearch,
            onSettings = onOpenSettings,
        )

        Box(Modifier.weight(1f).fillMaxWidth()) {
            when (section) {
                MobileSection.HOME -> HighlightsHome(
                    onLive = { section = MobileSection.LIVE },
                    onMovies = { section = MobileSection.MOVIES },
                    onSeries = { section = MobileSection.SERIES },
                    onSettings = onOpenSettings,
                )

                MobileSection.LIVE -> HomeScreen(
                    isTelevision = false,
                    hasSources = hasSources,
                    isSyncing = isSyncing,
                    onPlayChannel = onPlayChannel,
                    onAddSource = onAddSource,
                    onRefresh = onRefresh,
                    onPlayCatchup = onPlayCatchup,
                )

                MobileSection.MOVIES -> MoviesScreen(
                    onOpenMovie = onOpenMovie,
                    onResume = onResume,
                    onOpenSearch = onOpenSearch,
                    hasSources = hasSources,
                    isSyncing = isSyncing,
                )

                MobileSection.SERIES -> SeriesScreen(
                    onOpenSeries = onOpenSeries,
                    onResume = onResume,
                    onOpenSearch = onOpenSearch,
                    hasSources = hasSources,
                    isSyncing = isSyncing,
                )
            }
        }

        StatusBar()
    }
}

@Composable
private fun UniaoHeader(
    current: MobileSection,
    onSelect: (MobileSection) -> Unit,
    onSearch: () -> Unit,
    onSettings: () -> Unit,
) {
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE

    if (landscape) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF111218), Color(0xFF090A0F)),
                    ),
                )
                .padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.uniaotv_logo),
                contentDescription = "UniaoTV",
                modifier = Modifier.size(30.dp),
            )
            Text(
                text = "UniaoTV",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.width(8.dp))

            MobileSection.entries.forEach { tab ->
                val selected = current == tab
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selected) Color(0xFFB20F34) else Color.Transparent)
                        .clickable { onSelect(tab) }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    Text(
                        text = tab.label,
                        color = if (selected) Color.White else Color(0xFFB9BCC6),
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }

            Spacer(Modifier.weight(1f))
            HeaderIcon(Icons.Filled.Search, "Buscar", onSearch)
            Spacer(Modifier.width(2.dp))
            HeaderIcon(Icons.Filled.Settings, "Configurações", onSettings)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF111218), Color(0xFF090A0F)),
                ),
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 10.dp, top = 12.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                painter = painterResource(R.drawable.uniaotv_logo),
                contentDescription = "UniaoTV",
                modifier = Modifier.size(38.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "UniaoTV",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.weight(1f),
            )

            HeaderIcon(Icons.Filled.Search, "Buscar", onSearch)
            Spacer(Modifier.width(4.dp))
            HeaderIcon(Icons.Filled.Settings, "Configurações", onSettings)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            MobileSection.entries.forEach { tab ->
                val selected = current == tab
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (selected) Color(0xFFB20F34)
                            else Color.Transparent,
                        )
                        .clickable { onSelect(tab) }
                        .padding(horizontal = 15.dp, vertical = 9.dp),
                ) {
                    Text(
                        text = tab.label,
                        color = if (selected) Color.White else Color(0xFFB9BCC6),
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}

@Composable
private fun HeaderIcon(icon: ImageVector, description: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(42.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(Color(0xFF191B23))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = description,
            tint = Color.White,
            modifier = Modifier.size(22.dp),
        )
    }
}

@Composable
private fun HighlightsHome(
    onLive: () -> Unit,
    onMovies: () -> Unit,
    onSeries: () -> Unit,
    onSettings: () -> Unit,
) {
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = if (landscape) 28.dp else 16.dp, vertical = 18.dp),
    ) {
        Text(
            text = "HOME",
            color = Color(0xFF9DA1AB),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Escolha o que assistir",
            color = Color.White,
            style = if (landscape) MaterialTheme.typography.headlineMedium else MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(if (landscape) 22.dp else 16.dp))

        if (landscape) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                LuaHomeTile(
                    title = "TV AO VIVO",
                    subtitle = "Canais",
                    icon = Icons.Filled.LiveTv,
                    modifier = Modifier.weight(1f),
                    onClick = onLive,
                )
                LuaHomeTile(
                    title = "FILMES",
                    subtitle = "Vídeo sob demanda",
                    icon = Icons.Filled.Movie,
                    modifier = Modifier.weight(1f),
                    onClick = onMovies,
                )
                LuaHomeTile(
                    title = "SÉRIES",
                    subtitle = "Temporadas e episódios",
                    icon = Icons.Filled.Tv,
                    modifier = Modifier.weight(1f),
                    onClick = onSeries,
                )
                LuaHomeTile(
                    title = "CONFIGURAÇÕES",
                    subtitle = "Conta e listas",
                    icon = Icons.Filled.Settings,
                    modifier = Modifier.weight(1f),
                    onClick = onSettings,
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                LuaHomeTile(
                    title = "TV AO VIVO",
                    subtitle = "Canais",
                    icon = Icons.Filled.LiveTv,
                    modifier = Modifier.weight(1f),
                    onClick = onLive,
                )
                LuaHomeTile(
                    title = "FILMES",
                    subtitle = "Vídeo sob demanda",
                    icon = Icons.Filled.Movie,
                    modifier = Modifier.weight(1f),
                    onClick = onMovies,
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                LuaHomeTile(
                    title = "SÉRIES",
                    subtitle = "Temporadas e episódios",
                    icon = Icons.Filled.Tv,
                    modifier = Modifier.weight(1f),
                    onClick = onSeries,
                )
                LuaHomeTile(
                    title = "CONFIGURAÇÕES",
                    subtitle = "Conta e listas",
                    icon = Icons.Filled.Settings,
                    modifier = Modifier.weight(1f),
                    onClick = onSettings,
                )
            }
        }

        Spacer(Modifier.height(18.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFF10131A))
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFF36D178)),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = "UniaoTV",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = "Pronto para reproduzir sua lista",
                    color = Color(0xFF8F949F),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun LuaHomeTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(178.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF1B2029),
                        Color(0xFF11141B),
                    ),
                ),
            )
            .clickable(onClick = onClick),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.055f),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 8.dp)
                .size(112.dp),
        )

        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(14.dp)
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF2A303B)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Color.White,
                modifier = Modifier.size(25.dp),
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(14.dp),
        ) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Black,
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = subtitle,
                color = Color(0xFF8D929D),
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun StatusBar() {
    val message by StatusBus.message.collectAsState()
    val progress by StatusBus.progress.collectAsState()
    val text = message ?: return

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0B0C11))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (progress == null) {
            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color(0xFFE1274D))
        } else {
            Text("${(progress!! * 100).toInt()}%", color = Color(0xFFE1274D))
        }
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 10.dp),
            color = Color(0xFFA7AAB3),
        )
    }
}
