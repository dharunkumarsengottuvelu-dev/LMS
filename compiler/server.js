const express = require('express');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check endpoints for Render and monitoring
app.get('/', (req, res) => {
  res.json({
    service: "Sensilearn Compiler Engine",
    status: "operational",
    version: "1.1.0",
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Standard Jobe REST API language catalogue
app.get('/jobe/index.php/restapi/languages', (req, res) => {
  res.json([
    ["c", "11.4.0"],
    ["cpp", "11.4.0"],
    ["java", "21.0.2"],
    ["nodejs", "20.11.1"],
    ["python3", "3.11.2"]
  ]);
});

// Standard Jobe REST API code run execution
app.post('/jobe/index.php/restapi/runs', (req, res) => {
  try {
    const runSpec = req.body.run_spec;
    if (!runSpec || !runSpec.sourcecode || !runSpec.language_id) {
      return res.status(400).json({ error: "Invalid run_spec: sourcecode and language_id required" });
    }

    const language = runSpec.language_id.toLowerCase().trim();
    const code = runSpec.sourcecode;
    const stdin = runSpec.input || "";
    const tmpDir = os.tmpdir();
    const uniqueId = Date.now() + "_" + Math.floor(Math.random() * 100000);

    // Dynamic execution timeout (default 5s, capped between 2s and 15s)
    const timeoutSec = Math.min(Math.max(Number(runSpec.parameters?.cputime || 5), 2), 15);
    const timeoutMs = timeoutSec * 1000;
    
    let result = {
      stdout: "",
      stderr: "",
      compile_output: "",
      outcome: 12, // 15=Accepted, 11=Compile Error, 12=Runtime Error, 13=Time Limit Exceeded
      time: 0,
      memory: 0
    };

    const startTime = Date.now();

    if (language === "python" || language === "python3") {
      const tmpFile = path.join(tmpDir, `script_${uniqueId}.py`);
      fs.writeFileSync(tmpFile, code, 'utf-8');
      
      const proc = spawnSync("python3", [tmpFile], { input: stdin, encoding: 'utf-8', timeout: timeoutMs });
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      if (proc.error && (proc.error.code === 'ETIMEDOUT' || proc.error.message.includes('TIMEDOUT'))) {
        result = {
          stdout: "",
          stderr: "Time Limit Exceeded: Process execution took longer than permitted time limit.",
          compile_output: "",
          outcome: 13,
          time: Number(elapsed),
          memory: 18000
        };
      } else {
        const isSuccess = proc.status === 0;
        result = {
          stdout: (proc.stdout || "").trimEnd(),
          stderr: (proc.stderr || "").trimEnd(),
          compile_output: "",
          outcome: isSuccess ? 15 : 12,
          time: Number(elapsed),
          memory: 18000
        };
      }
    } 
    else if (language === "nodejs" || language === "javascript" || language === "js" || language === "node") {
      const tmpFile = path.join(tmpDir, `script_${uniqueId}.js`);
      fs.writeFileSync(tmpFile, code, 'utf-8');
      
      const proc = spawnSync("node", [tmpFile], { input: stdin, encoding: 'utf-8', timeout: timeoutMs });
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      if (proc.error && (proc.error.code === 'ETIMEDOUT' || proc.error.message.includes('TIMEDOUT'))) {
        result = {
          stdout: "",
          stderr: "Time Limit Exceeded: Process execution took longer than permitted time limit.",
          compile_output: "",
          outcome: 13,
          time: Number(elapsed),
          memory: 24000
        };
      } else {
        const isSuccess = proc.status === 0;
        result = {
          stdout: (proc.stdout || "").trimEnd(),
          stderr: (proc.stderr || "").trimEnd(),
          compile_output: "",
          outcome: isSuccess ? 15 : 12,
          time: Number(elapsed),
          memory: 24000
        };
      }
    }
    else if (language === "java") {
      const workDir = path.join(tmpDir, `java_${uniqueId}`);
      fs.mkdirSync(workDir, { recursive: true });
      
      const publicClassMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
      const className = publicClassMatch ? publicClassMatch[1] : (classMatch ? classMatch[1] : "Main");
      
      const tmpJavaFile = path.join(workDir, `${className}.java`);
      fs.writeFileSync(tmpJavaFile, code, 'utf-8');
      
      const compileProc = spawnSync("javac", [tmpJavaFile], { cwd: workDir, encoding: 'utf-8', timeout: 15000 });
      
      if (compileProc.status === 0) {
        const execStart = Date.now();
        const runProc = spawnSync("java", ["-cp", workDir, className], { input: stdin, encoding: 'utf-8', timeout: timeoutMs });
        const elapsed = ((Date.now() - execStart) / 1000).toFixed(2);

        if (runProc.error && (runProc.error.code === 'ETIMEDOUT' || runProc.error.message.includes('TIMEDOUT'))) {
          result = {
            stdout: "",
            stderr: "Time Limit Exceeded: Process execution took longer than permitted time limit.",
            compile_output: "",
            outcome: 13,
            time: Number(elapsed),
            memory: 32000
          };
        } else {
          const isSuccess = runProc.status === 0;
          result = {
            stdout: (runProc.stdout || "").trimEnd(),
            stderr: (runProc.stderr || "").trimEnd(),
            compile_output: "",
            outcome: isSuccess ? 15 : 12,
            time: Number(elapsed),
            memory: 32000
          };
        }
      } else {
        result = {
          stdout: "",
          stderr: (compileProc.stderr || compileProc.stdout || "").trimEnd(),
          compile_output: (compileProc.stderr || compileProc.stdout || "").trimEnd(),
          outcome: 11,
          time: 0,
          memory: 0
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
      const stdFlag = isC ? "-std=c17" : "-std=c++20";
      const compileProc = spawnSync(compiler, [stdFlag, "-O2", tmpFile, "-o", exeFile], { cwd: workDir, encoding: 'utf-8', timeout: 15000 });
      
      if (compileProc.status === 0 && fs.existsSync(exeFile)) {
        const execStart = Date.now();
        const runProc = spawnSync(exeFile, [], { input: stdin, encoding: 'utf-8', timeout: timeoutMs });
        const elapsed = ((Date.now() - execStart) / 1000).toFixed(2);

        if (runProc.error && (runProc.error.code === 'ETIMEDOUT' || runProc.error.message.includes('TIMEDOUT'))) {
          result = {
            stdout: "",
            stderr: "Time Limit Exceeded: Process execution took longer than permitted time limit.",
            compile_output: "",
            outcome: 13,
            time: Number(elapsed),
            memory: 12000
          };
        } else {
          const isSuccess = runProc.status === 0;
          result = {
            stdout: (runProc.stdout || "").trimEnd(),
            stderr: (runProc.stderr || "").trimEnd(),
            compile_output: "",
            outcome: isSuccess ? 15 : 12,
            time: Number(elapsed),
            memory: 12000
          };
        }
      } else {
        result = {
          stdout: "",
          stderr: (compileProc.stderr || compileProc.stdout || "").trimEnd(),
          compile_output: (compileProc.stderr || compileProc.stdout || "").trimEnd(),
          outcome: 11,
          time: 0,
          memory: 0
        };
      }
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
    }
    else {
      result.outcome = 12;
      result.stderr = `Language '${language}' is not supported by this compiler server.`;
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
    res.status(500).json({ error: "Execution failed completely: " + (err ? err.message : "") });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Compiler server running on port ${port}`);
});
