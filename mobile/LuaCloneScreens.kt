/*
 * UniaoTV Lua-style presentation layer.
 * Uses only UniaoTV/OpenTV repositories and user-provided M3U/Xtream data.
 */
package app.opentv.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.opentv.data.model.Channel
import app.opentv.data.model.Movie
import app.opentv.data.model.Series
import app.opentv.data.model.shownName
import coil.compose.AsyncImage

private val LuaBg = Color(0xFF080A0F)
private val LuaPanel = Color(0xFF10131A)
private val LuaPanel2 = Color(0xFF171B24)
private val LuaAccent = Color(0xFFB41034)
private val LuaMuted = Color(0xFF8E949F)

@Composable
fun LuaLiveScreen(
    hasSources: Boolean,
    isSyncing: Boolean,
    onPlayChannel: (Channel) -> Unit,
    onAddSource: () -> Unit,
    onRefresh: () -> Unit,
    viewModel: ChannelsViewModel = viewModel(),
) {
    val categories by viewModel.visibleCategoryGroups.collectAsState()
    val rows by viewModel.rows.collectAsState()
    val selected by viewModel.selectedCategory.collectAsState()
    val favourites by viewModel.favouritesOnly.collectAsState()

    Row(Modifier.fillMaxSize().background(LuaBg)) {
        Column(
            modifier = Modifier
                .width(136.dp)
                .fillMaxHeight()
                .background(Color(0xFF0D1016))
                .padding(vertical = 12.dp),
        ) {
            Text("TV AO VIVO", color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                item {
                    LuaCategoryEntry("Favoritos", favourites, Icons.Filled.Favorite) { viewModel.selectFavourites() }
                }
                item {
                    LuaCategoryEntry("Todos", !favourites && selected == null, Icons.Filled.LiveTv) { viewModel.selectCategory(null) }
                }
                items(categories, key = { it.key }) { cat ->
                    LuaCategoryEntry(cat.label, !favourites && selected == cat.key, Icons.Filled.Tv) { viewModel.selectCategory(cat.key) }
                }
            }
        }

        Column(Modifier.weight(1f).fillMaxHeight().padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        if (favourites) "Favoritos" else categories.firstOrNull { it.key == selected }?.label ?: "Todos os canais",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("${rows.size} canais", color = LuaMuted)
                }
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(LuaPanel2).clickable(onClick = onRefresh).padding(10.dp),
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Atualizar", tint = Color.White)
                }
            }

            Spacer(Modifier.height(10.dp))
            when {
                rows.isNotEmpty() -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 150.dp),
                    contentPadding = PaddingValues(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalArrangement = Arrangement.spacedBy(9.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    gridItems(rows, key = { it.key }) { row ->
                        LuaChannelCard(row.primary, row.now?.title, onPlayChannel)
                    }
                }
                isSyncing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = LuaAccent) }
                !hasSources -> LuaEmpty("Nenhuma lista conectada", "Adicionar M3U / Xtream", onAddSource)
                else -> LuaEmpty("Nenhum canal nesta categoria", "Atualizar", onRefresh)
            }
        }
    }
}

