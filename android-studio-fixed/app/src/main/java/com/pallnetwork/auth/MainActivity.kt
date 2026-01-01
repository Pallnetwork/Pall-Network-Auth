package com.pallnetwork.auth

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    
    companion object {
        private const val SCHEME_PALLNETWORK = "pallnetwork"
        private const val PERMISSION_REQUEST_CODE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()
        
        // Set up full screen
        setupFullScreen()
        
        setContentView(R.layout.activity_main)
        
        // Initialize WebView
        webView = findViewById(R.id.webView)
        setupWebView()
        
        // Handle deep links
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun setupFullScreen() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.parseColor("#2563EB") // Pall Network blue
        window.navigationBarColor = Color.parseColor("#2563EB")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            
            // Enhanced Firebase authentication support
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            
            // Enable zoom controls but hide zoom buttons
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            
            // User agent for better compatibility
            userAgentString = userAgentString + " PallNetworkApp/1.0.0 (Mobile; Android)"
            
            // Enhanced storage and session persistence for Firebase
            setAppCacheEnabled(true)
            setAppCachePath(applicationContext.cacheDir.absolutePath)
            setAppCacheMaxSize(8 * 1024 * 1024) // 8MB
        }

        // Enable dark mode support if available
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_AUTO)
        }

        // Add JavaScript interface for native features
        webView.addJavascriptInterface(WebAppInterface(), "PallNetworkApp")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                
                return when {
                    url.startsWith("https://pallnetworkcommerce.com") -> {
                        // Load our web app URLs normally
                        false
                    }
                    url.startsWith("https://metamask.") || url.startsWith("https://trustwallet.") -> {
                        // Open wallet apps externally
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    }
                    url.startsWith("mailto:") || url.startsWith("tel:") -> {
                        // Handle email and phone links
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    }
                    else -> {
                        // Open external links in browser
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    }
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                // Show loading indicator if needed
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                
                // Inject CSS for better mobile experience and Firebase compatibility
                val css = """
                    javascript:(function() {
                        var style = document.createElement('style');
                        style.textContent = `
                            body { 
                                -webkit-user-select: none;
                                -webkit-touch-callout: none;
                                -webkit-tap-highlight-color: transparent;
                            }
                            .replit-banner { display: none !important; }
                        `;
                        document.head.appendChild(style);
                        
                        // Enhanced Firebase initialization for WebView
                        console.log('🔥 WebView page loaded - Firebase initialization ready');
                        
                        // Signal to web app that this is Android WebView
                        window.isAndroidWebView = true;
                        window.webViewReady = true;
                    })();
                """.trimIndent()
                view?.evaluateJavascript(css, null)
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    loadErrorPage()
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                // Log console messages for debugging
                return super.onConsoleMessage(consoleMessage)
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let { permissionRequest ->
                    // Verify origin is our trusted domain
                    val origin = permissionRequest.origin.toString()
                    if (!origin.startsWith("https://pallnetworkcommerce.com")) {
                        permissionRequest.deny()
                        return
                    }
                    
                    // Check requested resources and Android permissions
                    val requestedResources = permissionRequest.resources
                    val grantedResources = mutableListOf<String>()
                    
                    for (resource in requestedResources) {
                        when (resource) {
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) 
                                    == PackageManager.PERMISSION_GRANTED) {
                                    grantedResources.add(resource)
                                } else {
                                    ActivityCompat.requestPermissions(this@MainActivity, 
                                        arrayOf(Manifest.permission.CAMERA), PERMISSION_REQUEST_CODE)
                                }
                            }
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) 
                                    == PackageManager.PERMISSION_GRANTED) {
                                    grantedResources.add(resource)
                                } else {
                                    ActivityCompat.requestPermissions(this@MainActivity, 
                                        arrayOf(Manifest.permission.RECORD_AUDIO), PERMISSION_REQUEST_CODE)
                                }
                            }
                            else -> {
                                // Only grant known/safe resources
                            }
                        }
                    }
                    
                    if (grantedResources.isNotEmpty()) {
                        permissionRequest.grant(grantedResources.toTypedArray())
                    } else {
                        permissionRequest.deny()
                    }
                }
            }
        }

        // Load the web app
        webView.loadUrl(BuildConfig.WEB_APP_URL)
    }

    private fun loadErrorPage() {
        val errorHtml = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        text-align: center; 
                        padding: 50px 20px; 
                        background: #f8f9fa;
                        color: #333;
                    }
                    .error-container { 
                        max-width: 400px; 
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .error-icon { 
                        font-size: 48px; 
                        margin-bottom: 20px; 
                    }
                    .retry-btn {
                        background: #2563EB;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        margin-top: 20px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-icon">🌐</div>
                    <h2>Connection Error</h2>
                    <p>Unable to connect to Pall Network. Please check your internet connection and try again.</p>
                    <button class="retry-btn" onclick="location.reload()">Retry</button>
                </div>
            </body>
            </html>
        """.trimIndent()
        
        webView.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data
        if (data != null) {
            when (data.scheme) {
                SCHEME_PALLNETWORK -> {
                    // Handle custom scheme: pallnetwork://
                    val url = "${BuildConfig.WEB_APP_URL}${data.path ?: ""}"
                    webView.loadUrl(url)
                }
                "https" -> {
                    // Handle HTTPS deep links
                    if (data.host == "pallnetworkcommerce.com") {
                        webView.loadUrl(data.toString())
                    }
                }
            }
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun getAppVersion(): String {
            return BuildConfig.VERSION_NAME
        }

        @JavascriptInterface
        fun isAndroidApp(): Boolean {
            return true
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            // Permissions granted/denied - WebView will handle re-requesting if needed
            // The permission request callback will be triggered again if user grants permission
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}