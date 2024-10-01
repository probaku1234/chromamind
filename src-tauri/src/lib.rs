pub mod structs;

use chromadb::v1::collection::GetOptions;
use chromadb::v1::{client::ChromaClientOptions, collection};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// use chromadb::v1::collection::{ChromaCollection, CollectionEntries, GetResult};
use chromadb::v1::ChromaClient;
use serde_json::{json, Map, Value};
use structs::EmbeddingData;
use tauri::State;

use std::fmt::format;
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
fn get_chroma_version(state: State<AppState>) -> Result<String, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let version = client.version();
    if version.is_err() {
        return Err(format!(
            "Error fetching chroma version: {}",
            version.err().unwrap()
        ));
    }

    Ok(version.unwrap())
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
fn fetch_collections(state: State<AppState>) -> Result<Vec<Value>, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collections = client.list_collections();
    if collections.is_err() {
        return Err(format!(
            "Error fetching collections: {}",
            collections.err().unwrap()
        ));
    }

    let collections = collections.unwrap();
    let collections_list = collections
        .into_iter()
        .map(|collection| {
            json!({
                "id": collection.id(),
                "name": collection.name(),
            })
        })
        .collect();

    Ok(collections_list)
}

#[tauri::command]
fn fetch_row_count(
    collection_name: &str,
    limit: usize,
    offset: usize,
    state: State<AppState>,
) -> Result<usize, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);
    if collection.is_err() {
        return Err(format!(
            "Error fetching collection: {}",
            collection.err().unwrap()
        ));
    }

    let collection = collection.unwrap();
    let count = collection.get(GetOptions {
        ids: vec![],
        where_metadata: None,
        limit: Some(limit),
        offset: Some(offset),
        where_document: None,
        include: Some(vec![]),
    });

    if count.is_err() {
        return Err(format!(
            "Error fetching row count: {}",
            count.err().unwrap()
        ));
    }

    Ok(count.unwrap().ids.len())
}

#[tauri::command]
fn fetch_embeddings(
    collection_name: &str,
    limit: usize,
    offset: usize,
    state: State<AppState>,
) -> Result<Vec<EmbeddingData>, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);
    if collection.is_err() {
        return Err(format!(
            "Error fetching collection: {}",
            collection.err().unwrap()
        ));
    }

    let collection = collection.unwrap();

    let get_query = GetOptions {
        ids: vec![],
        where_metadata: None,
        limit: Some(limit),
        offset: Some(offset * limit),
        where_document: None,
        include: Some(vec![
            "embeddings".into(),
            "documents".into(),
            "metadatas".into(),
        ]),
    };

    let get_result = collection.get(get_query);
    if get_result.is_err() {
        return Err(format!(
            "Error fetching embeddings: {}",
            get_result.err().unwrap()
        ));
    }

    let get_result = get_result.unwrap();
    let ids = get_result.ids;
    let embeddings = get_result.embeddings.unwrap_or(vec![]);
    let documents = get_result.documents.unwrap_or(vec![]);
    let metadatas = get_result.metadatas.unwrap_or(vec![]);

    if ids.len() != embeddings.len() || ids.len() != documents.len() || ids.len() != metadatas.len()
    {
        return Err("Error fetching embeddings: Mismatch in data".to_string());
    }

    let embeddings_list: Vec<EmbeddingData> = ids.into_iter()
        .zip(embeddings.into_iter())
        .zip(documents.into_iter())
        .zip(metadatas.into_iter())
        .map(|(((id, embedding), document), metadata)| {
            EmbeddingData {
                id,
                metadata: metadata.unwrap_or_default(),
                document: document.unwrap_or_default(),
                embedding: embedding.unwrap_or_default(),
            }
        })
        .collect();

    Ok(embeddings_list)
}

#[tauri::command]
fn fetch_collection_data(collection_name: &str, state: State<AppState>) -> Result<Value, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);

    if collection.is_err() {
        return Err("Error fetching collection".to_string());
    }
    let collection = collection.unwrap();

    let collection_id = collection.id();
    let collection_metadata = collection.metadata();
    let x = json!({
        "id": collection_id,
        "metadata": collection_metadata
    });
    Ok(x)
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
            fetch_collection_data,
            fetch_row_count,
            fetch_collections
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
