'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Simple animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-black/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-black/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
        {/* 3D Animated Text */}
        <div className="perspective-1000 mb-8">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight animate-3d-float">
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              ShopSwift
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-8 animate-fade-in-up">
              Your one-stop shop for unbeatable deals.
        </p>
        
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-12 animate-fade-in-up-delayed">
          Premium gear. Fast delivery across South Africa.
        </p>

        {/* CTA Button */}
        <Link
          href="/products"
          className="inline-block px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 animate-fade-in-up-delayed-2"
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
}