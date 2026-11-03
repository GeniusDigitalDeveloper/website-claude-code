package my.devicecontrol.agent

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

class AgentApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (FirebaseApp.getApps(this).isEmpty()) {
            val options = FirebaseOptions.Builder()
                .setApiKey(AgentConfig.API_KEY)
                .setApplicationId(AgentConfig.APP_ID)
                .setProjectId(AgentConfig.PROJECT_ID)
                .build()
            FirebaseApp.initializeApp(this, options)
        }
    }
}
