package com.alphabert.reading;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;

/** Offline-only app shell; the same web game is editable in the project root. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_FILE = 100;
    private static final int EXPORT_FILE = 101;
    private WebView web;
    private TextToSpeech voice;
    private volatile boolean voiceReady;
    private String pendingSpeech;
    private ValueCallback<Uri[]> fileResult;
    private String pendingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(true);
        web.setBackgroundColor(0xfff4f5fb);
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Android document picker for local content packs.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new VoiceBridge(), "AndroidVoice");
        web.addJavascriptInterface(new FileBridge(), "AndroidFiles");
        web.addJavascriptInterface(new GameLockBridge(), "AndroidGameLock");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isLocal(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocal(uri)) return response(403, "Forbidden");
                String path = uri.getPath();
                if (path == null || !path.startsWith("/assets/") || path.contains("..") || path.contains("\\"))
                    return response(404, "Not Found");
                path = path.substring(8);
                try {
                    WebResourceResponse result = new WebResourceResponse(mime(path), "UTF-8", getAssets().open(path));
                    HashMap<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("X-Content-Type-Options", "nosniff");
                    result.setResponseHeaders(headers);
                    result.setStatusCodeAndReasonPhrase(200, "OK");
                    return result;
                } catch (IOException e) {
                    android.util.Log.e("AlphabertAssets", "Cannot open asset: " + path, e);
                    return response(404, "Not Found");
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*"); // JSON MIME differs across Android file providers.
                try { startActivityForResult(intent, PICK_FILE); }
                catch (android.content.ActivityNotFoundException e) {
                    fileResult.onReceiveValue(null); fileResult = null;
                }
                return true;
            }
        });
        voice = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int language = voice.setLanguage(Locale.US);
                voiceReady = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED;
                voice.setSpeechRate(0.85f);
                voice.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { speechEnded(id); }
                    @Override public void onError(String id) { speechEnded(id); }
                });
                if (voiceReady && pendingSpeech != null) {
                    say(pendingSpeech); pendingSpeech = null;
                }
            }
        });
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }
    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost());
    }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        if (path.endsWith(".ogg")) return "audio/ogg";
        if (path.endsWith(".wav")) return "audio/wav";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }
    private static WebResourceResponse response(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason, new HashMap<>(),
                new ByteArrayInputStream(reason.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    private void say(String text) {
        if (text == null || text.length() == 0) return;
        String safe = text.substring(0, Math.min(text.length(), 2000));
        if (voiceReady) voice.speak(safe, TextToSpeech.QUEUE_FLUSH, null, "reading");
        else pendingSpeech = safe;
    }
    private void speechEnded(String id) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('android-speech-end',{detail:"
                    + org.json.JSONObject.quote(id) + "}))", null);
        });
    }
    private final class VoiceBridge {
        @JavascriptInterface public void setRate(float rate) {
            runOnUiThread(() -> { if (voice != null) voice.setSpeechRate(Math.max(0.5f, Math.min(1.5f, rate))); });
        }
        @JavascriptInterface public void speak(String text) { runOnUiThread(() -> say(text)); }
        @JavascriptInterface public void speakWithId(String text, String id) {
            runOnUiThread(() -> {
                if (voiceReady && text != null) voice.speak(text.substring(0, Math.min(text.length(), 2000)),
                        TextToSpeech.QUEUE_FLUSH, null, id);
                else speechEnded(id);
            });
        }
        @JavascriptInterface public void stop() {
            runOnUiThread(() -> { pendingSpeech = null; if (voice != null) voice.stop(); });
        }
        @JavascriptInterface public boolean isReady() { return voiceReady; }
    }
    private final class FileBridge {
        @JavascriptInterface public void exportJson(String json) {
            if (json == null || json.length() > 2000000) return;
            runOnUiThread(() -> {
                if (pendingExport != null) return;
                pendingExport = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "alphabert-content.json");
                try { startActivityForResult(intent, EXPORT_FILE); }
                catch (android.content.ActivityNotFoundException e) {
                    pendingExport = null;
                    android.widget.Toast.makeText(MainActivity.this, "No file app available. Use the text backup instead.", android.widget.Toast.LENGTH_LONG).show();
                }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 102 && result == RESULT_OK) { stopLockTask(); notifyGameLock(); }
        if (request == PICK_FILE && fileResult != null) {
            Uri picked = result == RESULT_OK && data != null ? data.getData() : null;
            fileResult.onReceiveValue(picked == null ? null : new Uri[]{picked});
            fileResult = null;
        }
        if (request == EXPORT_FILE) {
            String json = pendingExport;
            pendingExport = null;
            if (result == RESULT_OK && data != null && data.getData() != null && json != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    if (output == null) throw new IOException("No output stream");
                    output.write(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    android.widget.Toast.makeText(this, "Content pack saved", android.widget.Toast.LENGTH_SHORT).show();
                } catch (IOException | SecurityException e) {
                    android.widget.Toast.makeText(this, "Could not save. Use the text backup instead.", android.widget.Toast.LENGTH_LONG).show();
                }
            }
        }
    }
    @Override protected void onPause() {
        super.onPause(); pendingSpeech = null;
        if (voice != null) voice.stop();
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new Event('androidpause'))", null);
            web.onPause();
        }
    }
    private boolean isGamePinned() {
        android.app.ActivityManager manager = (android.app.ActivityManager) getSystemService(ACTIVITY_SERVICE);
        return manager.getLockTaskModeState() != android.app.ActivityManager.LOCK_TASK_MODE_NONE;
    }
    private void notifyGameLock() {
        if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('android-game-lock'))", null);
    }
    private final class GameLockBridge {
        @JavascriptInterface public boolean isPinned() { return isGamePinned(); }
        @JavascriptInterface public void toggle() {
            runOnUiThread(() -> {
                if (isGamePinned()) {
                    // A child reaching Grown-ups must not be able to unpin with one tap.
                    android.app.KeyguardManager keyguard = (android.app.KeyguardManager) getSystemService(KEYGUARD_SERVICE);
                    Intent unlock = keyguard.createConfirmDeviceCredentialIntent("Turn off Keep game open", "Confirm your phone's screen lock to unpin Alphabert.");
                    if (unlock != null) startActivityForResult(unlock, 102);
                    else {
                        final int first = 12 + new java.util.Random().nextInt(8);
                        final int second = 12 + new java.util.Random().nextInt(8);
                        final android.widget.EditText answer = new android.widget.EditText(MainActivity.this);
                        answer.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
                        new android.app.AlertDialog.Builder(MainActivity.this)
                            .setTitle("Grown-ups: " + first + " + " + second + " = ?")
                            .setMessage("Enter the answer to turn off Keep game open.")
                            .setView(answer).setNegativeButton("Cancel", null)
                            .setPositiveButton("Turn off", (dialog, which) -> {
                                if (answer.getText().toString().trim().equals(String.valueOf(first + second))) {
                                    stopLockTask(); notifyGameLock();
                                }
                            }).show();
                    }
                } else {
                    new android.app.AlertDialog.Builder(MainActivity.this)
                        .setTitle("Keep game open")
                        .setMessage("Android will ask you to pin Alphabert. Accept its confirmation. To leave, use Android's unpin gesture shown in that prompt, or return here to turn this off. For stronger protection, enable Require PIN to unpin in your phone's App pinning settings. Pinning must be started again if Android ends the session.")
                        .setNegativeButton("Cancel", null)
                        .setPositiveButton("Pin game", (dialog, which) -> {
                            try { startLockTask(); }
                            catch (IllegalStateException | SecurityException error) {
                                android.widget.Toast.makeText(MainActivity.this, "Could not pin. Enable App pinning in your phone's settings, then try again.", android.widget.Toast.LENGTH_LONG).show();
                            }
                            notifyGameLock();
                        }).show();
                }
            });
        }
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) notifyGameLock();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); notifyGameLock(); } }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.dispatchEvent(new Event('androidback'))", null);
    }
    @Override protected void onDestroy() {
        if (fileResult != null) fileResult.onReceiveValue(null);
        if (voice != null) { voice.stop(); voice.shutdown(); }
        if (web != null) { web.removeJavascriptInterface("AndroidVoice"); web.removeJavascriptInterface("AndroidFiles"); web.removeJavascriptInterface("AndroidGameLock"); web.destroy(); }
        super.onDestroy();
    }
}
