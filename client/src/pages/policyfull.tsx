import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function PolicyFull() {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">

      {/* 🔙 BACK BUTTON */}
      <Button onClick={() => navigate(-1)} variant="outline">
        ← Back
      </Button>

      <h1 className="text-2xl font-bold">
        📜 Plan Policy & Terms
      </h1>

      <div className="text-sm whitespace-pre-line leading-relaxed">

{`📜 PLAN POLICY – PALL NETWORK

1️⃣ Introduction
Pall Network operates a structured digital platform focused on knowledge development, skill enhancement, and digital awareness systems. This platform is designed to provide users with organized access to digital tools, interactive modules, and content-based systems that support structured knowledge growth.

This Package Policy explains the structure, access levels, payment terms, and usage guidelines related to subscription plans offered on the platform.

By purchasing or using any plan, the user agrees to this policy.

2️⃣ Nature of Platform
The platform is strictly a knowledge development and digital skill enhancement system. It is designed to:
Improve user understanding of digital concepts
Provide structured skill development modules
Offer interactive quizzes and content systems
Support engagement through informational tools

The platform does not operate as a financial institution, investment service, or income-generating scheme.

3️⃣ Subscription Plans Overview

🪙 Starter Plan – Entry Access
The Starter Plan is designed for users beginning their journey in digital knowledge development.

It includes:
Basic knowledge development modules
Standard quiz system access
Limited content library access
Advertisement-supported experience
Structured introductory skill-building content

📈 Growth Plan – Advanced Access
The Growth Plan is designed for users who want expanded knowledge development capabilities.

It includes:
Extended modules
Advanced quiz systems
Reduced ads
Expanded content

💎 Elite Plan – Premium Access
The Elite Plan provides full access.

It includes:
All modules
Premium content
Priority access
Minimal ads

4️⃣ Payment Structure
Payments are for digital access only and not investments.

5️⃣ Payment Verification
Users must submit TXID after payment.
Verification may take up to 24 hours.

6️⃣ Refund Policy
Payments are non-refundable except technical errors or duplicate cases.

7️⃣ Usage Rights
Access depends on selected plan.
Misuse may result in suspension.

8️⃣ Legal Statement
Platform is not financial service or investment system.

9️⃣ Crypto Notice
Crypto payments are irreversible.

🔟 System Changes
Platform may update features and pricing.

1️⃣1️⃣ User Responsibility
Users must follow platform rules.

1️⃣2️⃣ Final Agreement
By purchasing, user agrees to all terms.

📌 Conclusion
Pall Network provides structured knowledge platform only.

---------------------------------------------

📜 TERMS & CONDITIONS

1️⃣ Acceptance
Using platform means you agree to terms.

2️⃣ Services
Platform provides knowledge development system.

3️⃣ No Investment
No profits or returns guaranteed.

4️⃣ Subscription
Paid access for digital services only.

5️⃣ Payments
All payments final unless exception.

6️⃣ Verification
TXID verification required.

7️⃣ Refunds
Limited cases only.

8️⃣ User Rules
No misuse allowed.

9️⃣ Intellectual Property
Content belongs to platform.

🔟 Liability
Platform not responsible for losses.

1️⃣1️⃣ Crypto Disclaimer
Transactions cannot be reversed.

1️⃣2️⃣ Modifications
Platform can change anytime.

1️⃣3️⃣ Compliance
Platform follows legal frameworks.

1️⃣4️⃣ Final Agreement
User agrees to all terms.

📌 Closing
Platform is for education and digital skills only.
`}
      </div>

    </div>
  );
}