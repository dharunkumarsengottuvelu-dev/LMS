const express = require('express');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/jobe/index.php/restapi/languages', (req, res) => {
  res.json([
    ["c", "11.4.0"],
    ["cpp", "11.4.0"],
    ["java", "21.0.2"],
    ["nodejs", "20.11.1"],
    ["python3", "3.11.2"]
  ]);
});

app.post('/jobe/index.php/restapi/runs', (req, res) => {
  try {
    const runSpec = req.body.run_spec;
    if (!runSpec || !runSpec.sourcecode || !runSpec.language_id) {
      return res.status(400).json({ error: "Invalid run_spec" });
    }

    const language = runSpec.language_id.toLowerCase();
    const code = runSpec.sourcecode;
    const stdin = runSpec.input || "";
    const tmpDir = os.tmpdir();
    const uniqueId = Date.now() + "_" + Math.floor(Math.random() * 10000);
    
    let result = {
      stdout: "",
      stderr: "",
      compile_output: "",
      outcome: 12,
      time: 0,
      memory: 0
    };

    if (language === "python" || language === "python3") {
      const tmpFile = path.join(tmpDir, `script_${uniqueId}.py`);
      fs.writeFileSync(tmpFile, code, 'utf-8');
      
      const proc = spawnSync("python3", [tmpFile], { input: stdin, encoding: 'utf-8', timeout: 5000 });
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      
      const isSuccess = proc.status === 0;
      result = {
        stdout: (proc.stdout || "").trim(),
        stderr: (proc.stderr || "").trim(),
        compile_output: "",
        outcome: isSuccess ? 15 : 12,
        time: 0.05, memory: 12000
      };
    } 
    else if (language === "java") {
      const workDir = path.join(tmpDir, `java_${uniqueId}`);
      fs.mkdirSync(workDir, { recursive: true });
      
      const publicClassMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
      const className = publicClassMatch ? publicClassMatch[1] : (classMatch ? classMatch[1] : "Solution");
      
      const tmpJavaFile = path.join(workDir, `${className}.java`);
      fs.writeFileSync(tmpJavaFile, code, 'utf-8');
      
      const compileProc = spawnSync("javac", [tmpJavaFile], { cwd: workDir, encoding: 'utf-8', timeout: 10000 });
      
      if (compileProc.status === 0) {
        const runProc = spawnSync("java", ["-cp", workDir, className], { input: stdin, encoding: 'utf-8', timeout: 5000 });
        const isSuccess = runProc.status === 0;
        result = {
          stdout: (runProc.stdout || "").trim(),
          stderr: (runProc.stderr || "").trim(),
          compile_output: "",
          outcome: isSuccess ? 15 : 12,
          time: 0.08, memory: 24000
        };
      } else {
        result = {
          stdout: "",
          stderr: (compileProc.stderr || compileProc.stdout || "").trim(),
          compile_output: (compileProc.stderr || compileProc.stdout || "").trim(),
          outcome: 11,
          time: 0, memory: 0
        };
      }
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
    }
    else if (language === "cpp" || language === "c++" || language === "c") {
      const workDir = path.join(tmpDir, `c_${uniqueId}`);
      fs.mkdirSync(workDir, { recursive: true });
      const isC = language === "c";
      const tmpFile = path.join(workDir, isC ? "main.c" : "main.cpp");
      const exeFile = path.join(workDir, "main.out");
      fs.writeFileSync(tmpFile, code, 'utf-8');
      
      const compiler = isC ? "gcc" : "g++";
      const compileProc = spawnSync(compiler, ["-O2", tmpFile, "-o", exeFile], { cwd: workDir, encoding: 'utf-8', timeout: 10000 });
      
      if (compileProc.status === 0 && fs.existsSync(exeFile)) {
        const runProc = spawnSync(exeFile, [], { input: stdin, encoding: 'utf-8', timeout: 5000 });
        const isSuccess = runProc.status === 0;
        result = {
          stdout: (runProc.stdout || "").trim(),
          stderr: (runProc.stderr || "").trim(),
          compile_output: "",
          outcome: isSuccess ? 15 : 12,
          time: 0.02, memory: 8000
        };
      } else {
        result = {
          stdout: "",
          stderr: (compileProc.stderr || compileProc.stdout || "").trim(),
          compile_output: (compileProc.stderr || compileProc.stdout || "").trim(),
          outcome: 11,
          time: 0, memory: 0
        };
      }
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
    }
    else {
      result.outcome = 12;
      result.stderr = "Language not supported by this lightweight compiler server.";
    }

    res.json({
      run_id: `run_${uniqueId}`,
      outcome: result.outcome,
      cmpinfo: result.compile_output,
      stdout: result.stdout,
      stderr: result.stderr,
      time: result.time,
      memory: result.memory
    });
  } catch (err) {
    res.status(500).json({ error: "Execution failed completely" });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Compiler server running on port ${port}`);
});
