import Link from 'next/link'
import { Button } from '@/components/ui'
import { Sparkles, Zap, Shield, ArrowRight, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
              <span className="text-xl font-bold text-text-primary">Estrategas IA</span>
            </div>
            <Link href="/login">
              <Button>Acceder</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border mb-8">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">Exclusivo para miembros Trucos Ecomm</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
            Genera imágenes de producto
            <br />
            <span className="text-accent">profesionales con IA</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            Crea imágenes verticales optimizadas para tus landings de dropshipping. 
            Usa tus propias API keys y controla tus costos.
          </p>
          
          <Link href="/login">
            <Button size="lg">
              Acceder con mi correo
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          
          <p className="text-sm text-text-secondary mt-4">
            Recibirás un código de acceso en tu correo
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Todo lo que necesitas para crear landings que convierten
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Herramientas profesionales sin complicaciones
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                IA de Última Generación
              </h3>
              <p className="text-text-secondary">
                Gemini mejora tus prompts automáticamente. Nano Banana genera imágenes 
                profesionales en formato 9:16.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Modelo BYOK
              </h3>
              <p className="text-text-secondary">
                Usa tus propias API keys. Tú controlas los costos, nosotros te damos 
                el motor inteligente.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/50 transition-colors">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Seguridad Total
              </h3>
              <p className="text-text-secondary">
                Tus API keys están encriptadas con AES-256. Solo tú tienes acceso 
                a tus generaciones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            ¿Eres miembro de Trucos Ecomm?
          </h2>
          <p className="text-text-secondary mb-8">
            Accede con el correo registrado en la comunidad y comienza a generar
          </p>
          <Link href="/login">
            <Button size="lg">
              Acceder ahora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="text-sm text-text-secondary">
              © 2024 Estrategas IA. Herramienta exclusiva de Trucos Ecomm.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}