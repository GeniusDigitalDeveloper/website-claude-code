package my.devicecontrol.agent

/** Tetapan Firebase projek my-devide-control (kunci web awam; keselamatan dikawal oleh Firestore Rules). */
object AgentConfig {
    const val API_KEY = "AIzaSyArLRlQqRAXckvH9jAsA4gcZ2bGfsJCl_c"
    const val PROJECT_ID = "my-devide-control"

    /**
     * Application ID Firebase. Nilai di bawah ialah ID aplikasi web. Jika Auth/Firestore menolak, daftarkan
     * aplikasi Android (package my.devicecontrol.agent) di Firebase Console > Project settings dan tampal
     * "App ID" Android di sini (bentuk 1:106788083798:android:xxxx).
     */
    const val APP_ID = "1:106788083798:web:1a75a67f5f3dc9ab7243f7"

    const val APP_VERSION = "0.1.0"
    const val HEARTBEAT_MS = 4 * 60 * 1000L   // panel menganggap OFFLINE selepas 10 minit
}
