import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { GraduationCap, Users, FileText, Shield } from "lucide-react"

export default function HomePage() {
  const features = [
    {
      icon: GraduationCap,
      title: "Quality Education",
      description:
        "Access world-class programs at Mukuba University and Kasisi Agricultural Training Centre (KATC) with experienced faculty and modern facilities.",
    },
    {
      icon: Users,
      title: "Student Support",
      description: "Comprehensive support throughout your application journey and academic career.",
    },
    {
      icon: FileText,
      title: "Easy Application",
      description: "Streamlined online application process with document management and real-time status updates.",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your personal information and documents are protected with enterprise-grade security.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="gradient-bg animate-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center animate-fade-in-up">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl text-balance text-white drop-shadow-lg">
              Your Future Starts Here
            </h1>
            <p className="mt-8 text-xl leading-8 text-white/95 max-w-3xl mx-auto text-pretty drop-shadow">
              Apply to Mukuba University and Kasisi Agricultural Training Centre (KATC) through our secure online
              platform.
            </p>
            <div className="mt-12 flex items-center justify-center gap-x-8">
              <Link href="/apply">
                <Button size="lg" variant="secondary" className="hover-lift animate-pulse-glow text-lg px-8 py-4">
                  Start Application
                </Button>
              </Link>
              <Link href="/programs">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-primary bg-transparent hover-lift text-lg px-8 py-4"
                >
                  View Programs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl gradient-text">
              Choose Your Institution
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">Two prestigious institutions, one application platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Card className="border-2 hover:border-primary transition-all duration-500 hover-lift hover:shadow-2xl animate-slide-in-left">
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl gradient-text">Mukuba University</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Science, Technology, Engineering & Mathematics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                  Leading STEM-focused university in Kitwe with state-of-the-art facilities and experienced faculty
                  preparing the next generation of scientists, engineers, and technology professionals.
                </p>
                <ul className="space-y-3 text-base text-muted-foreground">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Nutritional Science (MSc)
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Engineering Programs
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Technology Studies
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Applied Sciences
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className="border-2 hover:border-primary transition-all duration-500 hover-lift hover:shadow-2xl animate-slide-in-left"
              style={{ animationDelay: "0.2s" }}
            >
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl gradient-text">KATC</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Kasisi Agricultural Training Centre
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                  Premier agricultural training institution near Lusaka specializing in sustainable organic agriculture
                  with hands-on training and modern farming techniques.
                </p>
                <ul className="space-y-3 text-base text-muted-foreground">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    Organic Agriculture
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    Agroforestry
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    Beekeeping & Apiculture
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                    Farm Management
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl gradient-text">
              Why Choose Our Platform?
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Everything you need for a successful application experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="text-center hover-lift hover:shadow-xl transition-all duration-500 animate-fade-in-up border-2 hover:border-primary/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-4">
                  <div className="mx-auto h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 animate-pulse-glow">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl gradient-text">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-accent via-primary to-secondary animate-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white drop-shadow-lg">
              Ready to Begin Your Journey?
            </h2>
            <p className="mt-6 text-xl text-white/95 drop-shadow max-w-2xl mx-auto">
              Join thousands of students who have started their careers through our institutions.
            </p>
            <div className="mt-12">
              <Link href="/apply">
                <Button size="lg" variant="secondary" className="hover-lift animate-pulse-glow text-lg px-10 py-4">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
