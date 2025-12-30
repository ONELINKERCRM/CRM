import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Mail, Lock, Building2, Eye, EyeOff, ArrowRight, ArrowLeft, Check
} from "lucide-react";
import { CountrySelect, getCurrencyByCountry, getTimezoneByCountry } from "@/components/ui/country-select";
import { cn } from "@/lib/utils";
import authBackground from "@/assets/auth-background.jpg";

type AuthMode = "signin" | "signup" | "forgot";

// Particle configuration with base positions
const particles = [
  { id: 1, baseTop: 20, baseLeft: 80, size: 8, duration: 8 },
  { id: 2, baseTop: 35, baseLeft: 25, size: 6, duration: 10 },
  { id: 3, baseTop: 70, baseLeft: 70, size: 10, duration: 12 },
  { id: 4, baseTop: 85, baseLeft: 30, size: 5, duration: 9 },
  { id: 5, baseTop: 45, baseLeft: 90, size: 7, duration: 11 },
  { id: 6, baseTop: 10, baseLeft: 50, size: 4, duration: 7 },
  { id: 7, baseTop: 55, baseLeft: 5, size: 6, duration: 13 },
  { id: 8, baseTop: 75, baseLeft: 85, size: 8, duration: 10 },
];

// Mouse-reactive particle component
interface MouseReactiveParticleProps {
  baseTop: number;
  baseLeft: number;
  size: number;
  mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>;
  sensitivity: number;
  className?: string;
  animateProps?: Record<string, number[]>;
  duration: number;
  delay?: number;
}

