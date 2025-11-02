// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as vscode from "vscode";
import { LLMService } from "./llm-service";
import { GeneratedTourStep } from "./tour-generator";
import { FileAnalysis, ProjectStructure } from "./treesitter-analyzer";

export class BatchTourGenerator {
    private llmService: LLMService;
    private readonly BATCH_SIZE = 4; // Smaller batches = faster!
    private readonly CONCURRENT_BATCHES = 3; // Process 3 batches at once!
    private readonly TIMEOUT_MS = 45000; // 45 second timeout per batch (was 90s)
    private readonly TARGET_STEPS = 25; // Aim for 20-30 total steps (not 100+)

    constructor() {
        this.llmService = new LLMService();
    }

    async generateTourInBatches(
        structure: ProjectStructure,
        projectContext: string,
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<GeneratedTourStep[]> {
        console.log("🚀 Starting SMART tour generation (quality + speed!)");

        const allSteps: GeneratedTourStep[] = [];

        // STEP 1: Filter out noise (tests, configs, etc.)
        const importantFiles = this.filterImportantFiles(structure.files);
        console.log(`🎯 Filtered ${structure.files.length} files → ${importantFiles.length} important files`);
        console.log(`   Skipped: tests, specs, configs, generated files`);

        // PASS 1: Welcome Page + Architecture Overview (MUST BE FIRST!)
        progress.report({ message: "📖 Generating welcome page & architecture...", increment: 15 });
        console.log("Pass 1/N: Generating welcome page (this will be step #1)...");
        const welcomeSteps = await this.generateWelcomePage(structure, projectContext);

        if (welcomeSteps.length === 0) {
            console.error("❌ ERROR: No welcome steps generated!");
        } else {
            allSteps.push(...welcomeSteps);
            console.log(`✓ Generated ${welcomeSteps.length} welcome step(s)`);
            console.log(`   Step #1 Title: "${welcomeSteps[0]?.title || 'Unknown'}"`);
            console.log(`   Step #1 File: "${welcomeSteps[0]?.file || 'Unknown'}"`);
            console.log(`   Step #1 Line: ${welcomeSteps[0]?.line || 'N/A'}`);
            console.log(`   Current total steps: ${allSteps.length}`);
        }

        // PASS 2-N: CONCURRENT batch processing (FAST!)
        const batches = this.createFileBatches(importantFiles);
        console.log(`📦 Split ${importantFiles.length} files into ${batches.length} batches (${this.BATCH_SIZE} files each)`);
        console.log(`⚡ Processing ${this.CONCURRENT_BATCHES} batches concurrently for SPEED!`);

        const incrementPerBatch = 80 / batches.length;

        // Process batches in concurrent groups
        for (let groupStart = 0; groupStart < batches.length; groupStart += this.CONCURRENT_BATCHES) {
            const batchGroup = batches.slice(groupStart, groupStart + this.CONCURRENT_BATCHES);
            const groupNum = Math.floor(groupStart / this.CONCURRENT_BATCHES) + 1;
            const totalGroups = Math.ceil(batches.length / this.CONCURRENT_BATCHES);

            console.log(`\n🚀 Processing group ${groupNum}/${totalGroups} (${batchGroup.length} batches concurrently)...`);

            // Process all batches in this group concurrently
            const batchPromises = batchGroup.map(async (batch, idx) => {
                const batchNum = groupStart + idx + 1;
                const batchId = `batch-${batchNum}`;

                try {
                    progress.report({
                        message: `⚡ Batch ${batchNum}/${batches.length}: ${batch[0].file.split('/').pop()} + ${batch.length - 1} more...`,
                        increment: 0
                    });

                    console.log(`   [${batchId}] Starting: ${batch.map(f => f.file.split('/').pop()).join(", ")}`);

                    const batchSteps = await this.generateBatchWithTimeout(
                        batch,
                        structure,
                        projectContext,
                        batchNum
                    );

                    console.log(`   [${batchId}] ✓ Generated ${batchSteps.length} steps`);
                    progress.report({ increment: incrementPerBatch });

                    return batchSteps;
                } catch (error: any) {
                    console.error(`   [${batchId}] ❌ Failed: ${error.message}`);
                    // Return empty array instead of failing - continue with other batches
                    return [];
                }
            });

            // Wait for all batches in this group to complete
            const groupResults = await Promise.all(batchPromises);

            const stepsBefore = allSteps.length;
            groupResults.forEach(steps => allSteps.push(...steps));
            const stepsAdded = allSteps.length - stepsBefore;

            console.log(`✓ Group ${groupNum} complete: ${stepsAdded} steps added (total now: ${allSteps.length})`);
        }

        console.log(`\n🎉 SMART TOUR GENERATION COMPLETE!`);
        console.log(`   Total steps generated: ${allSteps.length}`);
        console.log(`   Batches processed: ${batches.length} (${this.CONCURRENT_BATCHES} concurrent)`);
        console.log(`   Important files covered: ${importantFiles.length}/${structure.files.length}`);
        console.log(`   Speed boost: ~${this.CONCURRENT_BATCHES}x faster + smart filtering!`);

        return allSteps;
    }

    private filterImportantFiles(files: FileAnalysis[]): FileAnalysis[] {
        return files.filter(file => {
            const fileName = file.file.toLowerCase();

            // SKIP noise files
            if (
                fileName.includes('.test.') ||
                fileName.includes('.spec.') ||
                fileName.includes('__tests__') ||
                fileName.includes('test/') ||
                fileName.includes('tests/') ||
                fileName.includes('.config.') ||
                fileName.includes('config/') ||
                fileName.includes('.generated.') ||
                fileName.includes('node_modules') ||
                fileName.includes('dist/') ||
                fileName.includes('build/') ||
                fileName.includes('.min.') ||
                fileName.includes('.d.ts') // type definitions
            ) {
                return false;
            }

            // MUST have meaningful code elements
            if (file.elements.length === 0) {
                return false;
            }

            return true;
        });
    }

    private createFileBatches(files: FileAnalysis[]): FileAnalysis[][] {
        const batches: FileAnalysis[][] = [];

        // Prioritize files: entry points first, then by importance
        const sortedFiles = [...files].sort((a, b) => {
            const aScore = this.getFileImportance(a);
            const bScore = this.getFileImportance(b);
            return bScore - aScore;
        });

        for (let i = 0; i < sortedFiles.length; i += this.BATCH_SIZE) {
            batches.push(sortedFiles.slice(i, i + this.BATCH_SIZE));
        }

        return batches;
    }

    private getFileImportance(file: FileAnalysis): number {
        let score = 0;
        const fileName = file.file.toLowerCase();

        // Entry points and core files
        if (fileName.includes('index') || fileName.includes('main') || fileName.includes('app')) {
            score += 100;
        }

        // Source files more important than config
        if (fileName.includes('src/') || fileName.includes('lib/')) {
            score += 50;
        }

        // Files with more elements are more important
        score += file.elements.length * 5;

        // Penalize test files
        if (fileName.includes('test') || fileName.includes('spec')) {
            score -= 50;
        }

        return score;
    }

    private async generateWelcomePage(structure: ProjectStructure, projectContext: string): Promise<GeneratedTourStep[]> {
        const workspaceName = vscode.workspace.name || "this project";

        // Try to read README.md and package.json for project context
        let readmeContent = "";
        let packageDescription = "";
        let welcomeFile = structure.files[0]?.file || "README.md";

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                // Read README.md
                try {
                    const readmePath = vscode.Uri.joinPath(workspaceFolders[0].uri, "README.md");
                    const readmeDoc = await vscode.workspace.openTextDocument(readmePath);
                    const fullReadme = readmeDoc.getText();

                    // Clean README: Skip badges, sponsors, ads
                    readmeContent = this.cleanReadmeContent(fullReadme);
                    welcomeFile = "README.md";
                    console.log(`📖 Read README.md (cleaned: ${readmeContent.length} chars)`);
                } catch (e) {
                    console.log("📝 No README.md found");
                }

                // Read package.json for description
                try {
                    const packagePath = vscode.Uri.joinPath(workspaceFolders[0].uri, "package.json");
                    const packageDoc = await vscode.workspace.openTextDocument(packagePath);
                    const packageJson = JSON.parse(packageDoc.getText());
                    packageDescription = packageJson.description || "";
                    console.log(`📦 package.json description: ${packageDescription}`);
                } catch (e) {
                    // No package.json, that's fine
                }
            }
        } catch (error) {
            console.log("📝 Using first analyzed file for welcome step");
        }

