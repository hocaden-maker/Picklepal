const PRIVACY_TEXT = `Privacy Policy

Last Updated: June 13, 2026

Welcome to PaddlePal ("PaddlePal," "we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you use the PaddlePal mobile application, website, and related services (collectively, the "Service").

By accessing or using the Service, you agree to this Privacy Policy.

1. Information We Collect

Information You Provide

We may collect:
• Name
• Username
• Email address
• Profile photo
• Biography and profile details
• Age range
• Skill level
• Match results and statistics
• Club affiliations
• Event participation
• Messages and communications
• User-generated content, including posts, comments, reviews, and uploads

Information Collected Automatically

We may collect:
• Device type
• Device identifiers
• Operating system
• Browser information
• App version
• IP address
• Network information
• Usage activity
• Session information
• Error logs
• Crash reports
• Diagnostic information

Location Information

With your permission, we may collect:
• Precise GPS location
• Approximate location
• Court check-ins
• Nearby court searches
• Nearby player searches
• Event attendance data

You can disable location access through your device settings.

2. How We Use Information

We use information to:
• Provide and operate the Service
• Create and manage user accounts
• Track matches and statistics
• Facilitate player connections
• Recommend courts, events, and players
• Improve rankings and matchmaking systems
• Personalize content
• Improve product performance
• Respond to support requests
• Detect fraud and abuse
• Protect platform security
• Enforce our Terms of Service
• Comply with legal obligations

3. AI-Powered Features

PaddlePal may use artificial intelligence and machine learning technologies to:
• Recommend players
• Suggest events and playing partners
• Improve rankings
• Personalize feeds
• Detect spam and abuse
• Improve search results

AI-generated recommendations may occasionally be inaccurate or incomplete. Users should independently evaluate recommendations before relying upon them.

4. Information Visible to Other Users

Depending on your privacy settings, other users may view:
• Username
• Profile picture
• Skill level
• Match history
• Statistics
• Rankings
• Public posts
• Event participation
• Club memberships

You control certain visibility settings within the app.

5. Cookies and Similar Technologies

We may use cookies, SDKs, pixels, device identifiers, and local storage technologies to authenticate users, maintain sessions, analyze usage, improve performance, prevent fraud, and personalize experiences. You may manage cookie preferences through your browser settings where applicable.

6. Analytics

We may use analytics providers to understand app performance, user engagement, feature adoption, and technical issues. Analytics information may include device identifiers, usage activity, and technical data.

7. Push Notifications

We may send notifications regarding match invitations, friend requests, event reminders, messages, product updates, and security alerts. You may disable notifications through your device settings.

8. Payment Processing

If premium subscriptions or paid features are offered, payments may be processed by third-party providers such as Stripe, Apple App Store, or Google Play. PaddlePal does not store complete credit card information. Payment providers collect and process payment information according to their own privacy policies.

9. How We Share Information

We do not sell personal information.

We may share information:

With Service Providers that assist us in hosting, analytics, customer support, security, payment processing, and cloud infrastructure.

For Legal Compliance when required by law or reasonably necessary to comply with legal obligations, protect users, investigate fraud, or enforce agreements.

In Business Transactions if PaddlePal undergoes an acquisition, merger, investment, asset sale, or corporate restructuring.

10. Data Retention

We retain information only as long as reasonably necessary to operate the Service, comply with legal obligations, resolve disputes, and enforce agreements. Data may remain in backups for a limited period after deletion requests.

11. Account Deletion

You may request deletion of your account. Upon deletion, your profile will be removed from public view. Certain content may remain if associated with other users' activities. Certain records may be retained where legally required.

12. Security

We use reasonable safeguards designed to protect information, including encryption in transit, secure authentication systems, access controls, and monitoring and logging. However, no system is completely secure. We cannot guarantee absolute security.

13. Children's Privacy

The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that such information has been collected, we will take reasonable steps to delete it.

14. California Privacy Rights (CCPA/CPRA)

California residents may have rights to know what personal information we collect, access collected information, correct inaccurate information, request deletion, limit certain uses of sensitive personal information, and receive information about disclosures.

To exercise these rights, contact: privacy@paddlepal.com

We will not discriminate against users for exercising privacy rights.

15. European Privacy Rights (GDPR)

If you are located in the European Economic Area, United Kingdom, or Switzerland, you may have rights to access your information, correct inaccurate information, delete information, restrict or object to processing, and data portability.

Requests may be submitted to: privacy@paddlepal.com

16. Do Not Track

Some browsers support "Do Not Track" signals. Because there is no universally accepted standard for responding to such signals, PaddlePal may not respond to them.

17. International Data Transfers

Information may be stored and processed in the United States and countries where our service providers operate. By using the Service, you consent to such transfers.

18. App Store Privacy Disclosure

PaddlePal may collect: Contact Information (name, email), User Content (photos, posts, messages, match results), Identifiers (user ID, device ID, IP address), Usage Data (app interactions, search history, feature usage), Location Data (precise and approximate location), and Diagnostics (crash reports, performance logs).

Collection and use of data may vary depending on enabled features and user permissions.

19. Changes to This Privacy Policy

We may update this Privacy Policy periodically. Material changes will be communicated through the Service or by other reasonable means. Continued use of the Service constitutes acceptance of updated policies.

20. Contact Information

PaddlePal, Inc.
Email: support@paddlepal.com
Privacy Requests: privacy@paddlepal.com`;

export default function PrivacyModal({ onClose }) {
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
            <div style={{ fontSize: 17, fontWeight: 800 }}>Privacy Policy</div>
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
          {PRIVACY_TEXT}
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
