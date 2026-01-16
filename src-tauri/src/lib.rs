use flate2::read::ZlibDecoder;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Read;
use std::path::PathBuf;
use std::process::Command;
use std::sync::RwLock;
use walkdir::WalkDir;

// ==================== APP SETTINGS (CONFIGURABLE) ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub vault_path: String,
    pub truth_repo_path: String,
    pub api_mode: String,  // "remote" or "local"
    pub api_url: String,
    pub default_risk_profile: String,
    pub terminal_font_size: u32,
    pub auto_save_audit: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_default();
        Self {
            vault_path: home.join("Documents/Obsidian Vault").to_string_lossy().to_string(),
            truth_repo_path: home.join("Almacen_IA/LumenSyntax-Main/.truth").to_string_lossy().to_string(),
            api_mode: "local".to_string(),  // LOCAL-FIRST by default
            api_url: "https://truthgit-api-342668283383.us-central1.run.app".to_string(),
            default_risk_profile: "medium".to_string(),
            terminal_font_size: 14,
            auto_save_audit: true,
        }
    }
}

// Global settings (thread-safe)
static SETTINGS: std::sync::LazyLock<RwLock<AppSettings>> = std::sync::LazyLock::new(|| {
    RwLock::new(load_settings_from_file().unwrap_or_default())
});

fn get_settings_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("truthgit")
        .join("settings.json")
}

fn load_settings_from_file() -> Option<AppSettings> {
    let path = get_settings_path();
    if path.exists() {
        let content = fs::read_to_string(&path).ok()?;
        serde_json::from_str(&content).ok()
    } else {
        None
    }
}

