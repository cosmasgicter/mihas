import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card/50 backdrop-blur-sm border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6 animate-fade-in-up">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="font-bold text-xl gradient-text">Mukuba-KATC</span>
            </div>
            <p className="text-muted-foreground text-base max-w-md leading-relaxed">
              Apply to Mukuba University and Kasisi Agricultural Training Centre (KATC) through our secure online
              platform.
            </p>
          </div>

          <div className="animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
            <h3 className="font-semibold text-foreground mb-6 text-lg">Quick Links</h3>
            <ul className="space-y-3 text-base">
              <li>
                <Link
                  href="/programs"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Programs
                </Link>
              </li>
              <li>
                <Link
                  href="/apply"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Apply Now
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
            <h3 className="font-semibold text-foreground mb-6 text-lg">Support</h3>
            <ul className="space-y-3 text-base">
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-center text-base text-muted-foreground">
            © 2024 Mukuba-KATC Student Application Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
