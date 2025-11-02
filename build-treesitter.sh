#!/bin/bash
set -e

echo "========================================================="
echo "CodeTour v1.0.10 - Analyze ALL Source Files!"
echo "========================================================="
echo ""

cd /Users/saurabh_sharmila_nysa_mac/Desktop/Saurabh_OSS/codetour

echo "Step 0/7: Cleaning old native dependencies..."
rm -rf node_modules/tree-sitter node_modules/tree-sitter-* 2>/dev/null
echo "✓ Cleaned native packages"
echo ""

echo "Step 1/7: Installing dependencies..."
echo "  (web-tree-sitter + tree-sitter-wasms - NO compilation!)"
npm install
echo "✓ Dependencies installed"
echo ""

echo "Step 2/7: Verifying WASM files..."
if [ -f "node_modules/web-tree-sitter/tree-sitter.wasm" ]; then
    echo "  ✓ tree-sitter.wasm found"
else
    echo "  ❌ tree-sitter.wasm NOT found!"
    exit 1
fi

if [ -f "node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm" ]; then
    echo "  ✓ tree-sitter-typescript.wasm found"
else
    echo "  ⚠️  tree-sitter-typescript.wasm not found"
fi

if [ -f "node_modules/tree-sitter-wasms/out/tree-sitter-javascript.wasm" ]; then
    echo "  ✓ tree-sitter-javascript.wasm found"
else
    echo "  ⚠️  tree-sitter-javascript.wasm not found"
fi

if [ -f "node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm" ]; then
    echo "  ✓ tree-sitter-python.wasm found"
else
    echo "  ⚠️  tree-sitter-python.wasm not found"
fi

echo "  ℹ️  Available WASM files:"
ls -la node_modules/tree-sitter-wasms/out/*.wasm 2>/dev/null | awk '{print "    - " $NF}'
echo ""

echo "Step 3/7: Type checking..."
npx tsc --noEmit
echo "✓ No TypeScript errors"
echo ""

echo "Step 4/7: Cleaning old builds..."
rm -f *.vsix
rm -rf dist
echo "✓ Cleaned"
echo ""

echo "Step 5/7: Building with Webpack..."
npm run build
echo "✓ Build complete"
echo ""

echo "Step 6/7: Verifying WASM files in dist..."
echo "  Checking dist/tree-sitter.wasm..."
if [ -f "dist/tree-sitter.wasm" ]; then
    ls -lh dist/tree-sitter.wasm
else
    echo "  ❌ tree-sitter.wasm not copied to dist!"
    exit 1
fi

echo "  Checking dist/grammars/*.wasm..."
ls -lh dist/grammars/*.wasm 2>/dev/null || echo "  ⚠️  No grammar files in dist/grammars/"
echo ""

echo "Step 7/7: Packaging VSIX..."
npm run package
echo "✓ Package created"
echo ""

if [ -f "codetour-1.0.10.vsix" ]; then
    echo "========================================================="
    echo "✅ SUCCESS! CodeTour v1.0.10 - UNLIMITED ANALYSIS!"
    echo "========================================================="
    echo ""
    ls -lh codetour-1.0.10.vsix
    echo ""
    echo "🚀 NEW in v1.0.10:"
    echo "  ✅ UNLIMITED analysis by default (maxFilesToAnalyze = 0)"
    echo "  ✅ Analyzes ENTIRE codebase (all source files!)"
    echo "  ✅ Smart filtering DURING file discovery (not after)"
    echo "  ✅ Auto-excludes: tests, node_modules, build, configs"
    echo ""
    echo "🧹 Auto-Excluded Patterns:"
    echo "  - 📁 Build: dist/, build/, out/, .next/, coverage/"
    echo "  - 🧪 Tests: *.test.*, *.spec.*, __tests__/, test/"
    echo "  - 📦 Deps: node_modules/"
    echo "  - 🔧 Other: *.config.*, *.d.ts, *.min.*, .generated.*"
    echo "  - 🗂️  IDE: .vscode/, .idea/, .git/"
    echo ""
    echo "💪 Benefits:"
    echo "  ✅ Analyzes ALL source code (no 200-file limit!)"
    echo "  ✅ Faster (skips noise files during discovery)"
    echo "  ✅ Cleaner tours (no test/config file noise)"
    echo "  ✅ Better coverage (complete codebase understanding)"
    echo ""
    echo "🔥 All Features:"
    echo "  ✅ Unlimited analysis (set 200/500 if needed)"
    echo "  ✅ Smart README cleaning (no ads/sponsors)"
    echo "  ✅ Functional welcome pages (what/how it works)"
    echo "  ✅ TreeSitter AST + Concurrent batches"
    echo "  ✅ Welcome always appears as step #1"
    echo ""
    echo "📦 Install: Extensions → ⋯ → Install from VSIX → codetour-1.0.10.vsix"
else
    echo "❌ ERROR: VSIX file not created"
    exit 1
fi

