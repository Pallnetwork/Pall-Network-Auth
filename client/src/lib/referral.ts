// src/lib/referral.ts

// ✅ Generate simple referral code (username-based)
export function generateReferralCode(username: string, uid: string) {
  return `${username}-${uid.slice(0, 5)}`;
}

// ❌ Dynamic link removed (future me use karenge)