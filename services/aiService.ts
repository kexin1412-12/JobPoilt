export const analyzeJobDescription = async (
    companyName?: string,
    positionTitle?: string,
    jdLink?: string,
    jdText?: string
) => {
    const WORKER_URL = import.meta.env.VITE_WORKER_URL;

    if (!WORKER_URL) {
        throw new Error('VITE_WORKER_URL is not configured');
    }

    const prompt = `
    Analyze this internship/job opportunity based on the provided info:
    Input Company (may be empty): ${companyName || 'Unknown'}
    Input Position (may be empty): ${positionTitle || 'Unknown'}
    ${jdLink ? `JD Link: ${jdLink}` : ''}
    ${jdText ? `JD Raw Text: ${jdText}` : ''}

    IMPORTANT: 
    1. If the Input Company or Position are 'Unknown' or seem incorrect, extract the actual Company Name and Position Title from the JD Link or JD Raw Text.
    2. Crucially, identify the specific Work Location (Base 地/城市). If multiple cities are mentioned, list them. If it's remote, state 'Remote'.

    Please provide a detailed report in JSON format:
    1. companyName: The identified company name.
    2. positionTitle: The identified job title.
    3. location: The specific work location/city (Base 地).
    4. summary: A concise overview of what this role entails.
    5. responsibilities: A list of the primary duties and tasks.
    6. requirements: A list of necessary skills, experience, and qualifications.
    7. suitabilityAssessment: An analysis of what kind of candidate fits best.
    8. interviewTips: 3-5 tactical tips for interviewing.
    9. potentialQuestions: 5-8 likely interview questions.

    If a URL is provided, use Google Search (or your browsing capability) to fetch the most accurate and up-to-date JD details including the specific office location.

    Return ONLY raw JSON, no markdown formatting.
  `;

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Worker API failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle case where worker returns { result: ... } or just the object
        const result = data.result || data;

        // Parse if it's a stringified JSON
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

        return parsedResult;
    } catch (error) {
        console.error("AI Analysis failed:", error);
        throw error;
    }
};
