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
                        Color(0xFF300306),
                        Color(0xFF160306),
                        Color(0xFF09090D),
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
                        listOf(Color(0xFF5A0308), Color(0xFF3B0206)),
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
                        .background(if (selected) Color(0xFF8E1420) else Color.Transparent)
                        .clickable { onSelect(tab) }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    Text(
                        text = tab.label,
                        color = if (selected) Color.White else Color(0xFFE1CBCD),
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
                    listOf(Color(0xFF5A0308), Color(0xFF3B0206)),
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
                            if (selected) Color(0xFF8E1420)
                            else Color.Transparent,
                        )
                        .clickable { onSelect(tab) }
                        .padding(horizontal = 15.dp, vertical = 9.dp),
                ) {
                    Text(
                        text = tab.label,
                        color = if (selected) Color.White else Color(0xFFE1CBCD),
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
            .background(Color.White.copy(alpha = 0.08f))
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
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 14.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(210.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFF76121B),
                            Color(0xFF27101B),
                            Color(0xFF11151E),
                        ),
                    ),
                )
                .clickable(onClick = onMovies),
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(22.dp),
            ) {
                Text(
                    text = "UNIAOTV",
                    color = Color(0xFFFFD7DA),
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.labelLarge,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Tudo que você gosta,\nem um só lugar",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.headlineMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "TV ao vivo, filmes e séries com acesso rápido.",
                    color = Color(0xFFE8D5D7),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.height(16.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.White)
                        .padding(horizontal = 18.dp, vertical = 10.dp),
                ) {
                    Text(
                        "EXPLORAR",
                        color = Color(0xFF56070D),
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Icon(
                imageVector = Icons.Filled.Movie,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.10f),
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 18.dp)
                    .size(130.dp),
            )
        }

        Spacer(Modifier.height(18.dp))
        Text(
            text = "Navegue por categoria",
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            QuickTile(
                title = "TV",
                subtitle = "Canais ao vivo",
                icon = Icons.Filled.LiveTv,
                modifier = Modifier.weight(1f),
                onClick = onLive,
            )
            QuickTile(
                title = "FILMES",
                subtitle = "Catálogo",
                icon = Icons.Filled.Movie,
                modifier = Modifier.weight(1f),
                onClick = onMovies,
            )
            QuickTile(
                title = "SÉRIES",
                subtitle = "Temporadas",
                icon = Icons.Filled.Tv,
                modifier = Modifier.weight(1f),
                onClick = onSeries,
            )
        }

        Spacer(Modifier.height(18.dp))
        Text(
            text = "Destaques",
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PromoTile("TV AO VIVO", "Acesse seus canais", Icons.Filled.LiveTv, onLive, Modifier.weight(1f))
            PromoTile("CINEMA", "Veja os filmes", Icons.Filled.Movie, onMovies, Modifier.weight(1f))
        }
    }
}

@Composable
private fun QuickTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .height(118.dp)
            .clip(RoundedCornerShape(15.dp))
            .background(Color(0xFF21151A))
            .clickable(onClick = onClick)
            .padding(13.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Icon(icon, contentDescription = title, tint = Color(0xFFFF5865), modifier = Modifier.size(28.dp))
        Column {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
            Text(subtitle, color = Color(0xFFBDAEB1), style = MaterialTheme.typography.bodySmall, maxLines = 1)
        }
    }
}

@Composable
private fun PromoTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .height(82.dp)
            .clip(RoundedCornerShape(15.dp))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF3B151B), Color(0xFF19151B)),
                ),
            )
            .clickable(onClick = onClick)
            .padding(13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF7A101A)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(25.dp))
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
            Text(subtitle, color = Color(0xFFBFAFB1), style = MaterialTheme.typography.bodySmall, maxLines = 1)
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
            .background(Color(0xFF150B0E))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (progress == null) {
            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color(0xFFFF5865))
        } else {
            Text("${(progress!! * 100).toInt()}%", color = Color(0xFFFF5865))
        }
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 10.dp),
            color = Color(0xFFD2C3C5),
        )
    }
}
