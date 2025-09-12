import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Button } from '@/components/ui/Button'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { FloatingElements, GeometricPatterns } from '@/components/ui/FloatingElements'
import { GraduationCap, Users, Award, BookOpen, Star, ArrowRight, CheckCircle } from 'lucide-react'

export default function LandingPageNew() {
  const [heroRef, heroInView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [statsRef, statsInView] = useInView({ threshold: 0.3, triggerOnce: true })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.25, 0, 1]
      }
    }
  }

  const stats = [
    { number: "1000+", label: "Graduates", delay: 0.1 },
    { number: "95%", label: "Employment Rate", delay: 0.2 },
    { number: "20+", label: "Years Experience", delay: 0.3 },
    { number: "50+", label: "Industry Partners", delay: 0.4 }
  ]

  const features = [
    {
      icon: Users,
      title: "Expert Faculty",
      description: "Learn from experienced professionals and industry experts who bring real-world knowledge to the classroom",
      gradient: "from-primary to-primary/60"
    },
    {
      icon: Award,
      title: "Accredited Programs",
      description: "All our programs are fully accredited and recognized by industry bodies and government agencies",
      gradient: "from-secondary to-secondary/60"
    },
    {
      icon: BookOpen,
      title: "Practical Training",
      description: "Hands-on experience through internships, clinical rotations, and industry partnerships",
      gradient: "from-accent to-accent/60"
    }
  ]

  const programs = [
    {
      institution: "Kalulushi Training Centre",
      courses: [
        "Diploma in Clinical Medicine (HPCZ Accredited)",
        "Diploma in Environmental Health (ECZ Certified)"
      ],
      highlight: "Professional Excellence",
      accreditation: "HPCZ & ECZ Certified",
      image: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f4d8d7cb-b8b3-4a0a-ba36-084fa481da0d.png"
    },
    {
      institution: "Mukuba Institute of Health and Applied Sciences",
      courses: [
        "Diploma in Registered Nursing (NMCZ Accredited)"
      ],
      highlight: "NMCZ Certified",
      accreditation: "NMCZ Approved",
      image: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f703f321-4922-421e-8288-cf059bd92133.png"
    }
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Enhanced Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/20"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <GraduationCap className="h-8 w-8 text-primary" />
              </motion.div>
              <span className="text-xl font-bold gradient-text">MIHAS-KATC</span>
            </motion.div>
            <motion.div
              className="flex space-x-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <Link to="/track-application">
                  <Button 
                    variant="outline" 
                    size="md" 
                    className="text-white border-2 border-white/50 hover:bg-white hover:text-primary font-semibold backdrop-blur-sm bg-white/10 transition-all duration-300 hover:scale-105"
                  >
                    Track Application
                  </Button>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link to="/auth/signin">
                  <Button variant="gradient" size="md" magnetic className="bg-gradient-to-r from-white/20 to-white/30 border border-white/50 text-white hover:from-white hover:to-white hover:text-primary font-semibold backdrop-blur-sm">
                    Sign In
                  </Button>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link to="/auth/signup">
                  <Button variant="gradient" size="md" magnetic glow className="font-semibold">
                    Apply Now
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </nav>
      </motion.header>

      {/* Enhanced Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10" />
        <FloatingElements count={30} />
        <GeometricPatterns />

        <motion.div
          ref={heroRef}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
          variants={containerVariants}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
        >
          <motion.div variants={itemVariants} className="mb-6">
            <TypewriterText
              text="Your Future Starts Here"
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
              delay={1000}
              speed={100}
            />
          </motion.div>
          
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl lg:text-3xl mb-8 max-w-4xl mx-auto leading-relaxed text-white/95 font-medium"
          >
            Join Mukuba Institute of Health and Applied Sciences and Kalulushi Training Centre – Leading institutions in health sciences education in Zambia
          </motion.p>
          
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Link to="/auth/signup">
              <Button variant="gradient" size="xl" magnetic glow>
                <span className="mr-2">Start Your Application</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="xl" 
              className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="mr-2">Learn More</span>
              <Star className="w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center hover:border-gray-200 transition-colors">
            <motion.div
              className="w-1 h-3 bg-white rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gray-50 relative">
        <FloatingElements count={10} className="opacity-30" />
        <motion.div
          ref={statsRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          variants={containerVariants}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
                style={{ transitionDelay: `${stat.delay}s` }}
              >
                <motion.div
                  className="text-4xl md:text-5xl font-bold gradient-text mb-2"
                  initial={{ scale: 0 }}
                  animate={statsInView ? { scale: 1 } : { scale: 0 }}
                  transition={{ duration: 0.8, delay: stat.delay, type: "spring" }}
                >
                  {stat.number}
                </motion.div>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-20 bg-white relative">
        <GeometricPatterns />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Why Choose MIHAS-KATC?
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">
              We offer world-class education with practical training to prepare you for a successful career
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard
                key={index}
                delay={index * 0.2}
                direction="up"
                hover3d={true}
                gradient={true}
                className="text-center group"
              >
                <motion.div
                  className={`bg-gradient-to-br ${feature.gradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <feature.icon className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditation Section */}
      <section className="py-16 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
              Accredited by Leading Professional Bodies
            </h2>
            <p className="text-lg text-gray-700">
              Our programs meet the highest standards set by Zambian regulatory authorities
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5, shadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            >
              <img
                src="https://nmcz.org.zm/wp-content/uploads/2021/03/NMCZ-LOGO.png"
                alt="NMCZ Logo"
                className="h-16 mx-auto mb-4 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">NMCZ Accredited</h3>
              <p className="text-gray-600 text-sm mb-3">
                Nursing and Midwifery Council of Zambia
              </p>
              <p className="text-xs text-gray-500">
                Diploma in Registered Nursing meets NMCZ professional standards
              </p>
            </motion.div>
            
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5, shadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            >
              <img
                src="https://hpcz.org.zm/wp-content/uploads/2020/11/hpcz-logo.png"
                alt="HPCZ Logo"
                className="h-16 mx-auto mb-4 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">HPCZ Accredited</h3>
              <p className="text-gray-600 text-sm mb-3">
                Health Professions Council of Zambia
              </p>
              <p className="text-xs text-gray-500">
                Diploma in Clinical Medicine approved by HPCZ for clinical practice
              </p>
            </motion.div>
            
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -5, shadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            >
              <img
                src="https://ecz.org.zm/wp-content/uploads/2021/04/ECZ-Logo.png"
                alt="ECZ Logo"
                className="h-16 mx-auto mb-4 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">ECZ Recognized</h3>
              <p className="text-gray-600 text-sm mb-3">
                Examinations Council of Zambia
              </p>
              <p className="text-xs text-gray-500">
                Programs meet ECZ certification standards
              </p>
            </motion.div>
            
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -5, shadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            >
              <img
                src="https://www.unza.zm/images/unza-logo.png"
                alt="UNZA Logo"
                className="h-16 mx-auto mb-4 object-contain"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">UNZA Affiliated</h3>
              <p className="text-gray-600 text-sm mb-3">
                University of Zambia
              </p>
              <p className="text-xs text-gray-500">
                Academic programs affiliated with Zambia's premier university
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Programs Section */}
      <section className="py-20 bg-gray-50 relative">
        <FloatingElements count={15} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Our Accredited Programs
            </h2>
            <p className="text-xl text-gray-700 font-medium">
              Three professionally accredited programs meeting Zambian standards
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-12">
            {programs.map((program, index) => (
              <AnimatedCard
                key={index}
                delay={index * 0.3}
                direction={index % 2 === 0 ? 'left' : 'right'}
                hover3d={true}
                className="overflow-hidden"
              >
                <div className="relative">
                  <motion.img
                    src={program.image}
                    alt={`${program.institution} facility`}
                    className="w-full h-48 object-cover rounded-lg mb-6"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="absolute top-4 right-4 space-y-2">
                    <motion.div
                      className="bg-gradient-to-r from-primary to-secondary text-white px-3 py-1 rounded-full text-xs font-semibold"
                      whileHover={{ scale: 1.1 }}
                    >
                      {program.highlight}
                    </motion.div>
                    <motion.div
                      className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold"
                      whileHover={{ scale: 1.1 }}
                    >
                      {program.accreditation}
                    </motion.div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold gradient-text mb-4">
                  {program.institution}
                </h3>
                <div className="space-y-3">
                  {program.courses.map((course, courseIndex) => (
                    <motion.div
                      key={courseIndex}
                      className="flex items-center space-x-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: courseIndex * 0.1 }}
                    >
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-gray-800 font-medium">{course}</span>
                    </motion.div>
                  ))}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
        <FloatingElements count={25} />
        <GeometricPatterns />
        
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            Ready to Start Your Journey?
          </motion.h2>
          <motion.p
            className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          >
            Join thousands of successful graduates who started their careers with us
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/auth/signup">
              <Button variant="outline" size="xl" className="border-2 border-white text-white hover:bg-white hover:text-primary" magnetic>
                <span className="mr-2">Apply Now</span>
                <ArrowRight className="w-6 h-6" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-16 relative">
        <FloatingElements count={8} className="opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid md:grid-cols-3 gap-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <motion.div
                className="flex items-center space-x-2 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold gradient-text">MIHAS-KATC</span>
              </motion.div>
              <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
              <div className="space-y-2 text-gray-300">
                <p>Mukuba University Campus</p>
                <p>Kitwe, Zambia</p>
                <p>KATC: 0966992299 | MIHAS: 0961515151</p>
                <p>info@katc.edu.zm | info@mihas.edu.zm</p>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-semibold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  { name: 'About Us', href: '#' },
                  { name: 'Programs', href: '#programs' },
                  { name: 'Track Application', href: '/track-application' },
                  { name: 'Contact', href: '#' }
                ].map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={link.href} className="text-gray-300 hover:text-primary transition-colors duration-300 flex items-center group">
                      <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-semibold mb-6">Follow Us</h3>
              <div className="flex space-x-4">
                {['Facebook', 'Twitter', 'LinkedIn'].map((social, index) => (
                  <motion.a
                    key={social}
                    href="#"
                    className="text-gray-300 hover:text-primary transition-colors duration-300 px-4 py-2 rounded-lg hover:bg-primary/10"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {social}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div
            className="border-t border-gray-700 mt-12 pt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-300 mb-2">&copy; 2025 MIHAS-KATC. All rights reserved.</p>
            <p className="text-gray-400">
              Developed with ❤️ by{' '}
              <motion.a
                href="https://beanola.com"
                className="gradient-text font-semibold"
                whileHover={{ scale: 1.05 }}
              >
                Beanola Technologies
              </motion.a>
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}