function MouseReactiveParticle({
  baseTop,
  baseLeft,
  size,
  mouseX,
  mouseY,
  sensitivity,
  className,
  animateProps = {},
  duration,
  delay = 0,
}: MouseReactiveParticleProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 100, damping: 30 });
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const unsubX = mouseX.on('change', (mx) => {
      const distance = baseLeft - mx;
      const push = distance * sensitivity * 0.5;
      x.set(push);
    });
    const unsubY = mouseY.on('change', (my) => {
      const distance = baseTop - my;
      const push = distance * sensitivity * 0.5;
      y.set(push);
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [mouseX, mouseY, baseLeft, baseTop, sensitivity, x, y]);

  return (
    <motion.div
      className={cn("absolute", className)}
      style={{
        top: `${baseTop}%`,
        left: `${baseLeft}%`,
        width: size,
        height: size,
        x: springX,
        y: springY,
      }}
      animate={{
        ...animateProps,
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithGoogle, refreshProfile, user } = useAuth();
  const { setForceLightMode } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  const initialMode = (searchParams.get("mode") as AuthMode) || "signin";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mouse position tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");

  // Force light mode
  useEffect(() => {
    setForceLightMode(true);
    return () => setForceLightMode(false);
  }, [setForceLightMode]);

  // Mouse move handler for particle effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        mouseX.set(x);
        mouseY.set(y);
      }
    };

    const panel = panelRef.current;
    if (panel) {
      panel.addEventListener('mousemove', handleMouseMove);
      return () => panel.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseX, mouseY]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setCompanyName("");
    setCountry("");
    setShowPassword(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await signIn(email, password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!country) {
      toast.error("Please select your country");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsLoading(true);
      const currency = getCurrencyByCountry(country);
      const timezone = getTimezoneByCountry(country);
      const redirectUrl = `${window.location.origin}/`;

      // Generate slug from company name
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { first_name: companyName, last_name: "" },
        },
      });

      if (authError) {
        if (authError.message.includes("security purposes")) {
          toast.error("Too many signup attempts. Please wait 60 seconds or sign in if you already have an account.");
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (authData.user) {
        // If the user already exists (and was just returned by signUp), we might need to handle that.
        // But we proceed with setup      if (authData.user) {
        try {
          // Use RPC to setup account atomically and bypass RLS issues
          const { error: setupError } = await supabase.rpc('setup_new_account', {
            p_company_name: companyName,
            p_slug: slug,
            p_country: country,
            p_currency: currency,
            p_timezone: timezone
          });

          if (setupError) throw setupError;

          await refreshProfile?.();
          toast.success("Account created successfully!");
          navigate("/");
        } catch (error: any) {
          console.error("Setup error:", error);
          toast.error(`Setup Error: ${error.message || "Failed to complete setup"}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
      setMode("signin");
    }
    setIsLoading(false);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding with Image Background (Desktop only) */}
      <div ref={panelRef} className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src={authBackground}
          alt="Real Estate Skyline"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark Overlay with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-violet-900/95" />

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Mouse-following glow */}
        <motion.div
          className="absolute w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"
          style={{
            left: smoothMouseX,
            top: smoothMouseY,
            x: '-50%',
            y: '-50%',
          }}
        />

        {/* Static Glow Effects */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        {/* Floating Particles with Mouse Interaction */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large slow-moving circles that react to mouse */}
          <MouseReactiveParticle
            baseTop={15}
            baseLeft={10}
            size={96}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.15}
            className="rounded-full border border-white/10 bg-white/5"
            animateProps={{
              rotate: [0, 180, 360]
            }}
            duration={20}
          />
          <MouseReactiveParticle
            baseTop={60}
            baseLeft={85}
            size={128}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.1}
            className="rounded-full border border-white/10 bg-white/5"
            duration={25}
          />

          {/* Small floating dots with mouse interaction */}
          {particles.map((particle) => (
            <MouseReactiveParticle
              key={particle.id}
              baseTop={particle.baseTop}
              baseLeft={particle.baseLeft}
              size={particle.size}
              mouseX={smoothMouseX}
              mouseY={smoothMouseY}
              sensitivity={0.3}
              className="rounded-full bg-white/30"
              duration={particle.duration}
              delay={particle.id * 0.5}
            />
          ))}

          {/* Geometric shapes with mouse interaction */}
          <MouseReactiveParticle
            baseTop={25}
            baseLeft={75}
            size={64}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.2}
            className="border border-white/10 bg-white/5 rotate-45"
            animateProps={{
              rotate: [45, 405],
              scale: [1, 1.1, 1],
            }}
            duration={30}
          />
          <MouseReactiveParticle
            baseTop={80}
            baseLeft={20}
            size={48}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.25}
            className="border border-white/10 bg-white/5 rotate-45"
            animateProps={{
              rotate: [405, 45],
            }}
            duration={18}
          />

          {/* Glowing orbs with mouse interaction */}
          <MouseReactiveParticle
            baseTop={40}
            baseLeft={60}
            size={12}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.4}
            className="rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
            animateProps={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            duration={4}
          />
          <MouseReactiveParticle
            baseTop={65}
            baseLeft={45}
            size={8}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.45}
            className="rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            animateProps={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            duration={5}
            delay={1}
          />
          <MouseReactiveParticle
            baseTop={15}
            baseLeft={75}
            size={8}
            mouseX={smoothMouseX}
            mouseY={smoothMouseY}
            sensitivity={0.35}
            className="rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            animateProps={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.45, 0.2],
            }}
            duration={6}
            delay={2}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 w-full">
          {/* Back to Home */}
          <Link
            to="/landing"
            className="absolute top-8 left-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-2xl">O</span>
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">
              OneLinker
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight"
          >
            Real Estate CRM
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-3xl xl:text-4xl font-bold text-white/80 mb-6"
          >
            Built for Growth
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-white/70 mb-10 max-w-md leading-relaxed"
          >
            Manage leads, listings, and teams all in one place.
            <br />
            Trusted by 500+ real estate companies.
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            {[
              "Lead management & automation",
              "Property listings & portals",
              "Team collaboration tools",
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-3 text-white"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-base font-medium">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gray-50/50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {/* Mobile Back Link */}
          <Link
            to="/landing"
            className="lg:hidden inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="font-bold text-xl">OneLinker</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  {mode === "signin" && "Welcome Back"}
                  {mode === "signup" && "Create Account"}
                  {mode === "forgot" && "Reset Password"}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {mode === "signin" && "Sign in to continue to your dashboard"}
                  {mode === "signup" && "Get started with your free account"}
                  {mode === "forgot" && "Enter your email to reset your password"}
                </p>
              </div>

              {/* Sign Up Benefits */}
              {mode === "signup" && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
                  {["Free forever", "1 user included", "No credit card"].map((text) => (
                    <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Button (Sign In/Up only) */}
              {mode !== "forgot" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3 mb-6"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">or</span>
                    </div>
                  </div>
                </>
              )}

              {/* Forms */}
              {mode === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-12"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                    ) : (
                      <>Sign In<ArrowRight className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="company"
                        placeholder="Your Company Name"
                        className="pl-10 h-12"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-12"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <CountrySelect
                      value={country}
                      onValueChange={setCountry}
                      placeholder="Select country"
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                    ) : (
                      <>Create Account<ArrowRight className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              )}

              {mode === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-12"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      <>Send Reset Link<ArrowRight className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => switchMode("signin")}
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back to Sign In
                  </Button>
                </form>
              )}

              {/* Toggle */}
              {mode !== "forgot" && (
                <p className="text-center text-sm text-muted-foreground mt-6">
                  {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                    className="text-indigo-600 font-medium hover:underline hover:text-indigo-700 transition-colors"
                  >
                    {mode === "signin" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              )}

              {/* Terms */}
              <p className="text-center text-xs text-muted-foreground mt-6">
                By continuing, you agree to our{" "}
                <Link to="/landing/terms" className="text-indigo-600 hover:underline hover:text-indigo-700 transition-colors">Terms</Link>
                {" "}and{" "}
                <Link to="/landing/privacy" className="text-indigo-600 hover:underline hover:text-indigo-700 transition-colors">Privacy Policy</Link>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
