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

        Log.d("ADS_DEBUG", "🚀 App Started");

        MobileAds.initialize(this, status -> {
            Log.d("ADS_DEBUG", "🔥 AdMob Initialized");

            loadInterstitialAd();
            loadRewardedAd();
        });

        // =========================
        // JS BRIDGE ATTACH
        // =========================
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(
                    new AndroidBridge(),
                    "AndroidBridge"
            );
        }

        // =========================
        // BACK BUTTON HANDLER
        // =========================
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
    // ANDROID BRIDGE
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

        @JavascriptInterface
        public void startDailyRewardedAd() {
            MainActivity.this.startDailyRewardedAd();
        }
    }

    // =========================
    // BANNER ADS
    // =========================
    public void showBannerAd() {

        runOnUiThread(() -> {

            if (bannerAd != null) return;

            bannerAd = new AdView(this);
            bannerAd.setAdUnitId(BuildConfig.BANNER_AD_UNIT_ID);
            bannerAd.setAdSize(AdSize.BANNER);

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
    // INTERSTITIAL ADS
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

                            if (getBridge() != null && getBridge().getWebView() != null) {
                                getBridge().getWebView().evaluateJavascript(
                                        "window.onAdCompleted()", null
                                );
                            }
                        }
                    }
            );

            mInterstitialAd.show(this);

        } else {
            loadInterstitialAd();

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                        "window.onAdCompleted()", null
                );
            }
        }
    }

    // =========================
    // REWARDED AD LOAD
    // =========================
    private void loadRewardedAd() {

        Log.d("ADS_DEBUG", "📥 loadRewardedAd() CALLED");

        AdRequest request = new AdRequest.Builder().build();

        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, request,
                new RewardedAdLoadCallback() {

                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        mRewardedAd = ad;

                        Log.d("ADS_DEBUG", "✅ Rewarded Ad Loaded SUCCESS");

                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript(
                                    "window.__AD_READY__ = true; window.onDailyAdReady && window.onDailyAdReady();",
                                    null
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

    // =========================
    // REWARDED AD SHOW (FIXED CRASH)
    // =========================
    public void startDailyRewardedAd() {

        Log.d("ADS_DEBUG", "🎯 startDailyRewardedAd CALLED");

        runOnUiThread(() -> {

            if (mRewardedAd != null) {

                Log.d("ADS_DEBUG", "🟢 Showing Rewarded Ad");

                mRewardedAd.setFullScreenContentCallback(
                        new FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() {
                                Log.d("ADS_DEBUG", "🔁 Ad Closed → Reloading");
                                mRewardedAd = null;
                                loadRewardedAd();
                            }
                        }
                );

                try {
                    mRewardedAd.show(MainActivity.this, rewardItem -> {

                        Log.d("ADS_DEBUG", "🎁 User Earned Reward");

                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().post(() ->
                                    getBridge().getWebView().evaluateJavascript(
                                            "window.onRewardAdCompleted()", null
                                    )
                            );
                        }
                    });

                } catch (Exception e) {
                    Log.e("ADS_DEBUG", "❌ SHOW ERROR: " + e.getMessage());

                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                                "window.onAdFailed()", null
                        );
                    }
                }

            } else {

                Log.e("ADS_DEBUG", "🔴 Ad NOT READY");

                loadRewardedAd();

                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                            "window.onAdFailed()", null
                    );
                }
            }
        });
    }
}