import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">FF</span>
              </div>
              <span className="font-semibold">Fair Fun Studios</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The professional standard for mobile esports. Compete. Win. Withdraw.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3">Links</h4>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <a href="mailto:fairfunstudios@gmail.com" className="hover:text-foreground transition-colors">Support</a>
              <a href="https://fairfunstudios.wordpress.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Website</a>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Contact</h4>
            <p className="text-xs text-muted-foreground">fairfunstudios@gmail.com</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground space-y-1">
          <p>© 2026 Fair Fun Studios. All Rights Reserved.</p>
          <p>Fully Managed and Controlled by Fair Fun Studios.</p>
          <p>Parent Company: <span className="text-foreground font-medium">SPark</span></p>
          <p>Founded by: <span className="text-foreground font-medium">Anish Choudhary</span></p>
        </div>
      </div>
    </footer>
  );
}
