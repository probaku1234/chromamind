pub mod structs;

use chromadb::v1::client::ChromaClientOptions;
use chromadb::v1::collection::GetOptions;
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// use chromadb::v1::collection::{ChromaCollection, CollectionEntries, GetResult};
use chromadb::v1::ChromaClient;
use serde_json::{json, Value};
use structs::EmbeddingData;
use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID};
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
fn check_tenant_and_database(
    tenant: &str,
    database: &str,
    state: State<AppState>,
) -> Result<bool, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    Ok(client.tenant_exists(tenant) && client.database_exists(database))
}

#[tauri::command]
async fn create_window(url: &str, app: tauri::AppHandle) -> Result<(), tauri::Error> {
    let pkg_info = &app.package_info();
    let config = &app.config();
    let about_metadata = AboutMetadata {
        name: Some(pkg_info.name.clone()),
        version: Some(pkg_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    let window_menu = Submenu::with_id_and_items(
        &app,
        WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::about(&app, None, Some(about_metadata))?,
            &PredefinedMenuItem::minimize(&app, None)?,
            &PredefinedMenuItem::maximize(&app, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(&app)?,
            &PredefinedMenuItem::close_window(&app, None)?,
        ],
    )?;

    let menu = Menu::with_items(
        &app,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                &app,
                pkg_info.name.clone(),
                true,
                &[
                    &PredefinedMenuItem::about(&app, None, Some(about_metadata))?,
                    &PredefinedMenuItem::separator(&app)?,
                    &PredefinedMenuItem::services(&app, None)?,
                    &PredefinedMenuItem::separator(&app)?,
                    &PredefinedMenuItem::hide(&app, None)?,
                    &PredefinedMenuItem::hide_others(&app, None)?,
                    &PredefinedMenuItem::separator(&app)?,
                    &PredefinedMenuItem::quit(&app, None)?,
                ],
            )?,
            #[cfg(not(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            )))]
            &Submenu::with_items(
                &app,
                "File",
                true,
                &[
                    &PredefinedMenuItem::close_window(&app, None)?,
                    #[cfg(not(target_os = "macos"))]
                    &PredefinedMenuItem::quit(&app, None)?,
                ],
            )?,
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                &app,
                "View",
                true,
                &[&PredefinedMenuItem::fullscreen(&app, None)?],
            )?,
            &window_menu,
        ],
    )?;

    // set title as URL
    let _ = tauri::WebviewWindowBuilder::new(&app, "label", tauri::WebviewUrl::App("/home".into()))
        .min_inner_size(1100.0, 600.0)
        .title(format!("ChromaMind: {}", url))
        .menu(menu)
        .build()
        .expect("fail to build new window");

    Ok(())
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
fn fetch_row_count(collection_name: &str, state: State<AppState>) -> Result<usize, String> {
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
        limit: None,
        offset: None,
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
    let embeddings = get_result.embeddings.unwrap_or_default();
    let documents = get_result.documents.unwrap_or_default();
    let metadatas = get_result.metadatas.unwrap_or_default();

    if ids.len() != embeddings.len() || ids.len() != documents.len() || ids.len() != metadatas.len()
    {
        return Err("Error fetching embeddings: Mismatch in data".to_string());
    }

    let embeddings_list: Vec<EmbeddingData> = ids
        .into_iter()
        .zip(embeddings)
        .zip(documents)
        .zip(metadatas)
        .map(|(((id, embedding), document), metadata)| EmbeddingData {
            id,
            metadata: metadata.unwrap_or_default(),
            document: document.unwrap_or_default(),
            embedding: embedding.unwrap_or_default(),
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

#[tauri::command]
fn create_collection(
    collection_name: &str,
    metadata: Option<Value>,
    state: State<AppState>,
) -> Result<Value, String> {
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let metadata_map = metadata.and_then(|m| m.as_object().cloned());
    let result = client.create_collection(collection_name, metadata_map, false);

    if result.is_err() {
        return Err(format!(
            "Error creating collection: {}",
            result.err().unwrap()
        ));
    }

    let collection = result.unwrap();

    Ok(json!({
        "id": collection.id(),
        "name": collection.name(),
        "metadata": collection.metadata()
    }))
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
            fetch_collections,
            check_tenant_and_database,
            create_collection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[allow(clippy::all)]
#[cfg(test)]
mod tests {
    use super::*;
    use chromadb::v1::collection::CollectionEntries;
    use tauri::test::{mock_builder, mock_context, noop_assets};
    use testcontainers::{
        core::{IntoContainerPort, WaitFor},
        runners::SyncRunner,
        Container, GenericImage,
    };

    fn before_each<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .manage(AppState {
                client: Mutex::new(None),
            })
            .invoke_handler(tauri::generate_handler![
                greet,
                create_client,
                health_check,
                // create_window,
                get_chroma_version,
                reset_chroma,
                fetch_embeddings,
                fetch_collection_data,
                fetch_row_count,
                fetch_collections,
                check_tenant_and_database,
                create_collection
            ])
            // remove the string argument to use your app's config file
            .build(mock_context(noop_assets()))
            .expect("failed to build app")
    }

    fn create_chroma_container() -> Container<GenericImage> {
        GenericImage::new("chromadb/chroma", "0.5.5")
            .with_exposed_port(8000.tcp())
            // .with_wait_for(WaitFor::Http(HttpWaitStrategy::new("/api/v1/heartbeat").with_port(8000.tcp())))
            .with_wait_for(WaitFor::message_on_stdout("Application startup complete."))
            .start()
            .expect("ChromaDB started")
    }

    #[test]
    fn test_chroma_container() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        println!("ChromaDB running at {}:{}", host, port);
        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });

        let health_check_result = client.heartbeat();
        assert!(health_check_result.is_ok(), "ChromaDB not running");
    }

    #[test]
    fn test_greet() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "greet".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "name": connect_url
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        )
        .map(|res| res.deserialize::<String>().unwrap());

        assert!(res.is_ok(), "greet failed: {:?}", res.err());
    }

    #[test]
    fn test_health_check() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "health_check".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "health_check should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "health_check failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "health_check".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "health_check failed: {:?}", res.err());
        // assert if res is u64
        let res = res.unwrap().deserialize::<u64>();
        assert!(
            res.is_ok(),
            "health_check result is not u64: {:?}",
            res.err()
        );
    }

    #[test]
    fn test_check_tenant_and_database() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "check_tenant_and_database".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "tenant": "test",
                    "database": "test"
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "check_tenant_and_database should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "check_tenant_and_database failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "check_tenant_and_database".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "tenant": "default_tenant",
                    "database": "default_database"
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(
            res.is_ok(),
            "check_tenant_and_database failed: {:?}",
            res.err()
        );
        // assert if res is bool
        let res = res.unwrap().deserialize::<bool>();
        assert!(
            res.is_ok(),
            "check_tenant_and_database result is not bool: {:?}",
            res.err()
        );
        assert!(res.unwrap(), "check_tenant_and_database result is not true");
    }

    #[test]
    fn test_get_chroma_version() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "get_chroma_version".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "get_chroma_version should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "get_chroma_version failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "get_chroma_version".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "get_chroma_version failed: {:?}", res.err());
        // assert if res is string
        let res = res.unwrap().deserialize::<String>();
        assert!(
            res.is_ok(),
            "get_chroma_version result is not string: {:?}",
            res.err()
        );

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });
        let expected = client.version().unwrap();
        let actual = res.unwrap();

        assert_eq!(
            expected, actual,
            "get_chroma_version result is not equal to expected"
        );
    }

    #[test]
    #[should_panic] // FIXME: this test panics because the ChromaDB container does not support the reset command
    fn test_reset_chroma() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "reset_chroma".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "reset_chroma should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "reset_chroma failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "reset_chroma".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "reset_chroma failed: {:?}", res.err());
        // assert if res is bool
        let res = res.unwrap().deserialize::<bool>();
        assert!(
            res.is_ok(),
            "reset_chroma result is not bool: {:?}",
            res.err()
        );
    }

    #[test]
    fn test_fetch_collections() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_collections".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "fetch_collections should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collections failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });

        let collecton_name = "test_collection";
        client
            .get_or_create_collection(collecton_name, None)
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_collections".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "fetch_collections failed: {:?}", res.err());
        // assert if res is Vec<Value>
        let res = res.unwrap().deserialize::<Vec<Value>>();
        assert!(
            res.is_ok(),
            "fetch_collections result is not Vec<Value>: {:?}",
            res.err()
        );
        let res = res.unwrap();
        assert!(!res.is_empty(), "fetch_collections result is empty");
        let collection_data = res.first().unwrap();
        let expected = collection_data.get("name").unwrap().as_str().unwrap();
        assert_eq!(
            expected, collecton_name,
            "fetch_collections result is not equal to expected"
        );
    }

    #[test]
    fn test_fetch_row_count() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_row_count".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": "test_collection"
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "fetch_row_count should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_row_count failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });

        let collecton_name = "test_collection";
        let collection = client
            .get_or_create_collection(collecton_name, None)
            .unwrap();

        let collection_entries = CollectionEntries {
            ids: vec!["demo-id-1".into(), "demo-id-2".into()],
            embeddings: Some(vec![vec![0.0_f32; 768], vec![0.0_f32; 768]]),
            metadatas: None,
            documents: Some(vec![
                "Some document about 9 octopus recipies".into(),
                "Some other document about DCEU Superman Vs CW Superman".into(),
            ]),
        };
        collection.upsert(collection_entries, None).unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_row_count".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": collecton_name
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "fetch_row_count failed: {:?}", res.err());
        // assert if res is usize
        let res = res.unwrap().deserialize::<usize>();
        assert!(
            res.is_ok(),
            "fetch_row_count result is not usize: {:?}",
            res.err()
        );
        let res = res.unwrap();
        assert_eq!(res, 2, "fetch_row_count result is not equal to expected");
    }

    #[test]
    fn test_fetch_embeddings() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_embeddings".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": "test_collection",
                    "limit": 1,
                    "offset": 0
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "fetch_embeddings should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_embeddings failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });

        let collecton_name = "test_collection";
        let collection = client
            .get_or_create_collection(collecton_name, None)
            .unwrap();

        let ids = vec!["demo-id-1".into(), "demo-id-2".into()];
        let collection_entries = CollectionEntries {
            ids: ids.clone(),
            embeddings: Some(vec![vec![0.0_f32; 768], vec![0.0_f32; 768]]),
            metadatas: None,
            documents: Some(vec![
                "Some document about 9 octopus recipies".into(),
                "Some other document about DCEU Superman Vs CW Superman".into(),
            ]),
        };
        collection.upsert(collection_entries, None).unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_embeddings".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": collecton_name,
                    "limit": 0,
                    "offset": 0
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "fetch_embeddings failed: {:?}", res.err());
        // assert if res is Vec<EmbeddingData>
        let res = res.unwrap().deserialize::<Vec<EmbeddingData>>();
        assert!(
            res.is_ok(),
            "fetch_embeddings result is not Vec<EmbeddingData>: {:?}",
            res.err()
        );

        let res = res.unwrap();
        let expected = ids.clone();

        assert_eq!(
            expected,
            res.iter().map(|x| x.id.clone()).collect::<Vec<_>>()
        );
    }

    #[test]
    fn test_fetch_collection_data() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_collection_data".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": "test_collection"
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "fetch_collection_data should fail");

        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collection_data failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });

        let collecton_name = "test_collection";
        let collection = client
            .get_or_create_collection(
                collecton_name,
                Some(
                    json!({
                        "foo": "bar"
                    })
                    .as_object()
                    .unwrap()
                    .clone(),
                ),
            )
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "fetch_collection_data".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": collecton_name
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "fetch_collection_data failed: {:?}", res.err());

        // assert if res is Value
        let res = res.unwrap().deserialize::<Value>();
        assert!(
            res.is_ok(),
            "fetch_collection_data result is not Value: {:?}",
            res.err()
        );

        let res = res.unwrap();
        let expected = json!({
            "id": collection.id(),
            "metadata": collection.metadata()
        });

        assert_eq!(
            expected, res,
            "fetch_collection_data result is not equal to expected"
        );
    }

    #[test]
    fn test_create_collection() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_collection".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": "test_collection"
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_err(), "fetch_collection_data should fail");

        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collection_data failed with different error"
        );

        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_client".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "url": connect_url.clone()
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let collection_name: &str = "test_collection";
        let metadata = json!({
            "foo": "bar"
        });
        let res = tauri::test::get_ipc_response(
            &webview,
            tauri::webview::InvokeRequest {
                cmd: "create_collection".into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(json!({
                    "collectionName": collection_name,
                    "metadata": metadata
                })),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        );

        assert!(res.is_ok(), "create_collection failed: {:?}", res.err());

        let client = ChromaClient::new(ChromaClientOptions {
            url: format!("http://{}:{}", host, port),
            auth: chromadb::v1::client::ChromaAuthMethod::None,
        });
        let collection = client.get_collection(collection_name).unwrap();

        assert_eq!(collection_name, collection.name());
        assert_eq!(metadata, json!(collection.metadata()));
    }
}
