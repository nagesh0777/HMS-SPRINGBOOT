import React, { useState } from "react";
import axios from "axios";
import { User, Lock, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); // Clear previous errors
        try {
            console.log("Attempting login with:", username);
            const response = await axios.post("/api/Account/GetLoginJwtToken", {
                userName: username,
                password: password,
            });

            console.log("Login response:", response.data);

            if (response.data.Results) {
                console.log("Token received, saving and redirecting...");
                const token = response.data.Results;
                localStorage.setItem("token", token);
                localStorage.setItem("userName", username);

                // Decode role
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));

                    const payload = JSON.parse(jsonPayload);
                    localStorage.setItem("role", payload.role || "Staff");
                    if (payload.doctorId) localStorage.setItem("doctorId", payload.doctorId);
                    if (payload.employeeId) localStorage.setItem("employeeId", payload.employeeId);
                } catch (e) {
                    console.error("Failed to decode token for role", e);
                    localStorage.setItem("role", "Staff");
                }

                // Force navigation
                window.location.href = "/dashboard";
            } else {
                console.warn("No Results in response", response.data);
                setError(response.data.ErrorMessage || "Login failed. No token received.");
            }
        } catch (err) {
            console.error("Login Error:", err);
            const msg = err.response?.data?.ErrorMessage || "Invalid credentials or server error.";
            setError(msg);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 from-blue-100 to-white bg-gradient-to-br p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
                <div className="bg-primary-600 p-8 text-center text-white">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <HeartPulse size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Trikaar EMR</h1>
                    <p className="mt-2 text-blue-100">Next-Gen Hospital Management</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {error && <p className="text-center text-sm text-red-500">{error}</p>}

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                            Sign In to Dashboard
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-gray-400">
                        Powered by Trikaar Health Systems V3.0
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
