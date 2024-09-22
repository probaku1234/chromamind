pub mod structs;

use chromadb::v1::client::ChromaClientOptions;
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// use chromadb::v1::collection::{ChromaCollection, CollectionEntries, GetResult};
use chromadb::v1::ChromaClient;
use structs::EmbeddingData;
use tauri::State;

use std::sync::Mutex;

struct AppState {
    client: Mutex<Option<ChromaClient>>,
}

// impl AppState {
//     fn new(url: String) -> Self {
//         let client = ChromaClient::new(ChromaClientOptions {
//             url,
//             auth: chromadb::v1::client::ChromaAuthMethod::None,
//         });
//         AppState { client }
//     }
// }

#[tauri::command]
fn create_client(url: &str, state: State<AppState>) {
    let client = ChromaClient::new(ChromaClientOptions {
        url: url.to_string(),
        auth: chromadb::v1::client::ChromaAuthMethod::None,
    });
    *state.client.lock().unwrap() = Some(client);
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
fn health_check(state: State<AppState>) -> Result<u64, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();
    match client.heartbeat() {
        Ok(timestamp) => Ok(timestamp),
        Err(e) => Err(format!("Error checking health: {}", e)),
    }
}

#[tauri::command]
async fn create_window(app: tauri::AppHandle) {
    // set title as URL
    let _ = tauri::WebviewWindowBuilder::new(&app, "label", tauri::WebviewUrl::App("/home".into()))
        .build()
        .unwrap();
}

// tauri command get chroma version
#[tauri::command]
async fn get_chroma_version() -> String {
    "0.1.0".to_string()
}

#[tauri::command]
fn reset_chroma(state: State<AppState>) -> Result<bool, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();
    match client.reset() {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Error resetting chroma: {}", e)),
    }
}

#[tauri::command]
fn fetch_embeddings(_: State<AppState>) -> Result<Vec<EmbeddingData>, String> {
    // return json vector
    Ok(vec![
        EmbeddingData {
            id: "1".to_string(),
            metadata: vec![None],
            document: "Some document about 9 octopus recipies".to_string(),
            embedding: vec![0.0_f32; 768],
        },
        EmbeddingData {
            id: "2".to_string(),
            metadata: vec![None],
            document: "Some other document about DCEU Superman Vs CW Superman".to_string(),
            embedding: vec![0.0_f32; 768],
        },
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            client: Mutex::new(None),
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_client,
            health_check,
            create_window,
            get_chroma_version,
            reset_chroma,
            fetch_embeddings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use chromadb::v1::collection::{CollectionEntries, GetOptions};

    use super::*;
    // use tauri::test::{mock_builder, mock_context, noop_assets};

    // fn before_each<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
    //     builder
    //         .invoke_handler(tauri::generate_handler![greet])
    //         // remove the string argument to use your app's config file
    //         .build(mock_context(noop_assets()))
    //         .expect("failed to build app")
    // }

    // #[test]
    // fn test_greet() {
    //     let app = before_each(mock_builder());
    //     let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
    //         .build()
    //         .unwrap();

    //     tauri::test::assert_ipc_response(
    //         &webview,
    //         tauri::webview::InvokeRequest {
    //             cmd: "greet".into(),
    //             callback: tauri::ipc::CallbackFn(0),
    //             error: tauri::ipc::CallbackFn(1),
    //             url: "http://tauri.localhost".parse().unwrap(),
    //             body: tauri::ipc::InvokeBody::default(),
    //             headers: Default::default(),
    //             invoke_key: tauri::test::INVOKE_KEY.to_string(),
    //         },
    //         Ok("p"),
    //     );
    // }
    // #[test]
    // fn collection() {
    //     let client = ChromaClient::new(ChromaClientOptions::default());
    //     let collection = client.get_collection("test-collection-1").unwrap();

    //     // let collection_entries = CollectionEntries {
    //     //     ids: vec!["demo-id-1", "demo-id-2"],
    //     //     embeddings: Some(vec![vec![0.0_f32; 768], vec![0.0_f32; 768]]),
    //     //     metadatas: None,
    //     //     documents: Some(vec![
    //     //         "Some document about 9 octopus recipies",
    //     //         "Some other document about DCEU Superman Vs CW Superman"
    //     //     ])
    //     //  };

    //     //  let result = collection.upsert(collection_entries, None).unwrap();
    //     //  println!("{:?}", result);
    //     println!("{:?}", collection.count().unwrap());
    //     println!("{:?}", collection.get(GetOptions::default()).unwrap());
    //     let get_query = GetOptions {
    //         ids: vec![],
    //         where_metadata: None,
    //         limit: None,
    //         offset: None,
    //         where_document: None,
    //         include: Some(vec![
    //             "documents".into(),
    //             "embeddings".into(),
    //             "metadatas".into(),
    //         ]),
    //     };

    //     let get_result = collection.get(get_query).unwrap();
    //     println!("{:?}", get_result);
    // }
}