fn save_settings_to_file(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
async fn get_settings() -> Result<AppSettings, String> {
    let settings = SETTINGS.read().map_err(|e| format!("Lock error: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
async fn update_settings(new_settings: AppSettings) -> Result<(), String> {
    save_settings_to_file(&new_settings)?;
    let mut settings = SETTINGS.write().map_err(|e| format!("Lock error: {}", e))?;
    *settings = new_settings;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GovernanceResult {
    pub status: String,
    pub action: String,
    pub confidence: f64,
    pub reason: String,
    pub audit_ref: String,
    pub ontological_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TruthGitResponse {
    success: bool,
    data: Option<GovernanceResult>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claim {
    pub content: String,
    pub confidence: f64,
    pub category: String,
    pub domain: String,
    pub state: String,
    #[serde(rename = "$hash")]
    pub hash: String,
    #[serde(rename = "$type")]
    pub claim_type: String,
    pub metadata: ClaimMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimMetadata {
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TruthRepoStatus {
    pub exists: bool,
    pub path: String,
    pub claims_count: usize,
    pub head_ref: Option<String>,
    pub has_keys: bool,
}

fn get_truth_path() -> Option<PathBuf> {
    // Use configurable path from settings
    let settings = SETTINGS.read().ok()?;
    let path = PathBuf::from(&settings.truth_repo_path);
    Some(path)
}

fn get_vault_path() -> Option<PathBuf> {
    // Use configurable path from settings
    let settings = SETTINGS.read().ok()?;
    let path = PathBuf::from(&settings.vault_path);
    Some(path)
}

fn decompress_object(path: &PathBuf) -> Result<serde_json::Value, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let mut decoder = ZlibDecoder::new(file);
    let mut decompressed = String::new();
    decoder
        .read_to_string(&mut decompressed)
        .map_err(|e| format!("Failed to decompress: {}", e))?;

    serde_json::from_str(&decompressed)
        .map_err(|e| format!("Failed to parse JSON: {}", e))
}

#[tauri::command]
async fn governance_verify(
    claim: String,
    domain: String,
    risk_profile: String,
) -> Result<GovernanceResult, String> {
    // Read settings in a block to ensure lock is released before any await
    let (api_mode, api_url) = {
        let settings = SETTINGS.read().map_err(|e| format!("Settings lock error: {}", e))?;
        (settings.api_mode.clone(), settings.api_url.clone())
    };

    // LOCAL-FIRST: Use TruthGit CLI when api_mode is "local"
    if api_mode == "local" {
        return governance_verify_local(&claim, &domain, &risk_profile).await;
    }

    // Remote API mode
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/governance/verify", api_url))
        .json(&serde_json::json!({
            "claim": claim,
            "domain": domain,
            "risk_profile": risk_profile,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to TruthGit API: {}", e))?;

    let result: TruthGitResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(data) = result.data {
        Ok(data)
    } else {
        Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
    }
}

// Local governance verification using TruthGit CLI
async fn governance_verify_local(claim: &str, domain: &str, risk_profile: &str) -> Result<GovernanceResult, String> {
    let output = Command::new("truthgit")
        .args(["safe-verify", claim, "--domain", domain, "--risk", risk_profile, "--json"])
        .output()
        .map_err(|e| format!("Failed to run truthgit CLI: {}. Is TruthGit installed?", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse JSON output from TruthGit CLI
        let parsed: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| format!("Failed to parse TruthGit output: {}", e))?;

        Ok(GovernanceResult {
            status: parsed.get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("UNKNOWN")
                .to_string(),
            action: parsed.get("action")
                .and_then(|v| v.as_str())
                .unwrap_or("escalate")
                .to_string(),
            confidence: parsed.get("confidence")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            reason: parsed.get("reason")
                .and_then(|v| v.as_str())
                .unwrap_or("Local verification completed")
                .to_string(),
            audit_ref: parsed.get("audit_ref")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            ontological_type: parsed.get("ontological_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("TruthGit verification failed: {}", stderr))
    }
}

#[tauri::command]
async fn list_claims() -> Result<Vec<serde_json::Value>, String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;
    let claims_dir = truth_path.join("objects/cl");

    if !claims_dir.exists() {
        return Ok(vec![]);
    }

    let mut claims = Vec::new();

    for entry in WalkDir::new(&claims_dir)
        .min_depth(2)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            match decompress_object(&entry.path().to_path_buf()) {
                Ok(claim) => claims.push(claim),
                Err(e) => log::warn!("Failed to read claim {}: {}", entry.path().display(), e),
            }
        }
    }

    // Sort by created_at descending (newest first)
    claims.sort_by(|a, b| {
        let a_time = a.get("metadata")
            .and_then(|m| m.get("created_at"))
            .and_then(|t| t.as_str())
            .unwrap_or("");
        let b_time = b.get("metadata")
            .and_then(|m| m.get("created_at"))
            .and_then(|t| t.as_str())
            .unwrap_or("");
        b_time.cmp(a_time)
    });

    Ok(claims)
}

#[tauri::command]
async fn get_claim(hash: String) -> Result<serde_json::Value, String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;

    if hash.len() < 3 {
        return Err("Invalid hash".to_string());
    }

    let prefix = &hash[..2];
    let suffix = &hash[2..];
    let claim_path = truth_path.join("objects/cl").join(prefix).join(suffix);

    if !claim_path.exists() {
        return Err(format!("Claim not found: {}", hash));
    }

    decompress_object(&claim_path)
}

#[tauri::command]
async fn get_truth_status() -> Result<TruthRepoStatus, String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;

    if !truth_path.exists() {
        return Ok(TruthRepoStatus {
            exists: false,
            path: truth_path.to_string_lossy().to_string(),
            claims_count: 0,
            head_ref: None,
            has_keys: false,
        });
    }

    // Count claims
    let claims_dir = truth_path.join("objects/cl");
    let claims_count = if claims_dir.exists() {
        WalkDir::new(&claims_dir)
            .min_depth(2)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .count()
    } else {
        0
    };

    // Read HEAD
    let head_path = truth_path.join("HEAD");
    let head_ref = fs::read_to_string(&head_path).ok();

    // Check for keys
    let has_keys = truth_path.join("proof.key").exists()
        && truth_path.join("proof.pub").exists();

    Ok(TruthRepoStatus {
        exists: true,
        path: truth_path.to_string_lossy().to_string(),
        claims_count,
        head_ref,
        has_keys,
    })
}

#[tauri::command]
async fn run_truthgit_command(args: Vec<String>) -> Result<String, String> {
    let output = Command::new("truthgit")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run truthgit: {}", e))?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .map_err(|e| format!("Invalid UTF-8 output: {}", e))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("TruthGit error: {}", stderr))
    }
}

#[tauri::command]
async fn verify_claim_local(claim: String, domain: String) -> Result<String, String> {
    let output = Command::new("truthgit")
        .args(["verify", &claim, "--domain", &domain, "--json"])
        .output()
        .map_err(|e| format!("Failed to run truthgit: {}", e))?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .map_err(|e| format!("Invalid UTF-8 output: {}", e))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Verification failed: {}", stderr))
    }
}

#[tauri::command]
async fn list_verifications() -> Result<Vec<serde_json::Value>, String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;
    let verifications_dir = truth_path.join("objects/vf");

    if !verifications_dir.exists() {
        return Ok(vec![]);
    }

    let mut verifications = Vec::new();

    for entry in WalkDir::new(&verifications_dir)
        .min_depth(2)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            match decompress_object(&entry.path().to_path_buf()) {
                Ok(vf) => verifications.push(vf),
                Err(e) => log::warn!("Failed to read verification {}: {}", entry.path().display(), e),
            }
        }
    }

    // Sort by timestamp descending
    verifications.sort_by(|a, b| {
        let a_time = a.get("timestamp")
            .and_then(|t| t.as_str())
            .unwrap_or("");
        let b_time = b.get("timestamp")
            .and_then(|t| t.as_str())
            .unwrap_or("");
        b_time.cmp(a_time)
    });

    Ok(verifications)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: String,
    pub action: String,
    pub claim: String,
    pub domain: String,
    pub risk_profile: String,
    pub result_status: String,
    pub result_action: String,
    pub confidence: f64,
}

#[tauri::command]
async fn get_audit_trail() -> Result<Vec<AuditEntry>, String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;
    let audit_file = truth_path.join("audit.json");

    if !audit_file.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&audit_file)
        .map_err(|e| format!("Failed to read audit file: {}", e))?;

    let entries: Vec<AuditEntry> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse audit file: {}", e))?;

    Ok(entries)
}

#[tauri::command]
async fn add_audit_entry(entry: AuditEntry) -> Result<(), String> {
    let truth_path = get_truth_path().ok_or("Could not find home directory")?;
    let audit_file = truth_path.join("audit.json");

    let mut entries: Vec<AuditEntry> = if audit_file.exists() {
        let content = fs::read_to_string(&audit_file)
            .map_err(|e| format!("Failed to read audit file: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    entries.insert(0, entry);

    let content = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to serialize audit: {}", e))?;

    fs::write(&audit_file, content)
        .map_err(|e| format!("Failed to write audit file: {}", e))?;

    Ok(())
}

// ==================== KNOWLEDGE BASE COMMANDS ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultNote {
    pub path: String,
    pub name: String,
    pub content: String,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub matches: Vec<String>,
    pub line_numbers: Vec<usize>,
}

#[tauri::command]
async fn get_vault_status() -> Result<serde_json::Value, String> {
    let vault_path = get_vault_path().ok_or("Could not find home directory")?;

    if !vault_path.exists() {
        return Ok(serde_json::json!({
            "exists": false,
            "path": vault_path.to_string_lossy().to_string(),
            "file_count": 0,
            "folder_count": 0,
        }));
    }

    let mut file_count = 0;
    let mut folder_count = 0;

    for entry in WalkDir::new(&vault_path)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            file_count += 1;
        } else if entry.file_type().is_dir() {
            folder_count += 1;
        }
    }

    Ok(serde_json::json!({
        "exists": true,
        "path": vault_path.to_string_lossy().to_string(),
        "file_count": file_count,
        "folder_count": folder_count,
    }))
}

#[tauri::command]
async fn list_vault_directory(relative_path: Option<String>) -> Result<Vec<VaultFile>, String> {
    let vault_path = get_vault_path().ok_or("Could not find home directory")?;

    let target_path = match relative_path {
        Some(ref p) if !p.is_empty() => vault_path.join(p),
        _ => vault_path.clone(),
    };

    if !target_path.exists() {
        return Err(format!("Directory not found: {}", target_path.display()));
    }

    let mut files = Vec::new();

    let entries = fs::read_dir(&target_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and .obsidian directory
        if name.starts_with('.') {
            continue;
        }

        let is_dir = path.is_dir();
        let extension = if is_dir {
            None
        } else {
            path.extension().map(|e| e.to_string_lossy().to_string())
        };

        let relative = path
            .strip_prefix(&vault_path)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| name.clone());

        files.push(VaultFile {
            name,
            path: relative,
            is_dir,
            extension,
        });
    }

    // Sort: directories first, then alphabetically
    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

#[tauri::command]
async fn read_note(relative_path: String) -> Result<VaultNote, String> {
    let vault_path = get_vault_path().ok_or("Could not find home directory")?;
    let note_path = vault_path.join(&relative_path);

    if !note_path.exists() {
        return Err(format!("Note not found: {}", relative_path));
    }

    let content = fs::read_to_string(&note_path)
        .map_err(|e| format!("Failed to read note: {}", e))?;

    let name = note_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| relative_path.clone());

    let modified = fs::metadata(&note_path)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Utc> = t.into();
            datetime.to_rfc3339()
        });

    Ok(VaultNote {
        path: relative_path,
        name,
        content,
        modified,
    })
}

