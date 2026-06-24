#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const SKILL_NAME = "tokens-xyz-skill";
const HOME_DIR = os.homedir();
const PERSONAL_DIR = path.join(HOME_DIR, ".claude", "skills", SKILL_NAME);
const PROJECT_DIR = path.join(process.cwd(), ".claude", "skills", SKILL_NAME);

// Get package source files path mapping
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PACKAGE_ROOT = path.join(__dirname, "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Parse flag arguments
const isNonInteractive =
  process.argv.includes("-y") || process.argv.includes("--yes");

// Helpers matching your original layout
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

async function main() {
  console.log("\n  ╔══════════════════════════════════════════╗");
  console.log("  ║   tokens-xyz-skill installer             ║");
  console.log("  ║   Tokens.xyz Asset Intelligence          ║");
  console.log("  ╚══════════════════════════════════════════╝\n");

  let installDir = PERSONAL_DIR;

  // ── Target Location Selection ───────────────────────────────────────────────
  if (!isNonInteractive) {
    console.log("  Where do you want to install?");
    console.log(`  1) Personal  → ${PERSONAL_DIR}`);
    console.log(`  2) Project   → ${PROJECT_DIR}`);
    console.log("  3) Custom path");

    const choice = await askQuestion("   Choice [1]: ");
    const sanitizedChoice = choice.trim() || "1";

    if (sanitizedChoice === "2") {
      installDir = PROJECT_DIR;
    } else if (sanitizedChoice === "3") {
      const customPath = await askQuestion("   Enter path: ");
      installDir = customPath.trim().replace(/^~/, HOME_DIR);
    }
  }

  installDir = path.resolve(installDir);
  info(`Installing to: ${installDir}`);
  fs.mkdirSync(installDir, { recursive: true });

  // ── Copy Core Skill Directories ────────────────────────────────────────────
  const dirsToCopy = ["skill", "commands", "agents", "rules"];
  dirsToCopy.forEach((dir) => {
    const src = path.join(PACKAGE_ROOT, dir);
    const dest = path.join(installDir, dir);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  });
  success("Skill files installed");

  // ── CLAUDE.md Handling ──────────────────────────────────────────────────────
  if (await confirm("Copy CLAUDE.md to ~/.claude/?")) {
    const claudeHomeDir = path.join(HOME_DIR, ".claude");
    fs.mkdirSync(claudeHomeDir, { recursive: true });
    const targetClaudeMd = path.join(claudeHomeDir, "CLAUDE.md");
    const sourceClaudeMd = path.join(PACKAGE_ROOT, "CLAUDE.md");

    if (fs.existsSync(sourceClaudeMd)) {
      if (fs.existsSync(targetClaudeMd)) {
        warn("CLAUDE.md already exists — appending tokens-xyz-skill section");
        const appendContent = fs.readFileSync(sourceClaudeMd, "utf8");
        fs.appendFileSync(targetClaudeMd, `\n\n${appendContent}`);
      } else {
        fs.cpSync(sourceClaudeMd, targetClaudeMd);
      }
      success("CLAUDE.md updated");
    }
  }

  // ── .env Secret Management Setup ───────────────────────────────────────────
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

  // ── .gitignore Hardening ────────────────────────────────────────────────────
  const gitignoreFile = path.join(process.cwd(), ".gitignore");
  const safetyEntries = [".env", ".env.local", ".env.*.local"];
  let missingEntries = [...safetyEntries];

  if (fs.existsSync(gitignoreFile)) {
    const gitignoreContent = fs
      .readFileSync(gitignoreFile, "utf8")
      .split("\n")
      .map((line) => line.trim());
    missingEntries = safetyEntries.filter(
      (entry) => !gitignoreContent.includes(entry),
    );
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

  // ── End of Line Wrap Up ─────────────────────────────────────────────────────
  console.log("\n  ╔══════════════════════════════════════════╗");
  console.log("  ║   Installation complete! 🎉              ║");
  console.log("  ╚══════════════════════════════════════════╝\n");
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
