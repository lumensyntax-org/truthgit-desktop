use serde::{Deserialize, Serialize};
use std::process::Command;

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

#[tauri::command]
async fn governance_verify(
    claim: String,
    domain: String,
    risk_profile: String,
) -> Result<GovernanceResult, String> {
    // Call TruthGit API via HTTP (local or cloud)
    let client = reqwest::Client::new();

    // Try local first, fall back to cloud
    let api_url = std::env::var("TRUTHGIT_API_URL")
        .unwrap_or_else(|_| "https://truthgit-api-342668283383.us-central1.run.app".to_string());

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

#[tauri::command]
async fn list_claims() -> Result<Vec<serde_json::Value>, String> {
    // Read from local .truth/ directory
    let truth_path = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join("Almacen_IA/LumenSyntax-Main/.truth/claims.json");

    if !truth_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&truth_path)
        .map_err(|e| format!("Failed to read claims: {}", e))?;

    let claims: Vec<serde_json::Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse claims: {}", e))?;

    Ok(claims)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            governance_verify,
            list_claims,
            run_truthgit_command,
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
