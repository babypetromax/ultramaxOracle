// .github/scripts/ai-code-review.js

const { GoogleGenerativeAI } = require('@google/genai');
const github = require('@actions/github');
const fs = require('fs');

// ฟังก์ชันหลักที่จะทำงาน
async function run() {
  try {
    // 1. รับข้อมูลจาก GitHub Actions
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const context = github.context;

    if (!geminiApiKey) {
      throw new Error('Gemini API Key is not set.');
    }

    // 2. เตรียมเครื่องมือสำหรับคุยกับ Gemini และ GitHub
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const octokit = github.getOctokit(githubToken);

    // หมายเหตุ: ในโลกจริงเราจะดึงเฉพาะโค้ดที่เปลี่ยนแปลง
    // แต่สำหรับตัวอย่างนี้ เราจะอ่านไฟล์ README.md เป็นตัวแทน
    const codeToReview = fs.readFileSync('README.md', 'utf8');

    // 3. สร้าง Prompt ที่จะส่งให้ AI
    const prompt = `
      Act as: a Senior Software Architect at "UltraMax Devs".
      Analyze this code snippet:
      ---
      ${codeToReview}
      ---
      Your Task: Review this code based on our "Golden Rules".
      1. Design First: Does this code align with our principles?
      2. Stability First: Can you spot any potential issues?
      3. Minimal Code, Maximum Impact: Is this code efficient?
      Output Format: Provide feedback in Markdown format, starting with a summary verdict.
    `;

    // 4. ส่งไปให้ Gemini วิเคราะห์
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response.text();

    // 5. นำคำตอบที่ได้ไปโพสต์เป็นคอมเมนต์บน GitHub
    await octokit.rest.repos.createCommitComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
      body: `### 🔮 Synapse AI Analysis Complete 🔮\n\n${aiResponse}`
    });

    console.log('AI review comment posted successfully.');

  } catch (error) {
    console.error('Error during AI code review:', error);
    process.exit(1); // ทำให้ Action ล้มเหลว
  }
}

run();