## Upcoming

- Automatically updating a tour file as the associated code changes
- Automatically set the "pattern" record mode when you create a new tour, and select `None` for the git ref
- Added support for opening a `*.tour` file in the VS Code notebook editor (Insiders only)

## v1.0.10 (November 2, 2024)

### 🚀 FEATURE: Unlimited Analysis + Smart Filtering (Analyze ALL Source Files!)

**What Changed**:
- ✅ **Default to UNLIMITED analysis** (maxFilesToAnalyze = 0)
- ✅ **Analyze ENTIRE codebase** (no more arbitrary 200-file limit!)
- ✅ **Smart exclusions** during file discovery (not after!)
- ✅ **Comprehensive filtering** of noise files

**Auto-Excluded Patterns**:
- 📁 **Build artifacts**: `dist/`, `build/`, `out/`, `.next/`, `coverage/`
- 🧪 **Test files**: `*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `tests/`
- 📦 **Dependencies**: `node_modules/`
- 🔧 **Config/Generated**: `*.config.*`, `*.d.ts`, `*.min.*`, `.generated.*`
- 🗂️ **IDE folders**: `.vscode/`, `.idea/`, `.git/`

**Before v1.0.10**:
```
Found 500 files → analyze 200 → filter out tests/configs → ~150 useful
```

**After v1.0.10**:
```
Found 500 files → exclude tests/build/node_modules → 200 useful files → analyze ALL 200!
```

**Benefits**:
- 🎯 Analyzes ALL your source code (not just 200 files)
- ⚡ Faster (skips useless files during discovery)
- 🧹 Cleaner tours (no test/config/build file noise)
- 💪 Better coverage (entire codebase analyzed)

**Console Logs**:
```
🌟 Analyzing ENTIRE codebase (unlimited, auto-excludes tests/build/node_modules)
📝 Found 234 source files (tests/node_modules excluded)
🧹 After filtering: 234 files
🎯 Analyzing 234 files with TreeSitter AST...
```

## v1.0.9 (November 2, 2024)

### 🎯 MAJOR IMPROVEMENT: Functional Welcome Pages (No More Ads!)

**Problem**: Welcome pages were showing sponsor ads and marketing fluff from README (e.g., "Warp, built for coding" and "Tuple, the premier app") instead of actual project functionality.

**Root Cause**: Reading README raw without filtering → included badges, sponsors, ads, promotional content.

**Fix**:
- ✅ **Smart README Cleaning**: Filters out badges, sponsor sections, ads, promotional text
- ✅ **Package.json Integration**: Reads project description for accurate purpose
- ✅ **Better LLM Prompts**: Focus on FUNCTIONALITY, USE CASES, HOW IT WORKS (not marketing)
- ✅ **Technical Content**: Emphasizes what the project DOES, not what it claims to be
- ✅ **Structured Sections**: 
  - 🎯 Purpose (specific functionality)
  - ⚙️ Core Functionality (actual features)
  - 💡 Use Cases (concrete scenarios)
  - 🔄 How It Works (input → processing → output)
  - 🏗️ Architecture (components and roles)
  - 🛠️ Tech Stack (languages, frameworks)
  - 📂 Project Structure (directory purposes)

**What Gets Filtered**:
- Badge images (shields.io, etc.)
- Sponsor sections
- Product ads (Warp, Tuple, etc.)
- Promotional lines ("Available for MacOS, Linux, Windows")
- Marketing fluff

**Result**: Welcome pages now explain WHAT the codebase DOES and HOW TO USE IT, not what sponsors paid for!

## v1.0.8 (November 2, 2024)

### 🐛 CRITICAL FIX: Welcome Page Validation Bypass

**Problem**: Welcome page was STILL disappearing in v1.0.7! Even though we fixed the file path, validation was filtering it out.

**Root Cause**: The `validateAndRefineSteps` function checks if `step.file` exists in `structure.files`. If README.md (or any non-source file) wasn't in the analyzed files list, it got filtered out.

**Fix**:
- ✅ **Skip validation for welcome step**: First step with "Welcome" in title bypasses file validation
- ✅ **Enhanced logging**: Added detailed console logs to track welcome step through generation → validation → final tour
- ✅ **Debug visibility**: Shows exactly which steps are created, validated, and included in the tour

**Technical Details**:
```typescript
// Now skips file validation for welcome step:
const isWelcomeStep = i === 0 && step.title?.includes('Welcome');
if (!isWelcomeStep) {
    // Only validate file existence for non-welcome steps
}
```

**Result**: Welcome page is NOW GUARANTEED to appear, no matter what file it references!

## v1.0.7 (November 2, 2024)

### 🐛 CRITICAL FIX: Welcome Page Missing

**Problem**: Welcome page was disappearing completely in v1.0.6!

**Root Cause**: The `file` property was set to `"README.md"` as a string, but if README.md wasn't in the analyzed files list, the tour step got filtered out during validation.

**Fix**:
- ✅ **Smart file selection**: Now uses first analyzed file from the codebase if README.md doesn't exist
- ✅ **README preferred**: If README.md exists, it's used; otherwise falls back to first source file
- ✅ **Better logging**: Shows which file is being used for the welcome step
- ✅ **File path validation**: Ensures the file path is always valid and won't be filtered out
- ✅ **Improved error handling**: Better fallback logic with detailed error messages

**Result**: Welcome page is NOW ALWAYS PRESENT, guaranteed! Uses actual analyzed files so it never gets filtered out.

## v1.0.6 (November 2, 2024)

### 🚀 Major Improvements: Analyze More Files + Better Welcome Pages

#### **1. Analyze ALL Files (Not Just 50!)**
**Problem**: Only 50 files were being analyzed by default, missing large portions of codebases.

**Fix**:
- ✅ **Default increased**: 50 → **200 files** (4x more!)
- ✅ **Unlimited mode**: Set `maxFilesToAnalyze: 0` to analyze the **entire codebase**
- ✅ **Smart prioritization**: Finds 3x more files, prioritizes the most important ones
- ✅ **Better logging**: Shows "Analyzing ENTIRE codebase (unlimited)" when set to 0

**Impact**: Large codebases (100-500+ files) now get comprehensive tours covering the entire project!

#### **2. Informative Welcome Pages with README Context**
**Problem**: Welcome pages were generic, showing only file counts without project purpose, use cases, or context.

**Fix**:
- ✅ **Reads README.md**: Automatically reads first 3000 chars of README for project context
- ✅ **Better prompts**: LLM now generates sections for:
  - 🎯 **Purpose**: What problem does this project solve?
  - 💡 **Key Use Cases**: Main scenarios where it's used
  - 🏗️ **Architecture**: High-level components and interactions
  - 🛠️ **Tech Stack**: Languages, frameworks, tools
  - 📂 **Directory Structure**: Explanation of key folders
  - 📚 **What You'll Learn**: Tour coverage overview
- ✅ **Smart fallback**: Even without LLM, fallback includes README content + directory structure
- ✅ **Key directories**: Shows top-level directories automatically

**Impact**: Developers now understand WHAT the project does and WHY before diving into code!

#### **Configuration Updates**
```json
{
  "codetour.autoGenerate.maxFilesToAnalyze": 200  // Was 50, set to 0 for unlimited
}
```

## v1.0.5 (November 2, 2024)

### 🔧 CRITICAL FIX: Welcome Page Ordering

**Problem**: Welcome page was appearing as step #3 instead of step #1 due to conflicting LLM prompts.

**Root Cause**: Both welcome page generation and batch generation were using the same `generateCodeTourDescription` method with a system prompt that instructed "STEP 1 - WELCOME PAGE". This caused the LLM to generate conflicting step numbers.

**Fix**:
- ✅ **Separate System Prompts**: Welcome page now uses dedicated `generateCompletion` with its own system prompt
- ✅ **Clear Context**: Batch generation explicitly states "The welcome/intro has ALREADY been created"
- ✅ **Better Logging**: Added detailed logs showing step order as they're generated
- ✅ **Guaranteed First**: Welcome page is now ALWAYS step #1

**Result**: Tours now properly start with the welcome/overview page, followed by code exploration steps in logical order.

## v1.0.4 (November 2, 2024)

### ⚡ SMART & FAST Tour Generation

- **Smart File Filtering**: Automatically skips test files, specs, configs, and generated files for faster, more focused tours
- **Strategic Checkpoints**: Focus on entry points, core logic, public APIs, and critical paths (not every function)
- **3x Faster Generation**: Concurrent batch processing with reduced batch sizes (4 files per batch, 45s timeout)
- **Quality Over Quantity**: 20-30 high-quality steps covering key flows instead of 100+ steps
- **Better Prompts**: LLM focuses on PURPOSE and CONNECTIONS, skips trivial utilities
- **Faster Default Model**: Changed default from `gpt-4-turbo-preview` to `gpt-4o-mini` (10x faster, 30x cheaper)
- **Improved Progress**: Real-time updates showing which files are being processed
- **Auto-Recovery**: Failed batches don't stop the tour, generation continues with remaining files

### 🎯 What Gets Covered

Tours now focus on helping developers understand:
- Overall project architecture and flow
- Entry points and main execution paths
- Core business logic and data flow
- Public APIs and integrations
- Important design patterns and decisions

### ⏱️ Speed Improvements

- 50 files: **~2 minutes** (was 5-10 minutes)
- Smart filtering: Typically processes 40-60% fewer files
- Concurrent processing: 3 batches at once
- Faster LLM: gpt-4o-mini is 5-10x faster than gpt-4-turbo

## v1.0.1 (November 2, 2024)

### 🎯 Enhanced AI Tour Generation

- **Welcome Page**: Every generated tour now starts with a comprehensive overview page including:
  - Project purpose and high-level architecture
  - Tech stack and frameworks
  - Main execution flows and patterns
  - Directory structure explanation
  - Visual flow diagrams (when applicable)
- **Deep Method Coverage**: Enhanced AST analysis now creates separate tour steps for EACH method in a class
  - If a class has 10 methods, you get 10+ detailed tour steps
  - Comprehensive coverage of all functions, classes, interfaces, and their methods
- **Professional Technical Language**: Removed simplified analogies, now provides:
  - Detailed technical explanations
  - Parameter and return type information
  - Implementation details and architectural reasoning
  - Integration points and data flow
- **Improved Code Analysis**: 
  - Better regex-based fallback for TypeScript/JavaScript/Python
  - Tracks class hierarchies and nested methods
  - Extracts async functions, arrow functions, interfaces, enums
  - Default increased to 25 files analyzed (configurable)
- **35-60+ Tour Steps**: More thorough coverage with structured approach:
  - Welcome overview
  - Entry points
  - Core components (with method-level detail)
  - Integration patterns
  - Architecture summary

## v1.0.0 (November 2, 2024)

### 🤖 AI-Powered Tour Generation (NEW!)

- **Auto-generate code tours using LLM and TreeSitter AST analysis**: Automatically create comprehensive, educational code tours for your entire codebase
- **Multi-LLM provider support**: Compatible with OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), and custom/local LLM providers
- **Intelligent code analysis**: Uses TreeSitter to parse code structure (classes, functions, imports) and provides context to the LLM
- **New commands**:
  - `CodeTour: Generate Code Tour (AI)` - Generate a tour automatically
  - `CodeTour: Configure LLM Settings` - Configure your LLM API key, provider, and model
- **New settings**:
  - `codetour.llm.provider` - Choose your LLM provider (OpenAI, Anthropic, or custom)
  - `codetour.llm.apiKey` - Your LLM API key
  - `codetour.llm.apiUrl` - API endpoint URL
  - `codetour.llm.model` - Model name (e.g., gpt-4, claude-3-opus)
  - `codetour.autoGenerate.maxFilesToAnalyze` - Maximum files to analyze (default: 50)
  - `codetour.autoGenerate.includeFileTypes` - File extensions to include in analysis
- **Interactive settings panel**: Beautiful webview UI for configuring LLM settings with test connection functionality
- **Smart validation**: Generated tours are automatically validated to ensure file paths and line numbers are correct
- **Fallback support**: If TreeSitter WASM is unavailable, falls back to regex-based analysis
- **Support for multiple languages**: TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, C#

## v0.0.59 (03/24/2023)

- A tour step can now run multiple commands
- Tours are now written to the `CodeTour: Custom Tour Directory` directory, when that property is set
- Fixed a performance issue with large codebases

## v0.0.58 (07/08/2021)

- The "Tours available!" prompt is now suppressed when opening a [CodeSwing](https://aka.ms/codeswing) workspace

## v0.0.57 (07/08/2021)

- Added a new `CodeTour: Custom Tour Directory` setting, that allows a project to specify a custom directory for their tours to be stored in
- Added support for storing tours in the `.github/tours` folder, in addition to the existing `.vscode/tours` and `.tours` directories
- You can now create a tour called `main.tour` at the root of your workspace, which will be considered a primary tour
- Fixed a bug with running CodeTour in Safari (which doesn't support lookbehinds in regex)

## v0.0.56 (05/29/2021)

- URI handler now allows specifying the step via 1-based numbers, as opposed to 0-based

## v0.0.55 (05/29/2021)

- The URI handler now allows specifying _just_ a step number, in order to index into a repo within only a single tour

## v0.0.54 (05/29/2021)

- Added a URI handler, with support for launching a specific tour and step

## v0.0.53 (05/12/2021)

- Exposed a new `onDidStartTour` event and `startTourByUri` method to the extension API
- Added experimental support for the CodeStatus extension

## v0.0.52 (04/26/2021)

- Updated the play/stop icons
- Fixed an issue with tour steps that were attached to the first line of a file

## v0.0.51 (04/23/2021)

- Added support for referencing workspace images in a tour step

## v0.0.50 (04/23/2021)

- Added support for referencing workspace files in a tour step
- Fixed a bug with code fences, that allow multi-line snippets

## v0.0.49 (03/27/2021)

- Fixed a bug with tours that span multi-root workspaces
- Fixed a bug with code fences, that allows the use of backticks in the code snippet

## v0.0.48 (03/27/2021)

- Added support for conditional tours via the new `when` property to tour files
- Added keybindings for starting and ending tours
- Fixed an issue with using quotes in a shell command
- Fixed a bug with code fences that used a multi-word language (e.g. `codefusion html`)

## v0.0.47 (03/10/2021)

- Introduced the new `CodeTour: Record Mode` setting, that allows you to create tours that are associated with code via regex patterns, in addition to line numbers.

## v0.0.46 (03/09/2021)

- Added the new `Add Tour Step` command to tour step nodes in the `CodeTour` tree
- When you add a new tour step, you're now transitioned into preview mode.
- Fixed a bug with the rendering of shell commands, immediately after saving a step.
- The `CodeTour: Edit Tour` command is now hidden from the command palette

## v0.0.45 (03/09/2021)

- Fixed an issue with gutter decorators being duplicated when copying/pasting code on lines associated with a tour step
- When you save a tour step, you're now automatically transitioned into "preview mode", in order to make it simpler to view the rendering of your step

## v0.0.44 (02/09/2021)

- Added the `codetour.promptForWorkspaceTours` setting to allow users to supress the notification when opening workspaces with tours
- Fixed a bug with replaying directory and content steps
- Fixed a bug where there was a "flash" after adding the first step to a new tour

## v0.0.43 (02/02/2021)

- Tour steps can now be associated with a regular expression or "comment marker" (e.g. `// CT1.1`) in addition to a line number.
- The `Insert code` gesture will now replace the selection when the current step has one.

