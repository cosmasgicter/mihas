import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { GraduationCap, Users, Award, BookOpen } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-primary text-white">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8" />
              <span className="text-xl font-bold">MIHAS-KATC</span>
            </div>
            <div className="flex space-x-4">
              <Link to="/auth/signin">
                <Button variant="outline" className="bg-white text-primary hover:bg-gray-100">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth/signup">
                <Button className="bg-primary hover:bg-primary">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Future Starts Here
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Join Mukuba Institute of Health and Applied Sciences and Kalulushi Training Centre – Leading institutions in health sciences education in Zambia
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/signup">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 w-full sm:w-auto">
                  Start Your Application
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">
              Why Choose MIHAS-KATC?
            </h2>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              We offer world-class education with practical training to prepare you for a successful career
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Faculty</h3>
              <p className="text-secondary">
                Learn from experienced professionals and industry experts who bring real-world knowledge to the classroom
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Accredited Programs</h3>
              <p className="text-secondary">
                All our programs are fully accredited and recognized by industry bodies and government agencies
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Practical Training</h3>
              <p className="text-secondary">
                Hands-on experience through internships, clinical rotations, and industry partnerships
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">
              Our Programs
            </h2>
            <p className="text-lg text-secondary">
              Choose from a wide range of programs designed to meet industry demands
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-2xl font-bold text-primary mb-4">
                Kalulushi Training Centre
              </h3>
              <ul className="space-y-2 text-secondary">
                <li>• Diploma in Clinical Medicine</li>
                <li>• Diploma in Environmental Health</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-2xl font-bold text-primary mb-4">
                Mukuba Institute of Health and Applied Sciences
              </h3>
              <ul className="space-y-2 text-secondary">
                <li>• Diploma in Registered Nursing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of successful graduates who started their careers with us
          </p>
          <Link to="/auth/signup">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
              Apply Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <p className="text-secondary">Mukuba University Campus</p>
              <p className="text-secondary">Kitwe, Zambia</p>
              <p className="text-secondary">+260-123-456-789</p>
              <p className="text-secondary">admissions@mihas-katc.ac.zm</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-secondary">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Programs</a></li>
                <li><a href="#" className="hover:text-white">Admissions</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-secondary hover:text-white">Facebook</a>
                <a href="#" className="text-secondary hover:text-white">Twitter</a>
                <a href="#" className="text-secondary hover:text-white">LinkedIn</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-secondary">
            <p>&copy; 2025 MIHAS-KATC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}