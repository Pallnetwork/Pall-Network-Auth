package com.pall.network;

import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.gms.ads.rewarded.*;

public class MainActivity extends BridgeActivity {

    private InterstitialAd mInterstitialAd;
    private RewardedAd mRewardedAd;
    private AdView bannerAd;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d("FLAVOR_CHECK", "BASE_URL: " + BuildConfig.BASE_URL);

        MobileAds.initialize(this, status -> {
            loadInterstitialAd();
            loadRewardedAd();
        });

        // ✅ JS BRIDGE ATTACH
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(
                    new AndroidBridge(),
                    "AndroidBridge"
            );
        }

        // ✅ BACK BUTTON FIX
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null &&
                        getBridge().getWebView() != null &&
                        getBridge().getWebView().canGoBack()) {
                    getBridge().getWebView().goBack();
                } else {
                    finish();
                }
            }
        });
    }

    // =========================
    // ✅ ANDROID BRIDGE (FIXED)
    // =========================

    private class AndroidBridge {

        @JavascriptInterface
        public void showBannerAd() {
            MainActivity.this.showBannerAd();
        }

        @JavascriptInterface
        public void hideBannerAd() {
            MainActivity.this.hideBannerAd();
        }

        @JavascriptInterface
        public void showInterstitialForWallet() {
            MainActivity.this.showInterstitialForWallet();
        }

        // 🔥 FIX: REWARDED AD BRIDGE
        @JavascriptInterface
        public void startDailyRewardedAd() {
            MainActivity.this.startDailyRewardedAd();
        }
    }

    // =========================
    // BANNER
    // =========================

    public void showBannerAd() {

        runOnUiThread(() -> {

            if (bannerAd != null) return;

            bannerAd = new AdView(this);
            bannerAd.setAdUnitId(BuildConfig.BANNER_AD_UNIT_ID);
            bannerAd.setAdSize(AdSize.BANNER);

            if (getBridge() == null || getBridge().getWebView() == null) return;

            ViewGroup root = (ViewGroup) getBridge().getWebView().getParent();
            if (root == null) return;

            FrameLayout.LayoutParams params =
                    new FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.WRAP_CONTENT
                    );

            params.topMargin = 300;

            bannerAd.setLayoutParams(params);

            root.addView(bannerAd);

            AdRequest request = new AdRequest.Builder().build();
            bannerAd.loadAd(request);
        });
    }

    public void hideBannerAd() {

        runOnUiThread(() -> {

            if (bannerAd != null) {
                ViewGroup parent = (ViewGroup) bannerAd.getParent();
                if (parent != null) parent.removeView(bannerAd);

                bannerAd.destroy();
                bannerAd = null;
            }
        });
    }

    // =========================
    // INTERSTITIAL
    // =========================

    private void loadInterstitialAd() {

        AdRequest request = new AdRequest.Builder().build();

        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_AD_UNIT_ID, request,
                new InterstitialAdLoadCallback() {

                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        mInterstitialAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        mInterstitialAd = null;
                    }
                });
    }

    public void showInterstitialForWallet() {

        if (mInterstitialAd != null) {

            mInterstitialAd.setFullScreenContentCallback(
                    new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            loadInterstitialAd();

                            getBridge().getWebView().evaluateJavascript(
                                    "window.onAdCompleted()", null
                            );
                        }
                    }
            );

            mInterstitialAd.show(this);

        } else {
            loadInterstitialAd();

            getBridge().getWebView().evaluateJavascript(
                    "window.onAdCompleted()", null
            );
        }
    }

    // =========================
    // REWARDED (FINAL FIXED)
    // =========================

    private void loadRewardedAd() {

        AdRequest request = new AdRequest.Builder().build();

        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, request,
                new RewardedAdLoadCallback() {

                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        mRewardedAd = ad;

                        Log.d("ADS_DEBUG", "✅ Rewarded Ad Loaded SUCCESS");

                        // 🔥 IMPORTANT: notify React that ad is ready
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            Log.d("ADS_DEBUG", "📢 Calling JS: onDailyAdReady");

                            getBridge().getWebView().evaluateJavascript(
                                    "window.onDailyAdReady && window.onDailyAdReady()", null
                            );
                        }
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        mRewardedAd = null;

                        Log.e("ADS_DEBUG", "❌ Rewarded Ad FAILED: " + error.getMessage());
                    }
                });
    }

    public void startDailyRewardedAd() {

        Log.d("ADS_DEBUG", "🎯 startDailyRewardedAd CALLED");

        if (mRewardedAd != null) {

            Log.d("ADS_DEBUG", "🟢 Showing Rewarded Ad");

            mRewardedAd.setFullScreenContentCallback(
                    new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            Log.d("ADS_DEBUG", "🔁 Ad Closed → Reloading");
                            loadRewardedAd();
                        }
                    }
            );

            mRewardedAd.show(this, rewardItem -> {

                Log.d("ADS_DEBUG", "🎁 User Earned Reward");

                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                            "window.onRewardAdCompleted()", null
                    );
                }
            });

        } else {

            Log.e("ADS_DEBUG", "🔴 Ad NOT READY when requested");

            loadRewardedAd();

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                        "window.onAdFailed()", null
                );
            }
        }
    }
}