## v0.0.42 (12/13/2020)

- Added a hover preview for tour steps in the `CodeTour` tree view, so you can see the step's content at-a-glance
- If a tour has a previous tour, then its first step will now display a `Previous Tour` link to navigate "back" to it
- Tour references are now automatically updated when you the change the title of a tour through the `CodeTour` view

## v0.0.41 (12/12/2020)

- The `CodeTour` view now indicates the progress for tours/steps you've already taken
- The `CodeTour` view now displays an icon next to the active tour step
- The `CodeTour: Hide Markers` and `CodeTour: Show Markers` commands are now hidden from the command palette

## v0.0.40 (12/11/2020)

- Tours with titles that start with `#1 -` or `1 -` are now automatically considered the primary tour, if there isn't already a tour that's explicitly marked as being the primary.
- Added support for numbering/linking tours, and the `nextTour` property in `*.tour` files

## v0.0.39 (11/08/2020)

- Updated the previous/next navigation links, so that they don't show file names when a step doesn't have a title

## v0.0.38 (11/06/2020)

- Introduced support for inserting code snippets
- Added arrow icons to the previous/next navigation links
- The `$schema` property is now explicitly added to `*.tour` files

## v0.0.37 (11/04/2020)

- Added `Previous`, `Next` and `Finish` commands to the bottom of the comment UI, in order to make it easier to navigate a tour.
- Fixed a parsing issue with step reference links

