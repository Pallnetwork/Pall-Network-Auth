package com.pall.network;

import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.gms.ads.rewarded.*;

public class MainActivity extends BridgeActivity {

    private InterstitialAd mInterstitialAd;
    private RewardedAd mRewardedAd;
    private AdView bannerAd;

    private boolean bannerAdded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d("FLAVOR_CHECK", "BASE_URL: " + BuildConfig.BASE_URL);

        MobileAds.initialize(this, status -> {
            loadInterstitialAd();
            loadRewardedAd();
        });

        // SAFE BACK BUTTON
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

        // START CHECK
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(this::checkAndShowBanner, 2000);
        }
    }

    // DASHBOARD ONLY
    private void checkAndShowBanner() {

        if (getBridge() == null || getBridge().getWebView() == null) return;

        String url = getBridge().getWebView().getUrl();

        if (url != null && url.contains("dashboard")) {

            if (!bannerAdded) {
                loadBannerAd();
                bannerAdded = true;
            }

        } else {
            removeBanner();
            bannerAdded = false;
        }

        getBridge().getWebView().postDelayed(this::checkAndShowBanner, 2000);
    }

    private void removeBanner() {
        if (bannerAd != null) {
            ViewGroup parent = (ViewGroup) bannerAd.getParent();
            if (parent != null) parent.removeView(bannerAd);

            bannerAd.destroy();
            bannerAd = null;
        }
    }

    // BANNER FIXED VERSION (NO topMargin)
    private void loadBannerAd() {

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

        params.gravity = android.view.Gravity.BOTTOM; // ✅ FIXED POSITION LOGIC

        bannerAd.setLayoutParams(params);

        root.addView(bannerAd);

        AdRequest request = new AdRequest.Builder().build();
        bannerAd.loadAd(request);
    }

    // INTERSTITIAL
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

    // REWARDED
    private void loadRewardedAd() {

        AdRequest request = new AdRequest.Builder().build();

        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, request,
                new RewardedAdLoadCallback() {

                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        mRewardedAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        mRewardedAd = null;
                    }
                });
    }

    public void startDailyRewardedAd() {

        if (mRewardedAd != null) {

            mRewardedAd.setFullScreenContentCallback(
                    new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            loadRewardedAd();
                        }
                    }
            );

            mRewardedAd.show(this, rewardItem -> {
                getBridge().getWebView().evaluateJavascript(
                        "window.onRewardAdCompleted()", null
                );
            });

        } else {
            loadRewardedAd();

            getBridge().getWebView().evaluateJavascript(
                    "window.onAdFailed()", null
            );
        }
    }
}