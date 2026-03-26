import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, Eye, EyeOff, Loader2, User, Mail, Lock, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signupWithEmail(email, password, name);
      toast.success("Account created! Welcome to Java Compiler Studio!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome to Java Compiler Studio!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen w-full flex bg-zinc-950 relative overflow-hidden text-white">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[120px] opacity-70 animate-blob animation-delay-4000 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none"></div>

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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Start Your Journey Today</span>
          </div>
          <h1 className="text-5xl xl:text-7xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-2xl">
            Unleash Your<br />
            <span className="text-muted-foreground/80 font-medium">Coding Potential.</span>
          </h1>
          <p className="text-lg xl:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Create an account to save your progress, access premium AI tutoring features, and track your logic improvements automatically.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={`https://i.pravatar.cc/100?img=${i + 20}`}
                alt="User"
                className="w-12 h-12 rounded-full border-2 border-background shadow-xl"
              />
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-background bg-white/5 backdrop-blur-md flex items-center justify-center text-sm font-medium z-10 shadow-xl">
              +2k
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Join an elite community of aspiring developers.</p>
        </div>
      </div>

      {/* Right Panel - Form (Full width on mobile) */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 overflow-y-auto">
        
        {/* Mobile Logo */}
        <div className="lg:hidden flex flex-col items-center mb-10 w-full mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-3 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-lg shadow-primary/20 mb-4">
            <Code2 className="h-10 w-10 text-primary" />
          </div>
          <span className="text-2xl font-extrabold premium-gradient-text tracking-tight">
            Java Compiler Studio
          </span>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000 my-auto">
          <div className="glass-panel rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
            
            {/* Form Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full filter blur-[50px]"></div>
            
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-muted-foreground">Set up your workspace in seconds.</p>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2 group">
                  <label htmlFor="name" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      className="glass-input w-full pl-12"
                    />
                  </div>
                </div>

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
                  <label htmlFor="password" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
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

                <div className="space-y-2 group">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-muted-foreground group-focus-within:text-white transition-colors duration-200">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="glass-input w-full pl-12"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary via-purple-500 to-secondary hover:opacity-90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] rounded-xl py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Create Account"}
                  {!loading && <ChevronRight className="h-5 w-5 ml-2" />}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-medium">
                  <span className="bg-[#121826] px-4 rounded-full text-muted-foreground/60 border border-white/5">
                    Or sign up with
                  </span>
                </div>
              </div>

              {/* Google Sign Up */}
              <button
                onClick={handleGoogleSignup}
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
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white hover:after:w-full after:transition-all after:duration-300">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
