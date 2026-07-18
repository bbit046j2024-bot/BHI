"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Shadow navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-white/80 backdrop-blur-sm border-b border-slate-100"
      }`}
    >
      <div className="container-page flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-800 flex items-center justify-center text-white font-heading font-bold text-sm shadow-sm group-hover:bg-primary-700 transition-colors">
            BHI
          </div>
          <span className="font-heading font-bold text-primary-900 text-lg leading-none">
            BHI <span className="text-accent-600">Revision</span>
          </span>
        </Link>

        {/* Nav links (signed in) */}
        {isSignedIn && (
          <div className="hidden md:flex items-center gap-1">
            <Link href="/revision" className="btn-ghost text-sm">
              Dashboard
            </Link>
            <Link href="/revision/practice" className="btn-ghost text-sm">
              Practice Quiz
            </Link>
          </div>
        )}

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          {!isLoaded ? (
            <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
          ) : isSignedIn ? (
            <>
              <Link
                href="/revision"
                className="hidden sm:inline-flex btn-ghost text-sm"
              >
                My Dashboard
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="btn-ghost text-sm">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn-primary text-sm px-4 py-2">
                  Get Started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
