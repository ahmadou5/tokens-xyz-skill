#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const SKILL_NAME = "tokens-xyz-skill";
const HOME_DIR = os.homedir();

// Agent config map — where each agent looks for skills/context
const AGENTS = {
  1: {
    name: "Claude Code",
    configDir: path.join(HOME_DIR, ".claude"),
    skillsDir: path.join(HOME_DIR, ".claude", "skills", SKILL_NAME),
    configFile: "CLAUDE.md",
    sectionHeader: "## Tokens.xyz Skill",
    registerStyle: "append-md",
  },
  2: {
    name: "Codex",
    configDir: path.join(HOME_DIR, ".agents"),
    skillsDir: path.join(HOME_DIR, ".agents", "skills", SKILL_NAME),
    configFile: "AGENTS.md",
    sectionHeader: "## Tokens.xyz Skill",
    registerStyle: "append-md",
  },
  3: {
    name: "Cursor",
    configDir: path.join(process.cwd(), ".cursor"),
    skillsDir: path.join(process.cwd(), ".cursor", "skills", SKILL_NAME),
    configFile: "rules",
    sectionHeader: null,
    registerStyle: "cursor-rules",
  },
  4: {
    name: "Other / Custom",
    configDir: null,
    skillsDir: null,
    configFile: null,
    sectionHeader: "## Tokens.xyz Skill",
    registerStyle: "append-md",
  },
};

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PACKAGE_ROOT = path.join(__dirname, "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const isNonInteractive =
  process.argv.includes("-y") || process.argv.includes("--yes");

const info = (msg) => console.log(`  ℹ️  ${msg}`);
const success = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const error = (msg) => {
  console.error(`  ❌ ${msg}`);
  process.exit(1);
};

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function confirm(promptText) {
  if (isNonInteractive) return true;
  const reply = await askQuestion(`   ${promptText} [Y/n] `);
  return reply.trim() === "" || /^[Yy]$/.test(reply.trim());
}

function copySkillFiles(installDir) {
  fs.mkdirSync(installDir, { recursive: true });
  for (const dir of ["skill", "commands", "agents", "rules"]) {
    const src = path.join(PACKAGE_ROOT, dir);
    const dest = path.join(installDir, dir);
    if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
  }
  success("Skill files installed");
}

function registerAppendMd(agent, installDir) {
  // Claude Code, Codex, and custom agents — append a section to their .md config
  const configPath = path.join(agent.configDir, agent.configFile);
  fs.mkdirSync(agent.configDir, { recursive: true });

  const entryPoint = path.join(installDir, "skill", "SKILL.md");

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    if (content.includes(agent.sectionHeader)) {
      info(
        `${agent.sectionHeader} already exists in ${agent.configFile}. Skipping.`,
      );
      return;
    }
    warn(
      `${agent.configFile} already exists — appending tokens-xyz-skill section`,
    );
  }

  const block = `\n\n${agent.sectionHeader}\nSkill for Tokens.xyz asset intelligence.\nEntry point: \`${entryPoint}\`\n`;
  fs.appendFileSync(configPath, block);
  success(`Appended configuration to ${configPath}`);
}

function registerCursor(agent, installDir) {
  // Cursor reads individual files from .cursor/rules/
  const rulesDir = path.join(agent.configDir, "rules");
  const ruleFile = path.join(rulesDir, "tokens-xyz-skill.md");
  const entryPoint = path.join(installDir, "skill", "SKILL.md");

  fs.mkdirSync(rulesDir, { recursive: true });

  if (fs.existsSync(ruleFile)) {
    info(`${ruleFile} already exists. Skipping.`);
    return;
  }

  const content = `# Tokens.xyz Skill\nSkill for Tokens.xyz asset intelligence.\nEntry point: \`${entryPoint}\`\n`;
  fs.writeFileSync(ruleFile, content);
  success(`Wrote Cursor rule to ${ruleFile}`);
}

