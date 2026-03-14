const PrivacyPage = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Fair Fun Studios Gaming Platform — Effective Date: 2026</p>

      <div className="space-y-6 text-sm text-secondary-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-muted-foreground">When users create an account or use our platform, we may collect:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Username, email address, login credentials</li>
            <li>Wallet transaction records</li>
            <li>Payment screenshots or proof submitted for deposits</li>
            <li>Gameplay activity and match history</li>
            <li>Device and browser information for security purposes</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Create and manage user accounts</li>
            <li>Process tournament entries and wallet transactions</li>
            <li>Verify payment submissions</li>
            <li>Prevent fraud or misuse of the platform</li>
            <li>Improve gameplay systems and platform stability</li>
            <li>Provide customer support</li>
          </ul>
          <p className="text-muted-foreground">We do not sell user data to third parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Wallet and Payments</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Deposits are credited only after manual verification by the platform administrator.</li>
            <li>Users must provide valid payment proof for wallet top-ups.</li>
            <li>Incorrect or fraudulent payment claims may lead to account suspension.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Platform Commission</h2>
          <p className="text-muted-foreground">Fair Fun Studios may charge a platform service fee on certain activities including tournament entry pools, game participation fees, and wallet transactions. This commission is used for platform maintenance, server costs, development, updates, and operational expenses.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Game Risk Disclaimer</h2>
          <p className="text-muted-foreground">Some games include prediction-based or chance-based mechanics. Outcomes are uncertain, wins are not guaranteed, and players may lose the amount they wager. Users should participate responsibly.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Account Security</h2>
          <p className="text-muted-foreground">Users are responsible for maintaining the confidentiality of their login credentials. Fair Fun Studios is not responsible for losses caused by sharing credentials or unauthorized access due to user negligence.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Account Suspension</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or permanently ban accounts for fraud, payment manipulation, abuse of platform systems, or rule violations.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Data Protection</h2>
          <p className="text-muted-foreground">We take reasonable steps to protect user information through secure databases and restricted access. However, no online system can guarantee 100% security.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Policy Changes</h2>
          <p className="text-muted-foreground">Fair Fun Studios may update this Privacy Policy from time to time. Updated policies will be published on the platform.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">10. Contact Us</h2>
          <p className="text-muted-foreground">Email: fairfunstudios@gmail.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
