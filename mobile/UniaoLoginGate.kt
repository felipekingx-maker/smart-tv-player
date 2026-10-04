package app.opentv.ui

import android.content.Context
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.opentv.R

/**
 * Simple beta access gate. Credentials are intentionally local for this test build.
 * A production build should validate against the UniaoTV backend and store only a session token.
 */
@Composable
fun UniaoLoginGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val prefs = remember {
        context.getSharedPreferences("uniaotv_access", Context.MODE_PRIVATE)
    }
    var authenticated by remember { mutableStateOf(prefs.getBoolean("authenticated", false)) }

    if (authenticated) {
        content()
        return
    }

    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF5A0308),
                        Color(0xFF220306),
                        Color(0xFF09090D),
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier
                .padding(20.dp)
                .widthIn(max = 420.dp)
                .fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            tonalElevation = 8.dp,
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Image(
                    painter = painterResource(R.drawable.uniaotv_logo),
                    contentDescription = "UniaoTV",
                    modifier = Modifier.height(76.dp),
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    "UniaoTV",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Acesso ao aplicativo",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(22.dp))

                OutlinedTextField(
                    value = username,
                    onValueChange = {
                        username = it
                        error = false
                    },
                    label = { Text("Login") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = {
                        password = it
                        error = false
                    },
                    label = { Text("Senha") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )

                if (error) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Login ou senha incorretos.",
                        color = MaterialTheme.colorScheme.error,
                    )
                }

                Spacer(Modifier.height(18.dp))
                Button(
                    onClick = {
                        if (username == "admin" && password == "admin") {
                            prefs.edit().putBoolean("authenticated", true).apply()
                            authenticated = true
                        } else {
                            error = true
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Entrar")
                }
            }
        }
    }
}
