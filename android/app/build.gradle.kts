plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.hyperdrop"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.hyperdrop"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.2.0"
    }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}