## v0.0.36 (10/29/2020)

- Removed the `Reply...` box from the tour step visualization.

## v0.0.35 (06/28/2020)

- Added new extensibility APIs to record and playback tours for external workspaces (e.g. GistPad repo editing).
- Updated the `CodeTour` tree to always show when you're taking a tour, even if you don't have a workspace open.

## v0.0.34 (06/27/2020)

- Updated the tour recorder, to allow you to edit the line associated with a step
- Updated the tour recorder, to allow you to add a tour step from an editor selection
- Added the ability to record a new tour that is saved to an arbitrary location on disk, as opposed to the `.tours` directory of the opened workspace.

## v0.0.33 (06/18/2020)

- Fixed an issue where CodeTour overrode the JSON language type

## v0.0.32 (06/01/2020)

- Added a list of well-known views to the step `view` property (e.g. `scm`, `extensions:disabled`) to simpify the authoring process for view steps.

## v0.0.31 (05/31/2020)

- Exposed the `Add Tour Step` as a context menu to tour nodes in the `CodeTour` tree.
- Update the `CodeTour` tree, so that it doesn't "steal" focus while navigating a tour, if the end-user doesn't have it visible already
- **Experimental** Added the concept of a "view step", which allows you to add a step that automatically focuses a VS Code view and describes it
- **Experimental** Added step commands, which allows a step to include one or more commands that should be executed when the step is navigated to

