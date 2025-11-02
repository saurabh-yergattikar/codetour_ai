// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as vscode from "vscode";
import { CodeTour, CodeTourStep } from "../store";
import { AnalysisLogger } from "./analysis-logger";
import { BatchTourGenerator } from "./batch-generator";
import { FileAnalysis, ProjectStructure, TreeSitterAnalyzer } from "./treesitter-analyzer";

export interface TourGenerationOptions {
    workspaceRoot: vscode.Uri;
    tourTitle?: string;
    tourDescription?: string;
    focusAreas?: string[];
    maxSteps?: number;
}

export interface GeneratedTourStep {
    title: string;
    file: string;
    line?: number;
    description: string;
    selection?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

export class TourGenerator {
    private analyzer: TreeSitterAnalyzer;

    constructor(extensionPath: string) {
        this.analyzer = new TreeSitterAnalyzer(extensionPath);
    }

    async generateTour(options: TourGenerationOptions): Promise<CodeTour> {
        console.log("🚀 Starting tour generation...");

        // Show progress
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "AI Tour Generation",
                cancellable: true
            },
            async (progress, token) => {
                try {
                    // Create analysis logger for evidence
                    const logger = new AnalysisLogger(options.workspaceRoot.fsPath);
                    this.analyzer.setLogger(logger);

                    // Step 1: Initialize TreeSitter
                    progress.report({ message: "⚙️ Initializing analyzer (0/6)...", increment: 0 });
                    console.log("Step 1: Initializing analyzer...");
                    await this.analyzer.initialize();
                    console.log("✓ Analyzer initialized");

                    if (token.isCancellationRequested) {
                        throw new Error("Tour generation cancelled");
                    }

                    // Step 2: Analyze project structure
                    progress.report({ message: "📂 Scanning files (1/6)...", increment: 15 });
                    console.log("Step 2: Analyzing project structure...");
                    const projectStructure = await this.analyzer.analyzeProject(options.workspaceRoot);
                    console.log(`✓ Analyzed ${projectStructure.files.length} files`);

                    if (token.isCancellationRequested) {
                        throw new Error("Tour generation cancelled");
                    }

                    // Step 3: Generate project context
                    progress.report({ message: "🔍 Building context (2/4)...", increment: 20 });
                    console.log("Step 3: Building project context...");
                    const projectContext = this.buildProjectContext(projectStructure, options);
                    console.log("✓ Context built");

                    if (token.isCancellationRequested) {
                        throw new Error("Tour generation cancelled");
                    }

                    // Step 4: Generate tour steps using MULTI-PASS BATCH GENERATION (NO token limits!)
                    progress.report({ message: "🚀 Starting multi-pass generation... (3/4)", increment: 30 });
                    console.log("Step 4: Starting BATCH generation (NO token limits!)...");
                    const batchGenerator = new BatchTourGenerator();
                    const tourSteps = await batchGenerator.generateTourInBatches(
                        projectStructure,
                        projectContext,
                        progress
                    );
                    console.log(`✓ Generated ${tourSteps.length} steps across all batches`);

                    if (token.isCancellationRequested) {
                        throw new Error("Tour generation cancelled");
                    }

                    // Step 5: Validate and refine steps
                    progress.report({ message: "✅ Validating steps (4/4)...", increment: 90 });
                    console.log("Step 5: Validating steps...");
                    console.log(`   Before validation: ${tourSteps.length} steps`);
                    console.log(`   First step title: "${tourSteps[0]?.title || 'None'}"`);
                    console.log(`   First step file: "${tourSteps[0]?.file || 'None'}"`);

                    const validatedSteps = await this.validateAndRefineSteps(
                        tourSteps,
                        projectStructure,
                        options
                    );

                    console.log(`✓ After validation: ${validatedSteps.length} steps`);
                    if (validatedSteps.length > 0) {
                        console.log(`   First validated step: "${validatedSteps[0]?.title || 'None'}"`);
                    } else {
                        console.error(`❌ ERROR: All steps were filtered out during validation!`);
                    }

                    // Step 6: Create the tour object
                    progress.report({ message: "💾 Creating tour file...", increment: 95 });
                    console.log("Step 6: Creating tour...");
                    const tour = this.createTour(validatedSteps, options);
                    console.log(`✓ Tour created: ${tour.title}`);

                    // Save TreeSitter analysis log
                    const treesitterCount = projectStructure.files.length; // All analyzed with TreeSitter
                    logger.logSummary(projectStructure.files.length, treesitterCount, 0);
                    await logger.save();

                    progress.report({ message: "🎉 Complete!", increment: 100 });
                    console.log("🎉 Tour generation complete!");
                    return tour;

                } catch (error: any) {
                    console.error("❌ Tour generation failed:", error);
                    vscode.window.showErrorMessage(`Failed to generate tour: ${error.message}`);
                    throw error;
                }
            }
        );
    }

    private buildProjectContext(structure: ProjectStructure, options: TourGenerationOptions): string {
        const workspaceName = vscode.workspace.name || "Unknown Project";
        const fileCount = structure.files.length;
        const languages = [...new Set(structure.files.map(f => f.language))].join(", ");

        let context = `Project: ${workspaceName}\n`;
        context += `Goal: Create a comprehensive, narrative-driven tour that helps developers deeply understand this codebase.\n\n`;
        context += `Files analyzed: ${fileCount}\n`;
        context += `Languages: ${languages}\n`;

        if (structure.entryPoints.length > 0) {
            context += `Entry points (Start Here): ${structure.entryPoints.join(", ")}\n`;
        }

        // Add architectural overview
        const directories = new Set(
            structure.files.map(f => f.file.includes("/") ? f.file.split("/")[0] : "root")
        );
        context += `Main modules/directories: ${Array.from(directories).join(", ")}\n\n`;

        if (options.tourTitle) {
            context += `Tour focus: ${options.tourTitle}\n`;
        }
        if (options.tourDescription) {
            context += `Tour description: ${options.tourDescription}\n`;
        }
        if (options.focusAreas && options.focusAreas.length > 0) {
            context += `Focus areas: ${options.focusAreas.join(", ")}\n`;
        }

        context += `\nNote: Files are interconnected. Show how they work together as a cohesive system.\n`;

        return context;
    }

    // NOTE: Tour generation is now handled by BatchTourGenerator
    // Old single-pass methods have been removed in favor of multi-pass batch generation

    private async validateAndRefineSteps(
        steps: GeneratedTourStep[],
        structure: ProjectStructure,
        options: TourGenerationOptions
    ): Promise<CodeTourStep[]> {
        const validatedSteps: CodeTourStep[] = [];
        const maxSteps = options.maxSteps || 20;

        for (let i = 0; i < steps.slice(0, maxSteps).length; i++) {
            const step = steps[i];
            try {
                // CRITICAL: Skip file validation for the FIRST step (welcome page)
                // Welcome page might use README.md or other non-source files
                const isWelcomeStep = i === 0 && step.title?.includes('Welcome');

                if (!isWelcomeStep) {
                    // Check if file exists in the analyzed structure
                    const fileExists = structure.files.some(f => f.file === step.file);

                    if (!fileExists) {
                        // Try to find similar file
                        const similarFile = this.findSimilarFile(step.file, structure.files);
                        if (similarFile) {
                            console.log(`📝 Mapped ${step.file} → ${similarFile}`);
                            step.file = similarFile;
                        } else {
                            console.warn(`⚠️  File not found: ${step.file}, skipping step`);
                            continue;
                        }
                    }
                } else {
                    console.log(`🎉 Welcome step detected, skipping file validation`);
                }

                // Validate line number
                if (step.line) {
                    const fileAnalysis = structure.files.find(f => f.file === step.file);
                    if (fileAnalysis) {
                        // Make sure line number is reasonable (basic validation)
                        // In production, you'd read the actual file to validate
                        if (step.line < 1) {
                            step.line = 1;
                        }
                    }
                }

                // Convert to CodeTourStep format
                const tourStep: CodeTourStep = {
                    title: step.title,
                    file: step.file,
                    description: step.description
                };

                if (step.line) {
                    tourStep.line = step.line;
                }

                if (step.selection) {
                    tourStep.selection = step.selection;
                }

                validatedSteps.push(tourStep);
            } catch (error) {
                console.error(`Error validating step:`, error);
            }
        }

        return validatedSteps;
    }

    private findSimilarFile(targetFile: string, files: FileAnalysis[]): string | null {
        // Simple similarity check based on filename
        const targetName = targetFile.split("/").pop()?.toLowerCase() || "";

        for (const file of files) {
            const fileName = file.file.split("/").pop()?.toLowerCase() || "";
            if (fileName === targetName) {
                return file.file;
            }
        }

        return null;
    }

    private createTour(steps: CodeTourStep[], options: TourGenerationOptions): CodeTour {
        const tourTitle = options.tourTitle || `AI Generated Tour - ${new Date().toLocaleString()}`;
        const tourDescription = options.tourDescription || "This tour was automatically generated using AI and TreeSitter AST analysis.";

        // Get the workspace folder
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(options.workspaceRoot);
        const tourDirectory = workspaceFolder
            ? vscode.Uri.joinPath(workspaceFolder.uri, ".tours")
            : options.workspaceRoot;

        const fileName = tourTitle
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\-]/g, "");

        const tourUri = vscode.Uri.joinPath(tourDirectory, `${fileName}.tour`);

        return {
            id: tourUri.toString(),
            title: tourTitle,
            description: tourDescription,
            steps: steps
        };
    }
}

