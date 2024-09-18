use chromadb::v1::client::{ChromaAuthMethod, ChromaClientOptions};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use chromadb::v1::collection::{ChromaCollection, CollectionEntries, GetResult};
use chromadb::v1::ChromaClient;
use tauri::State;

use std::sync::Mutex;

type WrappedState = Mutex<Option<AppState>>;

struct AppState {
    client: ChromaClient,
}

impl AppState {
    fn new(url: String) -> Self {
        let client = ChromaClient::new(ChromaClientOptions {
            url,
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });
        AppState { client }
    }
}

#[tauri::command]
fn create_client(url: &str, state: State<WrappedState>) {
    let mut app_state = state.lock().unwrap();
    let client = ChromaClient::new(ChromaClientOptions {
        url: url.to_string(),
        auth: chromadb::v1::client::ChromaAuthMethod::None,
    });
    *app_state = Some(AppState { client });
}

#[tauri::command]
fn greet(name: &str) -> String {
    let client: ChromaClient = ChromaClient::new(ChromaClientOptions {
        url: name.to_string(),
        auth: chromadb::v1::client::ChromaAuthMethod::None,
    });

    format!(
        "Hello, {}! You've been greeted from Rust!",
        client.version().unwrap_or("error".to_string())
    )
}

#[tauri::command]
fn health_check(state: State<WrappedState>) -> bool {
    let app_state = state.lock().unwrap();
    if let Some(ref app_state) = *app_state {
        app_state.client.heartbeat().is_ok()
    } else {
        false
    }
}

#[tauri::command]
async fn create_window(app: tauri::AppHandle) {
    // set title as URL
  let webview_window = tauri::WebviewWindowBuilder::new(&app, "label", tauri::WebviewUrl::App("/home".into()))
    .build()
    .unwrap();
}

// tauri command get chroma version
#[tauri::command]
async fn get_chroma_version() -> String {
    "0.1.0".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(None::<AppState>))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, create_client, health_check, create_window, get_chroma_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