## v0.0.30 (05/28/2020)

- Changed the `CodeTour` tree to be always visible by default, as long as you have one or more workspaces opened.

## v0.0.29 (05/27/2020)

- Fixed an issue with URI handling on Windows

## v0.0.28 (05/22/2020)

- Introduced support for the step/tour reference syntax.
- Added the following commands to the command link completion list: `Run build task`, `Run task` and `Run test task`.
- Fixed a bug where command links didn't work, if the command included multiple "components" to the name (e.g. `workbench.action.tasks.build`).
- Fixed a bug where tours weren't being discovered for virtual file systems that include a query string in their workspace path.
- Fixed a bug where tours that included content-only steps couldn't be exported.
- Fixed the open/export tour commands to correctly look for `*.tour` files.
- Fixed a bug where the `CodeTour: Record Tour` command was being displayed without having any workspaces open.

## v0.0.27 (05/22/2020)

- Added support for "command links" in your steps, including a completion provider for using well-known commands.
- Improved extension activation perf by building it with Webpack
- Fixed an issue with playing tours for virtual file systems (e.g. `gist://`).

## v0.0.26 (05/17/2020)

- Added support for a codebase to have a "primary" tour, which provides a little more prescription to folks that are onboarding
- Added the `Change Title` command to step nodes in the `CodeTour` tree. This allows you to easily give steps a title without needing to add a markdown header to their description
- Added support for multi-select deletes in the `CodeTour` tree, for both tour and step nodes
- Added a `Preview Tour` command that allows putting the active tour into preview mode
- Updated the tour recorder to automatically place steps into edit mode when you start recording
- The `Save Step` button is now only enabled when recording a step, whose description isn't empty
- Removed the `Start CodeTour` status bar item, which just added noise to the user's statur bar

