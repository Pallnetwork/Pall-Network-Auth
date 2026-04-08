package com.pallnetwork.mining;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

public class MainActivity extends BridgeActivity {

    private InterstitialAd mInterstitialAd;
    private RewardedAd mRewardedAd;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d("FLAVOR_CHECK", "BASE_URL: " + BuildConfig.BASE_URL);

        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {
                loadInterstitialAd();
                loadRewardedAd();
            }
        });
    }

    private void loadInterstitialAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_AD_UNIT_ID, adRequest,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        mInterstitialAd = ad;
                        Log.d("ADMOB", "Interstitial loaded");

                        // ✅ SHOW AD
                        if (mInterstitialAd != null) {
                            mInterstitialAd.show(MainActivity.this);
                        }
                    }
                });
    }

    private void loadRewardedAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        RewardedAd.load(this, BuildConfig.REWARDED_AD_UNIT_ID, adRequest,
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        mRewardedAd = ad;
                        Log.d("ADMOB", "Rewarded loaded");

                        // ✅ SHOW AD
                        if (mRewardedAd != null) {
                            mRewardedAd.show(MainActivity.this, rewardItem -> {
                                Log.d("ADMOB", "Reward earned");
                            });
                        }
                    }
                });
    }
}