@Composable
private fun LuaCategoryEntry(label: String, selected: Boolean, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(9.dp)).background(if (selected) LuaAccent else Color.Transparent).clickable(onClick = onClick).padding(horizontal = 10.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = if (selected) Color.White else LuaMuted, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(7.dp))
        Text(label, color = if (selected) Color.White else Color(0xFFC1C5CD), fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun LuaChannelCard(channel: Channel, nowTitle: String?, onPlay: (Channel) -> Unit) {
    Column(
        modifier = Modifier.clip(RoundedCornerShape(13.dp)).background(Brush.verticalGradient(listOf(Color(0xFF1A1E27), LuaPanel))).clickable { onPlay(channel) }.padding(12.dp),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().height(72.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF0B0D12)),
            contentAlignment = Alignment.Center,
        ) {
            if (!channel.logoUrl.isNullOrBlank()) {
                AsyncImage(model = channel.logoUrl, contentDescription = channel.shownName, modifier = Modifier.fillMaxSize().padding(10.dp), contentScale = ContentScale.Fit)
            } else {
                Icon(Icons.Filled.LiveTv, contentDescription = null, tint = Color(0xFF6F7580), modifier = Modifier.size(34.dp))
            }
        }
        Spacer(Modifier.height(9.dp))
        Text(channel.shownName, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(nowTitle ?: "Ao vivo", color = LuaMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun LuaMoviesScreen(
    onOpenMovie: (Movie) -> Unit,
    hasSources: Boolean,
    isSyncing: Boolean,
    viewModel: VodViewModel = viewModel(),
) {
    val categories by viewModel.movieCategories.collectAsState()
    val movies by viewModel.movies.collectAsState()
    val recent by viewModel.recentlyAddedMovies.collectAsState()
    val recommended by viewModel.recommendedMovies.collectAsState()
    val loading by viewModel.vodLoading.collectAsState()
    var selected by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (hasSources) viewModel.ensureVodLoaded()
        viewModel.loadHomeFeeds()
    }

    val display = if (selected == null) (recommended + recent).distinctBy { it.id } else movies

    LuaVodLayout(
        title = "FILMES",
        categories = categories.map { it.id to it.name },
        selected = selected,
        onSelect = { id ->
            selected = id
            if (id != null) viewModel.selectMovieCategory(id)
        },
    ) {
        when {
            display.isNotEmpty() -> LuaMovieGrid(display, onOpenMovie)
            loading || isSyncing -> LuaLoading()
            else -> LuaEmpty("Nenhum filme encontrado", null, null)
        }
    }
}

@Composable
fun LuaSeriesScreen(
    onOpenSeries: (Series) -> Unit,
    hasSources: Boolean,
    isSyncing: Boolean,
    viewModel: VodViewModel = viewModel(),
) {
    val categories by viewModel.seriesCategories.collectAsState()
    val series by viewModel.series.collectAsState()
    val recent by viewModel.recentlyAddedSeries.collectAsState()
    val loading by viewModel.vodLoading.collectAsState()
    var selected by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (hasSources) viewModel.ensureVodLoaded()
        viewModel.loadHomeFeeds()
    }

    val display = if (selected == null) recent else series

    LuaVodLayout(
        title = "SÉRIES",
        categories = categories.map { it.id to it.name },
        selected = selected,
        onSelect = { id ->
            selected = id
            if (id != null) viewModel.selectSeriesCategory(id)
        },
    ) {
        when {
            display.isNotEmpty() -> LuaSeriesGrid(display, onOpenSeries)
            loading || isSyncing -> LuaLoading()
            else -> LuaEmpty("Nenhuma série encontrada", null, null)
        }
    }
}

@Composable
private fun LuaVodLayout(
    title: String,
    categories: List<Pair<String, String>>,
    selected: String?,
    onSelect: (String?) -> Unit,
    content: @Composable () -> Unit,
) {
    Row(Modifier.fillMaxSize().background(LuaBg)) {
        Column(
            modifier = Modifier.width(136.dp).fillMaxHeight().background(Color(0xFF0D1016)).padding(vertical = 12.dp),
        ) {
            Text(title, color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                item {
                    LuaCategoryEntry("Início", selected == null, if (title == "FILMES") Icons.Filled.Movie else Icons.Filled.Tv) { onSelect(null) }
                }
                items(categories, key = { it.first }) { cat ->
                    LuaCategoryEntry(cat.second, selected == cat.first, if (title == "FILMES") Icons.Filled.Movie else Icons.Filled.Tv) { onSelect(cat.first) }
                }
            }
        }
        Box(Modifier.weight(1f).fillMaxHeight().padding(12.dp)) { content() }
    }
}

@Composable
private fun LuaMovieGrid(items: List<Movie>, onClick: (Movie) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 128.dp),
        contentPadding = PaddingValues(bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        gridItems(items, key = { it.id }) { movie ->
            LuaPosterCard(movie.name, movie.posterUrl, movie.rating?.toString(), movie.year?.toString()) { onClick(movie) }
        }
    }
}

@Composable
private fun LuaSeriesGrid(items: List<Series>, onClick: (Series) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 128.dp),
        contentPadding = PaddingValues(bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        gridItems(items, key = { it.id }) { series ->
            LuaPosterCard(series.name, series.posterUrl, series.rating?.toString(), series.year?.toString()) { onClick(series) }
        }
    }
}

@Composable
private fun LuaPosterCard(title: String, poster: String?, rating: String?, year: String?, onClick: () -> Unit) {
    Column(
        modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(LuaPanel).clickable(onClick = onClick).padding(7.dp),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().aspectRatio(0.68f).clip(RoundedCornerShape(9.dp)).background(Color(0xFF171A21)),
            contentAlignment = Alignment.Center,
        ) {
            if (!poster.isNullOrBlank()) {
                AsyncImage(model = poster, contentDescription = title, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            } else {
                Icon(Icons.Filled.Movie, contentDescription = null, tint = LuaMuted, modifier = Modifier.size(38.dp))
            }
        }
        Spacer(Modifier.height(7.dp))
        Text(title, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        val meta = listOfNotNull(year, rating?.let { "★ $it" }).joinToString("  ")
        if (meta.isNotBlank()) Text(meta, color = LuaMuted, maxLines = 1)
    }
}

@Composable
private fun LuaLoading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = LuaAccent) }
}

@Composable
private fun LuaEmpty(title: String, button: String?, onClick: (() -> Unit)?) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, color = Color.White, fontWeight = FontWeight.Bold)
        if (button != null && onClick != null) {
            Spacer(Modifier.height(12.dp))
            Box(
                modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(LuaAccent).clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 10.dp),
            ) {
                Text(button, color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}