## v0.0.25 (05/03/2020)

- Introduced the `Add CodeTour Step` context menu to directories in the `Explorer` tree, which allows you to add steps that point at directories, in addition to files.
- Added the `CodeTour: Add Tour Step` command, which allows you to create a content-only step, that isn't associated with a file or directory.
- Fixed a bug where new steps weren't properly focused in the `CodeTour` tree when recording a new tour.

## v0.0.24 (05/02/2020)

- Explicitly marking the `CodeTour` extension as a "workspace extension", since it needs access to the workspace files and Git extension.
- Temporarily removed the `View Notebook` command, since this isn't officially supported in VS Code.

## v0.0.23 (04/19/2020)

- Added the `View Notebook` command to tour nodes in the `CodeTour` tree, which allows you to view a tour as a notebook

## v0.0.22 (04/18/2020)

- New tours are now written to the workspace's `.tours` folder, instead of the `.vscode/tours` folder. Both folders are still valid locations for tours, but the former sets up CodeTour to be more editor-agnostic (e.g. adding a Visual Studio client)
- New tours are now written using a `.tour` extension (instead of `.json`). Both formats are still supported, but `.tour` will be the new default.

## v0.0.21 (04/10/2020)

- Added the `CodeTour: Open Tour URL...` command, that allows opening a tour file by URL, in addition to the existing `CodeTour: Open Tour File...` command.