#[tauri::command]
async fn search_notes(query: String) -> Result<Vec<SearchResult>, String> {
    let vault_path = get_vault_path().ok_or("Could not find home directory")?;

    if !vault_path.exists() {
        return Ok(vec![]);
    }

    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for entry in WalkDir::new(&vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();

        // Only search markdown files
        if path.extension().map(|e| e != "md").unwrap_or(true) {
            continue;
        }

        // Skip .obsidian directory
        if path.to_string_lossy().contains(".obsidian") {
            continue;
        }

        if let Ok(content) = fs::read_to_string(path) {
            let mut matches = Vec::new();
            let mut line_numbers = Vec::new();

            for (i, line) in content.lines().enumerate() {
                if line.to_lowercase().contains(&query_lower) {
                    // Truncate long lines
                    let truncated = if line.len() > 100 {
                        format!("{}...", &line[..100])
                    } else {
                        line.to_string()
                    };
                    matches.push(truncated);
                    line_numbers.push(i + 1);
                }
            }

            if !matches.is_empty() {
                let relative = path
                    .strip_prefix(&vault_path)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                let name = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();

                results.push(SearchResult {
                    path: relative,
                    name,
                    matches,
                    line_numbers,
                });
            }
        }
    }

    // Sort by number of matches (descending)
    results.sort_by(|a, b| b.matches.len().cmp(&a.matches.len()));

    Ok(results)
}