        // Use a dedicated system prompt for welcome page ONLY
        const systemPrompt = `You are creating the WELCOME PAGE for a code tour. This is the FIRST step that introduces the entire project.

Your job: Analyze the README and codebase to create a comprehensive welcome that explains WHAT this project DOES and WHY it EXISTS.

CRITICAL: Focus on FUNCTIONALITY, not marketing:
- **Purpose**: What SPECIFIC problem does this solve? What is its PRIMARY function?
- **Core Functionality**: What are the MAIN features and capabilities?
- **Key Use Cases**: CONCRETE scenarios where developers/users would use this (2-3 specific examples)
- **How It Works**: High-level flow - Input → Processing → Output
- **Architecture**: Main components and their roles
- **Tech Stack**: Languages, frameworks, key libraries
- **What You'll Learn**: What developers will understand after this tour

AVOID: Marketing fluff, sponsor ads, vague descriptions. Be SPECIFIC and TECHNICAL.`;

        const userPrompt = `${projectContext}

${packageDescription ? `**PACKAGE DESCRIPTION:** ${packageDescription}\n\n` : ''}

${readmeContent ? `**README CONTENT (cleaned):**\n\`\`\`\n${readmeContent}\n\`\`\`\n\n` : ''}

**CODEBASE STRUCTURE:**
- ${structure.files.length} files analyzed
- Languages: ${[...new Set(structure.files.map(f => f.language))].join(", ")}
- Entry points: ${structure.entryPoints.slice(0, 3).join(", ") || "Not detected"}
- Key directories: ${this.getKeyDirectories(structure.files).join(", ")}

