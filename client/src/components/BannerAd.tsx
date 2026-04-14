import React from "react";

export default function BannerAd() {
  return (
    <div className="w-full mt-3 px-2">
      <div className="rounded-xl overflow-hidden shadow-sm">
        <img
          src="/banners/banner1.jpg"
          className="w-full h-[100px] object-cover rounded-xl"
          alt="banner"
        />
      </div>
    </div>
  );
}