async function main() {
  console.log("\n  ╔══════════════════════════════════════════╗");
  console.log("  ║   tokens-xyz-skill installer             ║");
  console.log("  ║   Tokens.xyz Asset Intelligence          ║");
  console.log("  ╚══════════════════════════════════════════╝\n");

  // ── Step 1: Pick agent ──────────────────────────────────────────────────────
  let agentKey = 1; // default: Claude Code
  if (!isNonInteractive) {
    console.log("  Which agent are you installing for?\n");
    for (const [key, a] of Object.entries(AGENTS)) {
      console.log(`    ${key}) ${a.name}`);
    }
    const input = await askQuestion("\n  Choice [1]: ");
    agentKey = parseInt(input.trim() || "1", 10);
    if (!AGENTS[agentKey]) error("Invalid choice.");
  }

  const agent = { ...AGENTS[agentKey] };

  // ── Step 2: Resolve custom paths for "Other" ────────────────────────────────
  if (agentKey === 4) {
    const customConfig = await askQuestion(
      "  Config directory (e.g. ~/.myagent): ",
    );
    agent.configDir = customConfig.trim().replace(/^~/, HOME_DIR);
    agent.skillsDir = path.join(agent.configDir, "skills", SKILL_NAME);
    const customFile = await askQuestion("  Config filename (e.g. AGENT.md): ");
    agent.configFile = customFile.trim() || "AGENT.md";
  }

  // ── Step 3: Confirm or override install path ────────────────────────────────
  let installDir = agent.skillsDir;
  if (!isNonInteractive) {
    console.log("\n  Where do you want to install the skill files?");
    console.log(`  1) Default  → ${agent.skillsDir}`);
    console.log(
      `  2) Project  → ${path.join(process.cwd(), ".claude", "skills", SKILL_NAME)}`,
    );
    console.log("  3) Custom path");
    const locChoice = await askQuestion("   Choice [1]: ");
    if (locChoice.trim() === "2") {
      installDir = path.join(process.cwd(), ".claude", "skills", SKILL_NAME);
    } else if (locChoice.trim() === "3") {
      const custom = await askQuestion("   Enter path: ");
      installDir = custom.trim().replace(/^~/, HOME_DIR);
    }
  }

  installDir = path.resolve(installDir);
  info(`Installing to: ${installDir}`);

  // ── Step 4: Copy skill files ────────────────────────────────────────────────
  copySkillFiles(installDir);

  // ── Step 5: Register with agent config ─────────────────────────────────────
  if (agent.registerStyle === "cursor-rules") {
    registerCursor(agent, installDir);
  } else {
    if (await confirm(`Register skill in ${agent.configFile}?`)) {
      registerAppendMd(agent, installDir);
    }
  }

  // ── Step 6: API key setup (.env) ────────────────────────────────────────────
  console.log("\n  ┌─────────────────────────────────────────────────────┐");
  console.log("  │  API Key Setup (Required)                           │");
  console.log("  └─────────────────────────────────────────────────────┘\n");
  console.log("  This skill requires a Tokens.xyz API key.\n");
  console.log("  How to get one:");
  console.log("    1. Go to https://tokens.xyz");
  console.log("    2. Request API access (approved within 24h)");
  console.log("    3. Find your key in the API Manager dashboard");
  console.log("    4. If your key is 'legacy hash-only', regenerate it");
  console.log("       (the old key deactivates immediately)\n");

  const envFile = path.join(process.cwd(), ".env");
  const envTemplate =
    "# Tokens.xyz API Key\n# Get yours at: https://tokens.xyz → API Manager\n# NEVER commit this file to git\nTOKENS_XYZ_API_KEY=your_key_here\n";

  if (!fs.existsSync(envFile)) {
    if (await confirm("Create a .env file in the current directory?")) {
      fs.writeFileSync(envFile, envTemplate);
      success(".env created — add your key to TOKENS_XYZ_API_KEY");
    }
  } else {
    const currentEnv = fs.readFileSync(envFile, "utf8");
    if (!currentEnv.includes("TOKENS_XYZ_API_KEY")) {
      fs.appendFileSync(
        envFile,
        `\n# Tokens.xyz API Key — get yours at: https://tokens.xyz → API Manager\nTOKENS_XYZ_API_KEY=your_key_here\n`,
      );
      success("TOKENS_XYZ_API_KEY added to existing .env");
    } else {
      info(".env already has TOKENS_XYZ_API_KEY — skipping");
    }
  }

  // ── Step 7: .gitignore hardening ────────────────────────────────────────────
  const gitignoreFile = path.join(process.cwd(), ".gitignore");
  const safetyEntries = [".env", ".env.local", ".env.*.local"];
  let missingEntries = [...safetyEntries];

  if (fs.existsSync(gitignoreFile)) {
    const existing = fs
      .readFileSync(gitignoreFile, "utf8")
      .split("\n")
      .map((l) => l.trim());
    missingEntries = safetyEntries.filter((e) => !existing.includes(e));
  }

  if (missingEntries.length > 0) {
    if (await confirm("Add .env entries to .gitignore?")) {
      const appendText =
        (fs.existsSync(gitignoreFile) ? "\n" : "") +
        missingEntries.join("\n") +
        "\n";
      fs.appendFileSync(gitignoreFile, appendText);
      success(
        ".gitignore updated (protects your API key from being committed)",
      );
    } else {
      warn("Make sure .env is in your .gitignore before committing!");
    }
  } else {
    success(".gitignore already protects .env files");
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  console.log("\n  ╔══════════════════════════════════════════╗");
  console.log("  ║   Installation complete! 🎉              ║");
  console.log("  ╚══════════════════════════════════════════╝\n");
  console.log(`  Agent:      ${agent.name}`);
  console.log("  Next steps:");
  console.log("  1. Add your key to .env: TOKENS_XYZ_API_KEY=your_key_here");
  console.log("  2. Load .env in your app (dotenv / python-dotenv)");
  console.log("  3. Try: /token-check solana\n");
  console.log(`  Skill docs: ${path.join(installDir, "skill", "SKILL.md")}`);
  console.log("  API docs:   https://docs.tokens.xyz/v1/quickstart\n");

  rl.close();
}

main().catch((err) => {
  error(`Installation aborted: ${err.message}`);
  rl.close();
});
