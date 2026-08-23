import React, { useState } from "react";
import axios from "axios";
import { User, Lock, HeartPulse, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-[440px] space-y-8">
                {/* Brand Logo & Header */}
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm ring-1 ring-primary-700/10">
                        <HeartPulse size={26} className="stroke-[2.5]" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 font-display">
                        Login to Trikaar HMS
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Enter your credentials to access your clinician workspace
                    </p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Username Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="username" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Username / Staff ID
                            </label>
                            <div className="relative rounded-lg shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="yourusername"
                                    className="block w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-medium transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Password
                                </label>
                            </div>
                            <div className="relative rounded-lg shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border border-gray-300 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-medium transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 border border-red-100 text-xs font-medium text-red-700"
                            >
                                <ShieldCheck className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 active:scale-[0.99] transition-transform"
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
