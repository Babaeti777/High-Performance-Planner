// ==================== AI Service ====================
// Supports Claude (Anthropic) and Gemini (Google) APIs
// Used for: PDF extraction, bid prediction, task priorities, smart scheduling

const AIService = {
    // Configuration
    config: {
        provider: localStorage.getItem('aiProvider') || 'claude', // 'claude' or 'gemini'
        apiKey: localStorage.getItem('aiApiKey') || '',
        model: localStorage.getItem('aiModel') || 'claude-3-haiku-20240307'
    },

    // Model options
    models: {
        claude: [
            { id: 'claude-3-haiku-20240307', name: 'Claude Haiku (Fast & Cheap)', costPer1k: 0.00025 },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude Sonnet (Best Quality)', costPer1k: 0.003 }
        ],
        gemini: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Cheapest)', costPer1k: 0.000075 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Better)', costPer1k: 0.00125 }
        ]
    },

    // Save configuration
    saveConfig() {
        localStorage.setItem('aiProvider', this.config.provider);
        localStorage.setItem('aiApiKey', this.config.apiKey);
        localStorage.setItem('aiModel', this.config.model);
    },

    // Check if AI is configured
    isConfigured() {
        return this.config.apiKey && this.config.apiKey.length > 10;
    },

    // ==================== Core API Call ====================
    async callAI(prompt, systemPrompt = '') {
        if (!this.isConfigured()) {
            throw new Error('AI not configured. Please add your API key in Settings.');
        }

        if (this.config.provider === 'claude') {
            return this.callClaude(prompt, systemPrompt);
        } else {
            return this.callGemini(prompt, systemPrompt);
        }
    },

    // Claude API call
    async callClaude(prompt, systemPrompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: this.config.model,
                max_tokens: 4096,
                system: systemPrompt || 'You are a helpful assistant specialized in construction bid analysis.',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API error');
        }

        const data = await response.json();
        return data.content[0].text;
    },

    // Gemini API call
    async callGemini(prompt, systemPrompt) {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { maxOutputTokens: 4096 }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API error');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    // ==================== PDF Bid Extraction ====================
    async extractBidFromPDF(pdfText) {
        const systemPrompt = `You are an expert at extracting structured information from construction bid documents (ITB, RFP, RFQ).
Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
    "projectName": "string or null",
    "bidNumber": "string or null",
    "client": "string or null",
    "estimatedValue": "number or null",
    "bidDueDate": "ISO date string or null",
    "bidDueTime": "HH:MM format or null",
    "preBidMeeting": "ISO date string or null",
    "preBidMeetingTime": "HH:MM format or null",
    "preBidMeetingLocation": "string or null",
    "rfiDueDate": "ISO date string or null",
    "siteVisitDate": "ISO date string or null",
    "siteVisitLocation": "string or null",
    "bondRequired": "boolean",
    "bondPercentage": "number or null",
    "projectLocation": "string or null",
    "projectDescription": "string (brief summary)",
    "keyRequirements": ["array of key requirements"],
    "confidence": "high/medium/low"
}`;

        const prompt = `Extract bid information from this document:\n\n${pdfText.substring(0, 15000)}`;

        try {
            const response = await this.callAI(prompt, systemPrompt);
            // Clean response - remove markdown code blocks if present
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('AI extraction error:', error);
            throw new Error('Failed to extract bid information: ' + error.message);
        }
    },

    // ==================== Bid Success Prediction ====================
    async predictBidSuccess(bid, historicalBids = []) {
        const systemPrompt = `You are an expert construction bid analyst. Analyze the bid and provide a success prediction.
Return ONLY valid JSON:
{
    "successProbability": 0-100,
    "confidence": "high/medium/low",
    "factors": {
        "positive": ["array of positive factors"],
        "negative": ["array of concerns"],
        "neutral": ["array of neutral observations"]
    },
    "recommendations": ["array of actionable recommendations"],
    "competitiveAnalysis": "brief analysis of competitive position",
    "riskLevel": "low/medium/high"
}`;

        const bidContext = `
Current Bid:
- Project: ${bid.projectName}
- Client: ${bid.client}
- Estimated Value: $${bid.estimatedValue?.toLocaleString() || 'Unknown'}
- Due Date: ${bid.bidDueDate}
- Status: ${bid.status}
- Notes: ${bid.notes || 'None'}

Historical Performance (last ${historicalBids.length} bids):
${historicalBids.map(b => `- ${b.projectName}: ${b.status} (${b.client})`).join('\n')}

Win Rate: ${this.calculateWinRate(historicalBids)}%
Average Bid Value: $${this.calculateAverageBidValue(historicalBids).toLocaleString()}
`;

        try {
            const response = await this.callAI(bidContext, systemPrompt);
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Prediction error:', error);
            throw new Error('Failed to predict bid success: ' + error.message);
        }
    },

    // Helper: Calculate win rate
    calculateWinRate(bids) {
        if (!bids.length) return 0;
        const won = bids.filter(b => b.status === 'won').length;
        const decided = bids.filter(b => ['won', 'lost'].includes(b.status)).length;
        return decided ? Math.round((won / decided) * 100) : 0;
    },

    // Helper: Calculate average bid value
    calculateAverageBidValue(bids) {
        const values = bids.filter(b => b.estimatedValue).map(b => b.estimatedValue);
        return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    },

    // ==================== Task Priority Suggestions ====================
    async suggestTaskPriorities(tasks, context = {}) {
        const systemPrompt = `You are a productivity expert specializing in construction project management.
Analyze the tasks and suggest optimal priorities using the Eisenhower Matrix.
Return ONLY valid JSON:
{
    "suggestions": [
        {
            "taskId": "task id",
            "currentQuadrant": "current or null",
            "suggestedQuadrant": "urgent-important|not-urgent-important|urgent-not-important|not-urgent-not-important",
            "reason": "brief explanation",
            "suggestedDuration": "hours as number",
            "suggestedStartTime": "HH:MM"
        }
    ],
    "overallAdvice": "general productivity advice",
    "workloadAssessment": "assessment of current workload"
}`;

        const taskList = tasks.map(t => ({
            id: t.id,
            text: t.text,
            duration: t.duration,
            quadrant: t.quadrant,
            scheduledDate: t.scheduledDate,
            completed: t.completed
        }));

        const prompt = `
Today's Date: ${new Date().toISOString().split('T')[0]}
Current Time: ${new Date().toLocaleTimeString()}
${context.bidDeadlines ? `Upcoming Bid Deadlines: ${context.bidDeadlines}` : ''}

Tasks to analyze:
${JSON.stringify(taskList, null, 2)}
`;

        try {
            const response = await this.callAI(prompt, systemPrompt);
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Priority suggestion error:', error);
            throw new Error('Failed to suggest priorities: ' + error.message);
        }
    },

    // ==================== Smart Scheduling ====================
    async generateSmartSchedule(tasks, routines, preferences = {}) {
        const systemPrompt = `You are a scheduling optimization expert for construction professionals.
Create an optimal daily/weekly schedule considering:
- Task priorities and deadlines
- Existing routines (non-negotiable)
- Energy levels throughout the day
- Buffer time between tasks
- Bid deadlines (highest priority)

Return ONLY valid JSON:
{
    "schedule": [
        {
            "taskId": "id or 'routine-X' for routines",
            "taskName": "name",
            "date": "YYYY-MM-DD",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "type": "task|routine|buffer|break",
            "priority": "high|medium|low",
            "notes": "optional scheduling notes"
        }
    ],
    "conflicts": ["any scheduling conflicts found"],
    "suggestions": ["optimization suggestions"],
    "utilizationRate": "percentage of productive hours scheduled"
}`;

        const prompt = `
Date Range: ${preferences.startDate || 'today'} to ${preferences.endDate || '7 days from now'}
Work Hours: ${preferences.workStart || '06:00'} to ${preferences.workEnd || '22:00'}

Unscheduled Tasks:
${JSON.stringify(tasks.filter(t => !t.completed), null, 2)}

Daily Routines:
${JSON.stringify(routines, null, 2)}

Preferences:
- Prefer morning for: ${preferences.morningTasks || 'high-priority tasks'}
- Prefer afternoon for: ${preferences.afternoonTasks || 'meetings, calls'}
- Minimum break between tasks: ${preferences.breakMinutes || 15} minutes
`;

        try {
            const response = await this.callAI(prompt, systemPrompt);
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Smart scheduling error:', error);
            throw new Error('Failed to generate schedule: ' + error.message);
        }
    },

    // ==================== Quick Analysis ====================
    async analyzeWorkload(dailyData, eisenhowerData) {
        const systemPrompt = `Analyze this workload data and provide insights.
Return ONLY valid JSON:
{
    "summary": "brief workload summary",
    "busyDays": ["dates that are overloaded"],
    "freeDays": ["dates with capacity"],
    "recommendations": ["workload balancing suggestions"],
    "burnoutRisk": "low/medium/high",
    "productivityScore": 0-100
}`;

        const prompt = `
Daily Tasks (next 14 days):
${JSON.stringify(dailyData, null, 2)}

Eisenhower Matrix:
${JSON.stringify(eisenhowerData, null, 2)}
`;

        try {
            const response = await this.callAI(prompt, systemPrompt);
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Workload analysis error:', error);
            return null;
        }
    },

    // ==================== Document Q&A ====================
    async askAboutDocument(documentText, question) {
        const systemPrompt = `You are a helpful construction bid document analyst.
You are given the text content of an ITB (Invitation to Bid) or similar construction document.
Answer questions about the document accurately and concisely.
If the information is not in the document, say so clearly.
Focus on key details like:
- Liquidated damages amounts and terms
- DBE/MBE requirements and percentages
- Bonding requirements (bid bond, performance bond percentages)
- Insurance requirements
- Payment terms and retainage
- Project duration and milestones
- Prequalification requirements
- Addenda information
- Special conditions

Keep answers brief and to the point. Use bullet points for lists.`;

        const prompt = `DOCUMENT CONTENT:
${documentText.substring(0, 50000)}

QUESTION: ${question}

Please answer based on the document above.`;

        try {
            const response = await this.callAI(prompt, systemPrompt);
            return response;
        } catch (error) {
            console.error('Document Q&A error:', error);
            throw new Error('Failed to analyze document: ' + error.message);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