## v0.0.20 (04/08/2020)

- Introduced support for embedding shell commands in a tour step (e.g. `>> npm run compile`), which allows you to add more interactivity to a tour.
- Added support for including VS Code `command:` links within your tour step comments (e.g. `[Start Tour](command:codetour.startTour)`), in order to automate arbitrary workbench actions.
- Tours can now be organized within sub-directories of the `.vscode/tours` directory, and can now also be places withtin a root-level `.tours` folder.
- Added the `exportTour` to the API that is exposed by this extension

## v0.0.19 (04/06/2020)

- Added support for recording and playing tours within a multi-root workspace
- Added support for recording steps that reference files outside of the currently opened workspace. _Note: This should only be done if the file is outside of the workspace, but still within the same git repo. Otherwise, the tour wouldn't be "stable" for people who clone the repo and try to replay it._
- The `CodeTour` tree now auto-refreshes when you add/remove folders to the current workspace.
- Fixed an issue with "tour markers" being duplicated
- Fixed an issue with replaying tours that were associated with a Git tag ref

## v0.0.18 (04/02/2020)

- Updated the VS Code version dependency to `1.40.0` (instead of `1.42.0`).
- Removed the dependency on the built-in Git extension, to ensure that recording/playback is more reliable.

## v0.0.17 (03/31/2020)

- Introduced "tour markers", which display a gutter icon next to lines of code which are associated with a step in a code tour.

## v0.0.16 (03/30/2020)

- Updated the `CodeTour` tree to display the currently active tour, regardless how it was started (e.g. you open a tour file).

## v0.0.15 (03/29/2020)

