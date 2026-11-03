const fs = require("fs");
const path = require("path");
const ts = require("d:/LMS/enterprise-lms/node_modules/typescript");

const srcRoot = path.resolve("d:/LMS/enterprise-lms/src");

require.extensions[".ts"] = function(module, filename) {
  let source = fs.readFileSync(filename, "utf8");
  const dir = path.dirname(filename);

  source = source.replace(/from\s+["']@\/([^"']+)["']/g, (m, p) => {
    let rel = path.relative(dir, path.join(srcRoot, p)).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `from "${rel}"`;
  });

  source = source.replace(/import\s*\(\s*["']@\/([^"']+)["']\s*\)/g, (m, p) => {
    let rel = path.relative(dir, path.join(srcRoot, p)).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `import("${rel}")`;
  });

  source = source.replace(/require\s*\(\s*["']@\/([^"']+)["']\s*\)/g, (m, p) => {
    let rel = path.relative(dir, path.join(srcRoot, p)).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `require("${rel}")`;
  });

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    }
  });

  module._compile(transpiled.outputText, filename);
};

const { runRegressionTests } = require("./test-compiler-regression.ts");

runRegressionTests().then((success) => {
  if (!success) {
    process.exit(1);
  }
}).catch((err) => {
  console.error("Unhandled regression test error:", err);
  process.exit(1);
});

