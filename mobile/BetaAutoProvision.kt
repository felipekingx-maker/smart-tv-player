/*
 * UniaoTV public beta bootstrap.
 * The test account is intentionally auto-provisioned for this beta build.
 */
package app.opentv.core

import android.content.Context
import app.opentv.data.repo.CatalogRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object BetaAutoProvision {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun start(context: Context, graph: ServiceLocator.Graph) {
        scope.launch {
            if (graph.sourceRepository.enabled().isNotEmpty()) return@launch

            val candidates = listOf(BetaProvider.primary(), BetaProvider.secondary())
            var savedId: Long? = null

            for (candidate in candidates) {
                val draft = if (savedId == null) candidate else candidate.copy(id = savedId!!)
                if (graph.sourceRepository.test(draft).isFailure) continue

                val id = graph.sourceRepository.save(draft)
                savedId = id
                val saved = graph.sourceRepository.byId(id) ?: continue
                val now = System.currentTimeMillis()

                when (graph.catalogRepository.syncLive(saved, now)) {
                    is CatalogRepository.SyncResult.Success -> {
                        runCatching { graph.epgRepository.syncAll(now) }
                        return@launch
                    }
                    is CatalogRepository.SyncResult.Failed -> Unit
                }
            }

            // Leave a clean first-run state if both endpoints fail, so next launch retries.
            savedId?.let { runCatching { graph.catalogRepository.deleteSource(it) } }
        }
    }
}
