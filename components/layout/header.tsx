"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Programs", href: "/programs" },
    { name: "Apply", href: "/apply" },
  ]

  return (
    <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 hover-lift">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="font-bold text-xl gradient-text">Mukuba-KATC</span>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-10">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-base font-medium transition-all duration-300 hover:text-primary hover:-translate-y-0.5 relative",
                  pathname === item.href
                    ? "text-primary after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-secondary after:rounded-full"
                    : "text-muted-foreground",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center space-x-4">
                <NotificationDropdown userId={user.id} />
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="hover-lift">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="hover-lift bg-transparent">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="hover-lift">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm" className="hover-lift animate-pulse-glow">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