Create a JSON array with ONE comprehensive welcome step:

[
  {
    "title": "🎉 Welcome to ${workspaceName}",
    "file": "${welcomeFile}",
    "line": 1,
    "description": "# Welcome to ${workspaceName}\n\n## 🎯 Purpose\n[SPECIFIC functionality - e.g., 'Packages repository into a single text file for AI context']\n\n## ⚙️ Core Functionality\n- [Feature 1 - be specific about what it does]\n- [Feature 2 - actual capabilities]\n- [Feature 3 - key operations]\n\n## 💡 Use Cases\n1. **[Scenario 1]**: [Concrete example - e.g., 'Developer wants to share codebase with Claude']\n2. **[Scenario 2]**: [Specific use - e.g., 'Team needs to analyze project structure']\n3. **[Scenario 3]**: [Real application]\n\n## 🔄 How It Works\n[Brief flow: Input → Processing → Output]\n\n## 🏗️ Architecture\n- **[Component 1]**: [Role and responsibility]\n- **[Component 2]**: [What it handles]\n- **[Component 3]**: [Its function]\n\n## 🛠️ Tech Stack\n${[...new Set(structure.files.map(f => f.language))].join(", ")}, [key frameworks/libraries]\n\n## 📂 Project Structure\n${this.getKeyDirectories(structure.files).map(d => `- \`${d}/\` - [purpose]`).join('\\n')}\n\n## 📚 What This Tour Covers\n[Specific areas you'll explore]"
  }
]