// ==================== TERMINAL COMMANDS ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

// Dangerous command patterns that require extra caution
const DANGEROUS_PATTERNS: &[&str] = &[
    "rm -rf",
    "rm -r /",
    "sudo rm",
    "> /dev/",
    "mkfs",
    "dd if=",
    ":(){:|:&};:",  // Fork bomb
    "chmod -R 777",
    "curl | bash",
    "wget | bash",
    "eval $(",
];

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandCheck {
    pub is_dangerous: bool,
    pub warning: Option<String>,
}

#[tauri::command]
async fn check_command_safety(command: String) -> Result<CommandCheck, String> {
    let cmd_lower = command.to_lowercase();

    for pattern in DANGEROUS_PATTERNS {
        if cmd_lower.contains(pattern) {
            return Ok(CommandCheck {
                is_dangerous: true,
                warning: Some(format!(
                    "⚠️ This command contains '{}' which can be dangerous. Proceed with caution.",
                    pattern
                )),
            });
        }
    }

    Ok(CommandCheck {
        is_dangerous: false,
        warning: None,
    })
}

#[tauri::command]
async fn execute_shell(command: String, cwd: Option<String>) -> Result<ShellOutput, String> {
    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "bash"
    };

    let shell_arg = if cfg!(target_os = "windows") {
        "/C"
    } else {
        "-c"
    };

    // Use configurable working directory from settings
    let working_dir = cwd.unwrap_or_else(|| {
        SETTINGS.read()
            .ok()
            .map(|s| {
                // Use truth_repo_path parent directory as default working dir
                PathBuf::from(&s.truth_repo_path)
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| ".".to_string())
            })
            .unwrap_or_else(|| ".".to_string())
    });

    let output = Command::new(shell)
        .arg(shell_arg)
        .arg(&command)
        .current_dir(&working_dir)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let exit_code = output.status.code().unwrap_or(-1);

    Ok(ShellOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code,
        success: output.status.success(),
    })
}

#[tauri::command]
async fn get_shell_suggestions(prefix: String) -> Result<Vec<String>, String> {
    let mut suggestions = Vec::new();

    // TruthGit commands
    let truthgit_commands = [
        "truthgit status",
        "truthgit verify",
        "truthgit safe-verify",
        "truthgit prove",
        "truthgit search",
        "truthgit log",
        "truthgit init",
    ];

    // Common commands
    let common_commands = [
        "ls", "cd", "pwd", "cat", "git status", "git log", "git diff",
        "npm run", "python", "pip", "cargo",
    ];

    let prefix_lower = prefix.to_lowercase();

    for cmd in truthgit_commands.iter().chain(common_commands.iter()) {
        if cmd.to_lowercase().starts_with(&prefix_lower) {
            suggestions.push(cmd.to_string());
        }
    }

    Ok(suggestions)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Settings
            get_settings,
            update_settings,
            // Governance
            governance_verify,
            list_claims,
            get_claim,
            get_truth_status,
            run_truthgit_command,
            verify_claim_local,
            list_verifications,
            // Audit
            get_audit_trail,
            add_audit_entry,
            // Knowledge Base
            get_vault_status,
            list_vault_directory,
            read_note,
            search_notes,
            // Terminal
            check_command_safety,
            execute_shell,
            get_shell_suggestions,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
