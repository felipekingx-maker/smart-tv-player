/*
 * UniaoTV beta auto-provisioning.
 * Test credentials intentionally embedded for this public beta.
 */
package app.opentv.core

import app.opentv.data.model.Source
import app.opentv.data.model.SourceKind

object BetaProvider {
    const val PRIMARY_URL = "http://fragata.lat"
    const val SECONDARY_URL = "http://clipper.lat"
    const val USERNAME = "861578702"
    const val PASSWORD = "618872517"

    fun primary() = Source(
        name = "UniaoTV",
        kind = SourceKind.XTREAM,
        url = PRIMARY_URL,
        username = USERNAME,
        password = PASSWORD,
    )

    fun secondary() = primary().copy(url = SECONDARY_URL)
}