Be CONCRETE and TECHNICAL. Explain FUNCTIONALITY, not marketing.`;

        try {
            // Use generateCompletion directly to avoid conflicting system prompts
            const response = await this.llmService.generateCompletion([
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]);

            const steps = this.parseStepsFromResponse(response.content);

            if (steps.length === 0) {
                throw new Error("No steps generated");
            }

            console.log(`✓ Welcome page generated: "${steps[0].title}"`);
            console.log(`   File: ${steps[0].file || welcomeFile}`);

            // Ensure the file path is set correctly
            if (!steps[0].file || steps[0].file === "README.md") {
                steps[0].file = welcomeFile;
            }

            return steps.slice(0, 1); // Only take the first step
        } catch (error: any) {
            console.error("Failed to generate welcome page with LLM:", error.message);
            console.log("⚠️  Using fallback welcome page...");

            // Fallback: create welcome step with cleaned README content
            let description: string;

            if (readmeContent && readmeContent.length > 100) {
                // Use cleaned README content
                const readmeLines = readmeContent.split('\n').slice(0, 40);
                description = `# Welcome to ${workspaceName}\n\n`;

                if (packageDescription) {
                    description += `## 🎯 Purpose\n${packageDescription}\n\n`;
                }

                description += `${readmeLines.join('\n')}\n\n`;
                description += `## 📊 Codebase Overview\n`;
                description += `- **Files**: ${structure.files.length} analyzed\n`;
                description += `- **Languages**: ${[...new Set(structure.files.map(f => f.language))].join(", ")}\n`;
                description += `- **Entry Points**: ${structure.entryPoints.slice(0, 3).join(", ") || "Not detected"}\n\n`;
                description += `## 📚 Tour Coverage\nThis tour explores the key components, architecture, and implementation details of this codebase.\n`;
            } else {
                // Minimal fallback when no README
                description = `# Welcome to ${workspaceName}\n\n`;

                if (packageDescription) {
                    description += `## 🎯 Purpose\n${packageDescription}\n\n`;
                }

                description += `## 📊 Project Overview\n`;
                description += `- **Files Analyzed**: ${structure.files.length}\n`;
                description += `- **Languages**: ${[...new Set(structure.files.map(f => f.language))].join(", ")}\n`;
                description += `- **Entry Points**: ${structure.entryPoints.slice(0, 3).join(", ") || "Not detected"}\n\n`;
                description += `## 📂 Key Directories\n`;
                description += this.getKeyDirectories(structure.files).map(d => `- \`${d}/\` - Main source directory`).join('\n');
                description += `\n\n## 🎯 What You'll Learn\n`;
                description += `This tour will walk you through the codebase structure, key components, and how different parts work together.\n`;
            }

            const fallbackStep = {
                title: `🎉 Welcome to ${workspaceName}`,
                file: welcomeFile,
                line: 1,
                description
            };

            console.log(`✓ Fallback welcome page created`);
            console.log(`   File: ${fallbackStep.file}`);

            return [fallbackStep];
        }
    }

    private getKeyDirectories(files: FileAnalysis[]): string[] {
        const dirs = new Set<string>();
        files.forEach(f => {
            const parts = f.file.split('/');
            if (parts.length > 1) {
                dirs.add(parts[0]); // Top-level directory
            }
        });
        return Array.from(dirs).slice(0, 6); // Top 6 directories
    }

    private cleanReadmeContent(readme: string): string {
        const lines = readme.split('\n');
        const cleaned: string[] = [];
        let skipSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            const originalLine = lines[i];

            // Skip badge lines (usually at the top)
            if (originalLine.match(/!\[.*?\]\(.*?badge.*?\)/i) ||
                originalLine.match(/!\[.*?\]\(https:\/\/img\.shields\.io/i)) {
                continue;
            }

            // Skip sponsor/ad sections
            if (line.includes('sponsor') ||
                line.includes('### sponsors') ||
                line.includes('## sponsors') ||
                line.includes('### thank')) {
                skipSection = true;
                continue;
            }

            // Skip lines that look like ads (contain product names + promotional text)
            if ((line.includes('warp') && line.includes('built for')) ||
                (line.includes('tuple') && line.includes('premier')) ||
                (line.includes('available for') && line.includes('macos')) ||
                line.match(/\b(try|get|download|available)\b.*\b(free|now|today)\b/i)) {
                continue;
            }

            // Resume on next heading
            if (skipSection && originalLine.match(/^#{1,3}\s/)) {
                skipSection = false;
            }

            if (!skipSection) {
                cleaned.push(originalLine);
            }
        }

        // Take first 5000 chars of cleaned content
        return cleaned.join('\n').slice(0, 5000);
    }

    private async generateBatchWithTimeout(
        batch: FileAnalysis[],
        structure: ProjectStructure,
        projectContext: string,
        batchNum: number
    ): Promise<GeneratedTourStep[]> {
        return Promise.race([
            this.generateBatchSteps(batch, structure, projectContext, batchNum),
            new Promise<GeneratedTourStep[]>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${this.TIMEOUT_MS / 1000}s`)), this.TIMEOUT_MS)
            )
        ]);
    }

    private async generateBatchSteps(
        batch: FileAnalysis[],
        structure: ProjectStructure,
        projectContext: string,
        batchNum: number
    ): Promise<GeneratedTourStep[]> {
        const batchStructure = this.formatBatchStructure(batch);
        const stepsPerBatch = Math.ceil(this.TARGET_STEPS / Math.ceil(structure.files.length / this.BATCH_SIZE));

        // Dedicated system prompt for batch generation (NO welcome page instructions!)
        const systemPrompt = `You are generating code tour steps for a SPECIFIC BATCH of files. The welcome/intro has ALREADY been created.

Your job: Create detailed steps for the files provided, focusing on helping developers understand the code's purpose, architecture, and connections.`;

        const userPrompt = `${projectContext}

**BATCH ${batchNum} FILES:**
${batchStructure}

**YOUR TASK:** Create ~${stepsPerBatch} tour steps for these files.

**FOCUS ON:**
- Entry points (where execution starts)
- Core business logic and data flow
- Public APIs (exported functions/classes)
- Critical execution paths
- How components connect

**SKIP:** Helper utilities, simple getters/setters, trivial wrappers

**FORMAT:** JSON array:
[
  {
    "title": "ComponentName - Brief Role",
    "file": "src/path/file.ts",
    "line": 42,
    "description": "What it does, why it exists, and how it connects to other parts. 2-4 sentences focusing on PURPOSE and RELATIONSHIPS."
  }
]

Use EXACT line numbers from @XX notation in the files above.`;

        try {
            const response = await this.llmService.generateCompletion([
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]);

            return this.parseStepsFromResponse(response.content);
        } catch (error) {
            console.error(`Failed to generate steps for batch ${batchNum}:`, error);
            return []; // Return empty array on failure
        }
    }

    private formatBatchStructure(files: FileAnalysis[]): string {
        let formatted = "";

        files.forEach(file => {
            formatted += `\n## ${file.file}\n`;

            if (file.elements.length > 0) {
                const classes = file.elements.filter(e => e.type === "class");
                const functions = file.elements.filter(e => e.type === "function" || e.type === "async function");
                const types = file.elements.filter(e => e.type === "interface" || e.type === "enum");

                if (classes.length > 0) {
                    formatted += `Classes: ${classes.map(c => {
                        const methodCount = c.children?.length || 0;
                        return `${c.name}@${c.line}[${methodCount}m]`;
                    }).join(", ")}\n`;
                    classes.forEach(c => {
                        if (c.children && c.children.length > 0) {
                            formatted += `  ${c.name} methods: ${c.children.map(m => `${m.name}@${m.line}`).join(", ")}\n`;
                        }
                    });
                }

                if (functions.length > 0) {
                    formatted += `Functions: ${functions.map(f => `${f.name}@${f.line}`).join(", ")}\n`;
                }

                if (types.length > 0) {
                    formatted += `Types: ${types.map(t => `${t.name}@${t.line}`).join(", ")}\n`;
                }
            }
        });

        return formatted;
    }

    private parseStepsFromResponse(response: string): GeneratedTourStep[] {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON array found in response");
            }

            const steps = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(steps)) {
                throw new Error("Response is not an array");
            }

            return steps;
        } catch (error) {
            console.error("Failed to parse LLM response:", error);
            return [];
        }
    }
}

