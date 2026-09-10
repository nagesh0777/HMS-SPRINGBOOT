import React, { useState } from "react";
import axios from "axios";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await axios.post("/api/Account/GetLoginJwtToken", {
                userName: username,
                password: password,
            });

            if (response.data.Results) {
                const token = response.data.Results;
                localStorage.setItem("token", token);
                localStorage.setItem("userName", username);

                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));

                    const payload = JSON.parse(jsonPayload);
                    const loginName = (username || payload.sub || "").trim();
                    const ownerLogin = loginName.toLowerCase() === "nagesh" || loginName.toLowerCase() === "trikaar_admin";
                    localStorage.setItem("role", ownerLogin ? "SuperAdmin" : (payload.role || "Staff"));
                    if (payload.doctorId) localStorage.setItem("doctorId", payload.doctorId);
                    if (payload.employeeId) localStorage.setItem("employeeId", payload.employeeId);
                    if (payload.hospitalId) localStorage.setItem("hospitalId", payload.hospitalId);
                    if (ownerLogin) {
                        localStorage.setItem("assignedModules", [
                            "Dashboard",
                            "Patients",
                            "Appointments",
                            "Doctor Queue",
                            "Prescriptions",
                            "Billing",
                            "Service Catalog",
                            "Staff",
                            "ADT",
                            "Beds",
                            "AI Copilot",
                            "AICopilot",
                            "Reports",
                            "Notifications",
                            "Settings",
                            "Hospitals"
                        ].join(","));
                    } else if (payload.assignedModules) {
                        localStorage.setItem("assignedModules", payload.assignedModules);
                    }
                } catch (e) {
                    console.error("Failed to decode token", e);
                    localStorage.setItem("role", username.trim().toLowerCase() === "nagesh" ? "SuperAdmin" : "Staff");
                }

                try {
                    const subRes = await axios.get('/api/Subscriptions/MySubscription');
                    if (subRes.data.Results) {
                        const sub = subRes.data.Results;
                        localStorage.setItem("subscriptionPlan", sub.subscriptionPlan || "");
                        localStorage.setItem("subscriptionStatus", sub.subscriptionStatus || "");
                        localStorage.setItem("subscriptionModules", Array.isArray(sub.modules) ? sub.modules.join(',') : "");
                    }
                } catch (e) {
                    console.error("Failed to load subscription", e);
                }

                const role = localStorage.getItem("role") || "Staff";
                let redirectTo = "/dashboard";
                if (role === "Doctor") redirectTo = "/dashboard/doctor";
                else if (role === "SuperAdmin") redirectTo = "/dashboard/hospitals";
                window.location.href = redirectTo;
            } else {
                setError(response.data.ErrorMessage || "Invalid username or password.");
            }
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || "Could not establish secure connection to portal.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[400px]">
                <div className="mb-8 flex flex-col items-center text-center">
                    <Logo variant="full" className="h-8" />
                    <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in to HMS</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Enter your credentials to access your workspace
                    </p>
                </div>

                <Card className="p-6 sm:p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username / Staff ID</Label>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    autoFocus
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="yourusername"
                                    className="h-11 pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-11 pl-9 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    // Announced state matters here: a screen-reader user otherwise
                                    // has no way to tell whether their password is currently visible.
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    aria-pressed={showPassword}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                // Assertive: a failed sign-in is the one thing the user is waiting on.
                                role="alert"
                                aria-live="assertive"
                                className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive"
                            >
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <Button type="submit" disabled={isLoading} size="lg" className="w-full">
                            {isLoading ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Signing in…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>
                </Card>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    New hospital or clinic?{' '}
                    <Link to="/subscribe" className="font-medium text-foreground underline-offset-4 hover:underline">
                        Subscribe to Trikaar HMS
                    </Link>
                </p>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    Trikaar HMS · Hospital Management System
                </p>
            </div>
        </div>
    );
};

export default Login;
