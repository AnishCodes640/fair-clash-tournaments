import { BookOpen, Wallet, Trophy, Shield, Mail, Percent, Gamepad2 } from "lucide-react";

const RulesPage = () => {
  const sections = [
    {
      icon: Gamepad2, title: "Gameplay",
      items: [
        "All games are browser-based and run inside a secure embedded viewer.",
        "Some games support real-money betting via your wallet. Practice mode is available for select games.",
        "Aviator Crash: Place a bet, watch the multiplier grow, and cash out before the plane crashes. If you don't cash out in time, you lose your bet.",
      ],
    },
    {
      icon: Wallet, title: "Wallet & Deposits",
      items: [
        "Minimum deposit: ₹50. Upload a UPI payment screenshot as proof.",
        "Admin reviews and approves deposits manually. Balance updates in real time after approval.",
        "Your wallet balance is shared across all games on the platform.",
      ],
    },
    {
      icon: Percent, title: "Withdrawals & Commission",
      items: [
        "Minimum withdrawal: ₹100.",
        "Platform commission: 40% on withdrawal amount.",
        "Example: Withdraw ₹1000 → You receive ₹600, Platform keeps ₹400.",
        "You must provide UPI ID or QR code for withdrawal. Payment data is cleared after approval for privacy.",
      ],
    },
    {
      icon: Trophy, title: "Tournaments",
      items: [
        "Join tournaments by paying the entry fee from your wallet.",
        "Prize pools are distributed to winners after tournament ends.",
        "Check the Tournaments page for upcoming and live events.",
      ],
    },
    {
      icon: Shield, title: "Fair Play & Security",
      items: [
        "All transactions are logged and auditable.",
        "Accounts involved in fraud or abuse will be permanently banned.",
        "Game outcomes are determined by probability-based engines. The platform does not manipulate individual player outcomes.",
      ],
    },
    {
      icon: Mail, title: "Contact & Support",
      items: [
        "Use the in-app AI assistant for quick help.",
        "Founder: Anish Choudhary",
        "Website: fairfunstudios.wordpress.com",
        "Powered by Fair Fun Studios",
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Rules & Info</h1>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="surface-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <section.icon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{section.title}</h2>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default RulesPage;
