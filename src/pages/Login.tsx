import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, Eye, EyeOff, Loader2, Phone, Mail, Sparkles, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import type { ConfirmationResult } from "firebase/auth";

type Tab = "email" | "phone";

export default function Login() {
  const { loginWithEmail, loginWithGoogle, sendPhoneOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success("Welcome back to the Studio!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      toast.error("Enter a valid phone number with country code (e.g. +91...)");
      return;
    }
    setLoading(true);
    try {
      const confirmation = await sendPhoneOTP(phone.trim());
      confirmationRef.current = confirmation;
      setOtpSent(true);
      toast.success("OTP sent to " + phone);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setLoading(true);
    try {
      await verifyOTP(confirmationRef.current, otp);
      toast.success("Phone verified! Welcome!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen w-full flex bg-[#030712] relative overflow-hidden text-white">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob animation-delay-4000 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none"></div>

      {/* reCAPTCHA container for phone auth */}
      <div id="recaptcha-container" />

      {/* Left Panel - Branding & Visuals (Hidden on mobile) */}
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12 relative z-10 border-r border-white/5">
        <div>
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="p-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-xl shadow-lg shadow-primary/20">
              <Code2 className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-3xl font-extrabold premium-gradient-text tracking-tight">
              Java Compiler Studio
            </span>
          </Link>
        </div>

        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Next-Generation Learning Platform</span>
          </div>
          <h1 className="text-5xl xl:text-7xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-2xl">
            Master Java.<br />
            <span className="text-muted-foreground/80 font-medium">Empowered by AI.</span>
          </h1>
          <p className="text-lg xl:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Write, compile, and debug Java code instantly in your browser. Our advanced AI acts as your personal tutor, explaining complex concepts and tracking your progress.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={`https://i.pravatar.cc/100?img=${i + 10}`}
                alt="User"
                className="w-12 h-12 rounded-full border-2 border-background shadow-xl"
              />
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-background bg-white/5 backdrop-blur-md flex items-center justify-center text-sm font-medium z-10 shadow-xl">
              +2k
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Join thousands of developers mastering Java today.</p>
        </div>
      </div>

      {/* Right Panel - Form (Full width on mobile) */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        
        {/* Mobile Logo */}
        <div className="lg:hidden flex flex-col items-center mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-3 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-lg shadow-primary/20 mb-4">
            <Code2 className="h-10 w-10 text-primary" />
          </div>
          <span className="text-2xl font-extrabold premium-gradient-text tracking-tight">
            Java Compiler Studio
          </span>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="glass-panel rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
            
            {/* Form Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-[50px]"></div>
            
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to continue your journey.</p>
            </div>

            {/* Premium Tab Switcher */}
            <div className="flex p-1 bg-black/40 rounded-xl mb-8 border border-white/5">
              <button
                onClick={() => setTab("email")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  tab === "email"
                    ? "bg-white/10 text-white shadow-lg shadow-black/20"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                onClick={() => setTab("phone")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  tab === "phone"
                    ? "bg-white/10 text-white shadow-lg shadow-black/20"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Phone className="h-4 w-4" /> Phone
              </button>
            </div>

            <div className="space-y-6">
              {tab === "email" ? (
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div className="space-y-2 group">
                    <label htmlFor="email" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="glass-input w-full pl-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Password</label>
                      <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="glass-input w-full pl-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary via-purple-500 to-secondary hover:opacity-90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] rounded-xl py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Sign In to Studio"}
                    {!loading && <ChevronRight className="h-5 w-5 ml-2" />}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500">
                  {!otpSent ? (
                    <div className="space-y-5">
                      <div className="space-y-2 group">
                        <label htmlFor="phone" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Mobile Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                          <input
                            id="phone"
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="glass-input w-full pl-12"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground/70 pl-2">Format: +[Country Code] [Number]</p>
                      </div>
                      <Button
                        onClick={handleSendOTP}
                        className="w-full bg-gradient-to-r from-primary via-purple-500 to-secondary hover:opacity-90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] rounded-xl py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Send Verification Code"}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-2">
                        <p className="text-sm text-muted-foreground text-center">
                          Code sent to <span className="text-white font-bold tracking-wider">{phone}</span>
                        </p>
                      </div>
                      <div className="space-y-2 group">
                        <label htmlFor="otp" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Verification Code</label>
                        <input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          placeholder="• • • • • •"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          required
                          className="glass-input w-full text-center tracking-[0.5em] text-2xl placeholder:tracking-[0.5em] placeholder:text-muted-foreground/30 font-bold"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-success to-emerald-500 hover:opacity-90 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] rounded-xl py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Verify & Continue"}
                      </Button>
                      <button
                        type="button"
                        className="w-full text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                        onClick={() => { setOtpSent(false); setOtp(""); }}
                        disabled={loading}
                      >
                        Change phone number
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-medium">
                  <span className="bg-[#121826] px-4 rounded-full text-muted-foreground/60 border border-white/5">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                type="button"
                className="w-full relative group flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                <svg className="h-5 w-5 relative z-10" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="relative z-10">Google</span>
              </button>

              <p className="text-center text-sm font-medium text-muted-foreground mt-8">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white hover:after:w-full after:transition-all after:duration-300">
                  Create one now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
