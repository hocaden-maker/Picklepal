const TOS_TEXT = `Terms of Service

Last Updated: June 13, 2026

Welcome to PaddlePal ("PaddlePal," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the PaddlePal website, mobile applications, and related services (collectively, the "Service").

By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.

1. Eligibility

You must be at least 13 years old to use the Service. If you are under 18, you represent that you have permission from a parent or legal guardian. You may not use the Service if you are prohibited from doing so under applicable law.

2. Account Registration

To access certain features, you must create an account. You agree to provide accurate and complete information, maintain the security of your account credentials, notify us immediately of unauthorized account access, and accept responsibility for all activities occurring under your account. We reserve the right to suspend or terminate accounts that violate these Terms.

3. User Content

The Service may allow users to upload, post, submit, publish, or share content, including profile information, photos, match results, rankings, comments, reviews, messages, and event information. You retain ownership of your content. By submitting content, you grant PaddlePal a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, distribute, and otherwise use your content solely for operating, improving, and promoting the Service.

4. Community Standards

You agree not to harass, threaten, or intimidate others; post hateful, discriminatory, or abusive content; impersonate another person; create fake accounts; submit fraudulent match results; manipulate rankings or statistics; distribute spam or malicious software; attempt unauthorized access to the Service; or scrape, copy, or collect data without permission.

5. Match Results and Rankings

Rankings and statistics are provided for informational and recreational purposes only. We do not guarantee their accuracy. Users are solely responsible for the accuracy of information they submit.

6. Events, Games, and User Interactions

PaddlePal does not conduct background checks, verify every user's identity, or guarantee participant conduct. Any interactions arranged through the Service are solely between users. You assume all risks associated with participating in events or meeting other users.

7. Health and Safety Disclaimer

Pickleball and other athletic activities involve inherent risks, including property damage, injury, illness, disability, and death. You voluntarily participate at your own risk. To the fullest extent permitted by law, PaddlePal is not responsible for injuries, accidents, losses, or damages arising from participation in sports activities.

8. Location Services

Certain features may use location information. By enabling location services, you consent to our collection and use of location information as described in our Privacy Policy. You may disable location permissions through your device settings.

9. Premium Features and Payments

Some features may require payment or subscription. Fees are non-refundable except as required by law. Subscriptions automatically renew unless canceled before the renewal date. We may modify pricing with reasonable notice.

10. Intellectual Property

The Service is owned by PaddlePal or its licensors. You may not copy, modify, reverse engineer, or use our trademarks without permission.

11. Third-Party Services

The Service may integrate with third-party services such as Apple, Google, mapping providers, and payment processors. We are not responsible for third-party services.

12. Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, PADDLEPAL DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.

13. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, PADDLEPAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF $100 USD OR THE AMOUNT PAID BY YOU IN THE PRECEDING 12 MONTHS.

14. Indemnification

You agree to defend, indemnify, and hold harmless PaddlePal from claims, liabilities, damages, losses, and expenses arising from your use of the Service, your content, or your violation of these Terms.

15. Termination

We may suspend or terminate your account at any time if you violate these Terms or if we discontinue the Service.

16. Changes to These Terms

We may modify these Terms. Your continued use after changes become effective constitutes acceptance.

17. Governing Law

These Terms shall be governed by the laws of the State of California.

18. Contact Us

Questions may be directed to: support@paddlepal.com`;

export default function TosModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'white', borderRadius: '22px 22px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Terms of Service</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Last Updated: June 13, 2026</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'var(--surface)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)',
          }}>✕</button>
        </div>
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {TOS_TEXT}
        </div>
        <div style={{ padding: '12px 20px 28px', flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: '100%', height: 48, borderRadius: 12,
            background: 'var(--brand)', color: 'white',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