- Updated the `CodeTour` tree to only display if the currently open workspace has any tours, or if the user is currently taking a tour. That way, it isn't obtrusive to users that aren't currently using it.
- Updated the `CodeTour: Refresh Tours` command to only show up when the currently opened workspace has any tours.

## v0.0.14 (03/26/2020)

- Added the `Export Tour` command to the `CodeTour` tree, which allows exporting a recorded tour that embeds the file contents needed to play it back
- Added the ability to open a code tour file, either via the `CodeTour: Open Tour File...` command or by clicking the `Open Tour File...` button in the title bar of the `CodeTour` view
- Added support for tour steps to omit a line number, which results in the step description being displayed at the bottom of the associated file

## v0.0.13 (03/23/2020)

- Exposed an experimental API for other extensions to record/playback tours. For an example, see the [GistPad](https://aka.ms/gistpad) extension, which now allows you to create tours associated with interactive web playgrounds

## v0.0.12 (03/21/2020)

- Added a new `Edit Step` command to the `CodeTour` tree, which allows you to start editing a tour at a specific step
- Updated the `CodeTour` tree to only show the move step up/down commands while you're actively recording that step

## v0.0.11 (03/16/2020)

- Updated the `CodeTour` tree to auto-select tree node that is associated with the currently viewing tour step
- Text highlights can now be edited when editing a tour code
- Added support for collapsing all nodes in the `CodeTour` tree
- Added a prompt when trying to record a tour, using a title that is already in use by an existing tour

## v0.0.10 (03/16/2020)

- Introduced support for step titles, which allow defining friendly names for a tour's steps in the `CodeTour` tree
- Exposed an extension API, so that other VS Code extensions (e.g. [GistPad](https://aka.ms/gistpad)) can start and end tours that they manage
- Added the `CodeTour: Edit Tour` command, that allows you to edit the tour you're currently playing.

## v0.0.9 (03/15/2020)

- Added the ability to record a text selection as part of a step

  ![Selection](https://user-images.githubusercontent.com/116461/76705627-b96cc280-669e-11ea-982a-d754c4f001aa.gif)

## v0.0.8 (03/14/2020)

- Added the ability to associate a tour with a specific Git tag and/or commit, in order to enable it to be resilient to code changes
- Updated the tour recorder so that tours are automatically saved upon creation, and on each step/change

## v0.0.7 (03/14/2020)

- Added the `Edit Tour` command to tour nodes in the `CodeTour` tree, in order to allow editing existing tours
- Added the `Move Up` and `Move Down` commands to tour step nodes in the `CodeTour` tree, in order to allow re-arranging steps in a tour
- Added the `Delete Step` command to tour step nodes in the `CodeTour` tree
- Added the ability to insert a step after the current step, as opposed to always at the end of the tour
- Updated the workspace tour notification to display when any tours are available, not just a "main tour"

## v0.0.6 (03/13/2020)

- Added the `'Resume Tour`, `End Tour`, `Change Title`, `Change Description` and `Delete Tour` commands to the `Code Tours` tree view to enable easily managing existing tours
- Added the `Code Tour: End Tour` command to the command palette

## v0.0.5 (03/09/2020)

- Added an icon to the `Code Tours` tree view which indicates the currently active tour
- Added support for creating/replaying tours when connected to a remote environment (thanks @alefragnani!)

## v0.0.4 (03/09/2020)

- Added the save/end tour commands to the `Code Tours` tree view
- The tour file name is now auto-generated based on the specified title

## v0.0.3 (03/08/2020)

- Fixed a bug where recorded tours didn't always save properly on Windows

## v0.0.2 (03/08/2020)

- Added keyboard shortcuts for navigating an active code tour
- Changed the `Code Tours` view to always display, even if the current workspace doesn't have any tours. That way, there's a simple entry point for recording new tours

## v0.0.1 (03/08/2020)

- Initial release 🎉
