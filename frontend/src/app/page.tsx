'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Globe, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { RemittanceForm } from '@/components/remittance/RemittanceForm'
import { FeatureGrid } from '@/components/home/FeatureGrid'
import { StatsSection } from '@/components/home/StatsSection'
import { TestimonialSection } from '@/components/home/TestimonialSection'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">AfriStar Pay V2</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/corridors" className="text-gray-600 hover:text-primary-600 transition-colors">
                Corridors
              </Link>
              <Link href="/transactions" className="text-gray-600 hover:text-primary-600 transition-colors">
                Transactions
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-primary-600 transition-colors">
                Docs
              </Link>
              <Link href="/send" className="btn-primary">
                Send Money
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                <span>Zero-Knowledge Privacy Enabled</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Cross-Border Payments
                <span className="gradient-text block">Reimagined</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                Send money across Africa with instant settlement, zero-knowledge privacy, 
                and the lowest fees possible. Powered by Stellar Soroban smart contracts.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/send" className="btn-primary text-lg px-8 py-3 group">
                  Send Money Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/docs" className="btn-secondary text-lg px-8 py-3">
                  Learn More
                </Link>
              </div>
              
              <div className="mt-12 grid grid-cols-3 gap-8 text-center lg:text-left">
                <div>
                  <div className="text-3xl font-bold text-gray-900">$2.1B+</div>
                  <div className="text-sm text-gray-600">Volume Processed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">45+</div>
                  <div className="text-sm text-gray-600">Countries</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">0.1%</div>
                  <div className="text-sm text-gray-600">Average Fees</div>
                </div>
              </div>
            </motion.div>

            {/* Remittance Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:max-w-md ml-auto"
            >
              <RemittanceForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Why Choose AfriStar Pay V2?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built on Stellar's next-generation Soroban platform with cutting-edge 
              zero-knowledge privacy and intelligent pathfinding.
            </p>
          </motion.div>

          <FeatureGrid />
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Testimonials */}
      <TestimonialSection />

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Remittance Experience?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join thousands of users who trust AfriStar Pay for fast, secure, 
              and affordable cross-border payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/send" className="bg-white text-primary-600 hover:bg-gray-100 btn text-lg px-8 py-3">
                Start Sending Money
              </Link>
              <Link href="/developers" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 btn text-lg px-8 py-3">
                Developers API
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold">AfriStar Pay V2</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                The next generation of cross-border payments for Africa, 
                built on Stellar Soroban with zero-knowledge privacy.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2 text-gray-400">
                <Link href="/send" className="block hover:text-white transition-colors">Send Money</Link>
                <Link href="/corridors" className="block hover:text-white transition-colors">Corridors</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link href="/security" className="block hover:text-white transition-colors">Security</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Developers</h3>
              <div className="space-y-2 text-gray-400">
                <Link href="/docs" className="block hover:text-white transition-colors">Documentation</Link>
                <Link href="/api" className="block hover:text-white transition-colors">API Reference</Link>
                <Link href="/github" className="block hover:text-white transition-colors">GitHub</Link>
                <Link href="/sdk" className="block hover:text-white transition-colors">SDKs</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <div className="space-y-2 text-gray-400">
                <Link href="/about" className="block hover:text-white transition-colors">About</Link>
                <Link href="/blog" className="block hover:text-white transition-colors">Blog</Link>
                <Link href="/careers" className="block hover:text-white transition-colors">Careers</Link>
                <Link href="/contact" className="block hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2026 AfriStar Pay. All rights reserved. Built with ❤️ for Africa.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}