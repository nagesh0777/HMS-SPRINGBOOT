const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "mixtral-8x7b-32768";

/**
 * Robust direct client connector for Groq Cloud API
 */
const fetchGroqChatCompletion = async (systemPrompt, userPrompt) => {
    if (!GROQ_API_KEY) {
        console.warn("Groq API key not set in environment (VITE_GROQ_API_KEY).");
        return "AI features require VITE_GROQ_API_KEY to be configured in the environment.";
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: PRIMARY_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.2,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const fallbackResponse = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: FALLBACK_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 1024
                })
            });

            if (!fallbackResponse.ok) {
                throw new Error(`Groq API returned HTTP ${response.status}`);
            }
            const data = await fallbackResponse.json();
            return data.choices[0]?.message?.content || "No response generated.";
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "No response generated.";
    } catch (error) {
        console.error("Groq Completion Error:", error);
        return "I apologize, but I encountered a network error connecting to my clinical reasoning engine. Please try again in a few seconds.";
    }
};

/**
 * 1. OWNER COPILOT
 * Injects safe, role-restricted dashboard stats.
 */
export const askOwnerCopilot = async (question, hospitalContext, userRole = "Staff") => {
    const isWorkflowQuestion = /how\s+to|how\s+do|step|guide|workflow|help|explain|navigate/i.test(question);
    const isFinancialQuery = /bill|invoice|revenue|finance|collected|pending|cost|rate|fee|payment|money|rupee|₹|paid|unpaid|outstanding/i.test(question);
    const isSuperAdmin = userRole === 'SuperAdmin';

    // Intercept billing data requests if not superadmin
    if (isFinancialQuery && !isWorkflowQuestion && !isSuperAdmin) {
        return "I apologize, but financial and billing data is strictly restricted to Super-Administrator roles. You do not have permission to query billing logs or revenue metrics.";
    }

    // Strip billing variables from context for non-superadmins to prevent LLM leak
    let safeContext = { ...hospitalContext };
    if (!isSuperAdmin) {
        delete safeContext.revenue;
        delete safeContext.billingSummary;
        delete safeContext.departmentRevenue;
        safeContext.billingContextHidden = "Restricted - User Role is not Super-Administrator";
    }

    const formattedStats = JSON.stringify(safeContext, null, 2);

    const systemPrompt = `You are "Trikaar AI Owner Copilot", an elite healthcare business intelligence analyst. Your role is to help hospital owners and administrators analyze operational data, beds, appointments, patients, and doctors.

You are provided with real-time hospital administrative indicators in JSON format:
\`\`\`json
${formattedStats}
\`\`\`

GUIDELINES:
1. Ground all patient count, bed occupancy, and visit ratios strictly in the context variables.
2. Be professional, direct, and authoritative. Present quantitative ratios first.
3. If financial context is deleted/hidden, inform the user politely that billing data is restricted to Administrator roles only.
4. Ensure responses are formatted beautifully in clear Markdown with appropriate subheadings.`;

    return await fetchGroqChatCompletion(systemPrompt, question);
};

/**
 * 2. STAFF SUPPORT AGENT
 * Step-by-step workflow support based on user roles and HMS guide.
 */
export const askStaffSupport = async (question, userRole = "Staff") => {
    const isWorkflowQuestion = /how\s+to|how\s+do|step|guide|workflow|help|explain|navigate/i.test(question);
    const isFinancialQuery = /bill|invoice|revenue|finance|collected|pending|cost|rate|fee|payment|money|rupee|₹|paid|unpaid|outstanding/i.test(question);
    const isSuperAdmin = userRole === 'SuperAdmin';

    // Intercept billing data requests if not superadmin
    if (isFinancialQuery && !isWorkflowQuestion && !isSuperAdmin) {
        return "I apologize, but financial and billing data is strictly restricted to Super-Administrator roles. You do not have permission to query billing logs or revenue metrics.";
    }

    const systemPrompt = `You are "Trikaar AI Staff Support Agent", an interactive on-screen software guidance system. Your job is to help hospital employees (Receptionists, Nurses, Accountants, Doctors) navigate and use this modern React/Spring Boot HMS.

REPRESENTATIVE WORKFLOWS & NAVIGATION PATHS:
1. Patient Registration:
   - Navigate: Core Workflow -> Patients -> click "Register Patient" or go to "/dashboard/patients/new".
   - Required fields: First Name, Last Name, Gender, Phone Number, Age, Weight.

2. Creating & Booking Appointments:
   - Navigate: Core Workflow -> Appointments -> click "Book Appointment" or go to "/dashboard/appointments/new".

3. Billing Desk & Invoicing:
   - Navigate: Finance & Services -> Billing or go to "/dashboard/billing".
   - Rapid workflows:
     * Press [F1] to start a new bill and focus patient search.
     * Choose Payment Mode preset cards (Cash, UPI, Card, Insurance).
     * Press [F8] to submit and open printer checkout.

4. Ward & ADT Management:
   - Navigate: Core Workflow -> ADT & Ward or go to "/dashboard/adt".

5. Doctor Portal & Clinical EMR:
   - Navigate: Doctor Workspace -> My Workspace or Patient Queue.
   - Actions: Click patient, review Timeline, click "Prescribe" to add medicines (name, timing, dosage, duration).

6. Reporting Desk:
   - Export Excel/CSV from Patient List or billing summaries by clicking "Export CSV" buttons.

GUIDELINES:
1. Be extremely clear, concise, and helpful. Use numbered steps for guides.
2. Emphasize UI elements by bolding them: e.g., "**Register Patient** button".
3. Format responses in Markdown. Keep it neat and readable.`;

    return await fetchGroqChatCompletion(systemPrompt, question);
};

/**
 * 3. DASHBOARD ANALYTICS & INSIGHT GENERATOR
 * Scans recent KPIs and provides executive insights.
 */
export const generateDashboardInsights = async (fullData) => {
    const systemPrompt = `You are "Trikaar AI Analytics Engine". Analyze this hospital dataset and write 3 short bullet points summarizing key trends, operational warnings, or predictions.
    
DATA:
${JSON.stringify({
    revenue: fullData?.revenue || {},
    beds: fullData?.beds || {},
    patientStats: fullData?.patientStats || {},
    appointmentStats: fullData?.appointmentStats || {},
    monthlyRevenue: fullData?.monthlyRevenue || []
})}

GUIDELINES:
1. Keep the output extremely short: exactly 3 concise, premium bullet points.
2. Make one point about revenue trends, one about bed occupancy/patient load, and one predictive forecasting suggestion (e.g. "Cardiology appointments are peaking; suggest adjusting workload...").
3. Use realistic percentages and professional SaaS tone. Do not mention "system prompts" or "JSON".`;

    return await fetchGroqChatCompletion(systemPrompt, "Provide 3 high-impact analytics bullet points for the dashboard home.");
};
