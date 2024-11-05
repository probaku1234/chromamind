pub mod structs;

use chromadb::v1::client::ChromaClientOptions;
use chromadb::v1::collection::GetOptions;
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// use chromadb::v1::collection::{ChromaCollection, CollectionEntries, GetResult};
use chromadb::v1::ChromaClient;
use chrono::DateTime;
use serde_json::{json, Value};
use structs::EmbeddingData;
use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID};
use tauri::State;
use tauri_plugin_log::{Target, TargetKind};

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
fn create_client(
    url: &str,
    auth_config: Option<Value>,
    state: State<AppState>,
) -> Result<(), String> {
    log::info!("(create_client) Creating client with url: {}", url);
    let auth = auth_config.and_then(|auth| {
        let auth_map = auth.as_object().cloned();
        auth_map.and_then(|auth_map| {
            let auth_method = auth_map.get("authMethod")?;
            let auth_method = auth_method.as_str()?;
            log::debug!("(create_client) Auth method: {}", auth_method);
            match auth_method {
                "no_auth" => Some(chromadb::v1::client::ChromaAuthMethod::None),
                "basic_auth" => {
                    let username = auth_map.get("username")?.as_str()?;
                    let password = auth_map.get("password")?.as_str()?;
                    log::debug!("(create_client) parsed username and password");
                    Some(chromadb::v1::client::ChromaAuthMethod::BasicAuth {
                        username: username.to_string(),
                        password: password.to_string(),
                    })
                }
                "token_auth" => {
                    let token_type = auth_map.get("tokenType")?.as_str()?;
                    let token = auth_map.get("token")?.as_str()?;
                    let header = match token_type {
                        "bearer" => chromadb::v1::client::ChromaTokenHeader::Authorization,
                        "x_chroma_token" => chromadb::v1::client::ChromaTokenHeader::XChromaToken,
                        _ => return None,
                    };
                    log::debug!("(create_client) parsed token and header");
                    Some(chromadb::v1::client::ChromaAuthMethod::TokenAuth {
                        header,
                        token: token.to_string(),
                    })
                }
                _ => None,
            }
        })
    });

    if auth.is_none() {
        log::error!("(create_client) Invalid auth config");
        return Err("Invalid auth config".to_string());
    }

    let client = ChromaClient::new(ChromaClientOptions {
        url: url.to_string(),
        auth: auth.unwrap(),
    });
    *state.client.lock().unwrap() = Some(client);

    Ok(())
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
    log::info!("(health_check) Checking ChromaDB health");
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(health_check) client is none");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();
    match client.heartbeat() {
        Ok(timestamp) => {
            log::debug!("(health_check) ChromaDB is healthy: {}", timestamp);
            Ok(timestamp)
        }
        Err(e) => {
            log::error!("(health_check) Error checking health: {}", e);
            Err(format!("Error checking health: {}", e))
        }
    }
}

#[tauri::command]
fn check_tenant_and_database(
    tenant: &str,
    database: &str,
    state: State<AppState>,
) -> Result<bool, String> {
    log::info!(
        "(check_tenant_and_database) Checking tenant: {} and database: {}",
        tenant,
        database
    );
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(check_tenant_and_database) client is none");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let tenant_exist = client.tenant_exists(tenant);
    if tenant_exist.is_err() {
        log::error!(
            "(check_tenant_and_database) Error checking tenant: {} exists: {}",
            tenant,
            tenant_exist.as_ref().err().unwrap()
        );
        return Err(format!(
            "Error checking tenant: {} exists: {}",
            tenant,
            tenant_exist.as_ref().err().unwrap()
        ));
    }
    let tenant_exist = tenant_exist.unwrap();
    let database_exist = client.database_exists(database);
    if database_exist.is_err() {
        log::error!(
            "(check_tenant_and_database) Error checking database: {} exists: {}",
            database,
            database_exist.as_ref().err().unwrap()
        );
        return Err(format!(
            "Error checking database: {} exists: {}",
            database,
            database_exist.as_ref().err().unwrap()
        ));
    }
    let database_exist = database_exist.unwrap();
    log::debug!(
        "(check_tenant_and_database) Tenant: {} exists: {}, Database: {} exists: {}",
        tenant,
        tenant_exist,
        database,
        database_exist
    );

    Ok(tenant_exist && database_exist)
}

#[tauri::command]
async fn create_window(url: &str, app: tauri::AppHandle) -> Result<(), tauri::Error> {
    log::info!("(create_window) Creating window with url: {}", url);

    let pkg_info = &app.package_info();
    let config = &app.config();
    let about_metadata = AboutMetadata {
        name: Some(pkg_info.name.clone()),
        version: Some(pkg_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };
    log::debug!("(create_window) about_metadata: {:?}", about_metadata);

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

    log::info!("(create_window) Window created");

    Ok(())
}

// tauri command get chroma version
#[tauri::command]
fn get_chroma_version(state: State<AppState>) -> Result<String, String> {
    log::info!("(get_chroma_version) Fetching chroma version");
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let version = client.version();
    if version.is_err() {
        log::error!(
            "(get_chroma_version) Error fetching chroma version: {}",
            version.as_ref().err().unwrap()
        );
        return Err(format!(
            "Error fetching chroma version: {}",
            version.err().unwrap()
        ));
    }

    log::debug!(
        "(get_chroma_version) Chroma version: {}",
        version.as_ref().unwrap()
    );
    Ok(version.unwrap())
}

#[tauri::command]
fn reset_chroma(state: State<AppState>) -> Result<bool, String> {
    log::info!("(reset_chroma) Resetting chroma");
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();
    match client.reset() {
        Ok(result) => {
            log::debug!("(reset_chroma) Chroma reset result: {}", result);
            Ok(true)
        }
        Err(e) => {
            log::error!("(reset_chroma) Error resetting chroma: {}", e);
            Err(format!("Error resetting chroma: {}", e))
        }
    }
}

#[tauri::command]
fn fetch_collections(state: State<AppState>) -> Result<Vec<Value>, String> {
    log::info!("(fetch_collections) Fetching collections");
    let client = state.client.lock().unwrap();

    if client.is_none() {
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collections = client.list_collections();
    if collections.is_err() {
        log::error!(
            "(fetch_collections) Error fetching collections: {}",
            collections.as_ref().err().unwrap()
        );
        return Err(format!(
            "Error fetching collections: {}",
            collections.err().unwrap()
        ));
    }

    let collections = collections.unwrap();
    log::debug!(
        "(fetch_collections) Fetched collections: {}, {:?}",
        collections.len(),
        collections
    );
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
    log::info!(
        "(fetch_row_count) Fetching row count for collection: {}",
        collection_name
    );
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(fetch_row_count) No client found");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);
    if collection.is_err() {
        log::error!(
            "(fetch_row_count) Error fetching collection: {}",
            collection.as_ref().err().unwrap()
        );
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

    log::debug!(
        "(fetch_row_count) Fetched rows: {:?}",
        count.as_ref().unwrap()
    );

    Ok(count.unwrap().ids.len())
}

#[tauri::command]
fn fetch_embeddings(
    collection_name: &str,
    limit: usize,
    offset: usize,
    state: State<AppState>,
) -> Result<Vec<EmbeddingData>, String> {
    log::info!(
        "(fetch_embeddings) Fetching embeddings for collection: {}",
        collection_name
    );
    log::debug!("(fetch_embeddings) limit: {}, offset: {}", limit, offset,);
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(fetch_embeddings) No client found");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);
    if collection.is_err() {
        log::error!(
            "(fetch_embeddings) Error fetching collection: {}",
            collection.as_ref().err().unwrap()
        );
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
    log::debug!(
        "(fetch_embeddings) Fetching embeddings with query: {:?}",
        get_query
    );

    let get_result = collection.get(get_query);
    if get_result.is_err() {
        log::error!(
            "(fetch_embeddings) Error fetching embeddings: {}",
            get_result.as_ref().err().unwrap()
        );
        return Err(format!(
            "Error fetching embeddings: {}",
            get_result.err().unwrap()
        ));
    }

    // log::debug!(
    //     "(fetch_embeddings) Fetched embeddings: {:?}",
    //     get_result.as_ref().unwrap()
    // );

    let get_result = get_result.unwrap();
    let ids = get_result.ids;
    let embeddings = get_result.embeddings.unwrap_or_default();
    let documents = get_result.documents.unwrap_or_default();
    let metadatas = get_result.metadatas.unwrap_or_default();

    if ids.len() != embeddings.len() || ids.len() != documents.len() || ids.len() != metadatas.len()
    {
        log::error!(
            "(fetch_embeddings) Error fetching embeddings: Mismatch in data: ids: {}, embeddings: {}, documents: {}, metadatas: {}",
            ids.len(),
            embeddings.len(),
            documents.len(),
            metadatas.len()
        );
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
    log::info!(
        "(fetch_collection_data) Fetching collection data for collection: {}",
        collection_name
    );
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(fetch_collection_data) No client found");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let collection = client.get_collection(collection_name);

    if collection.is_err() {
        log::error!(
            "(fetch_collection_data) Error fetching collection: {}",
            collection.as_ref().err().unwrap()
        );
        return Err("Error fetching collection".to_string());
    }
    let collection = collection.unwrap();

    let collection_id = collection.id();
    let collection_metadata = collection.metadata();
    let collection_configuration = collection.configuration_json();
    log::debug!(
        "(fetch_collection_data) Fetched collection: {}, {:?}",
        collection_id,
        collection_metadata
    );
    let metadata = json!({
        "id": collection_id,
        "metadata": collection_metadata,
        "configuration": collection_configuration,
    });

    Ok(metadata)
}

#[tauri::command]
fn create_collection(
    collection_name: &str,
    metadata: Option<Value>,
    state: State<AppState>,
) -> Result<Value, String> {
    log::info!(
        "(create_collection) Creating collection: {} with metadata: {:?}",
        collection_name,
        metadata
    );
    let client = state.client.lock().unwrap();

    if client.is_none() {
        log::error!("(create_collection) No client found");
        return Err("No client found".to_string());
    }

    let client = client.as_ref().unwrap();

    let metadata_map = metadata.and_then(|m| m.as_object().cloned());
    log::debug!(
        "(create_collection) Creating collection with metadata: {:?}",
        metadata_map
    );
    let result = client.create_collection(collection_name, metadata_map, false);

    if result.is_err() {
        log::error!(
            "(create_collection) Error creating collection: {}",
            result.as_ref().err().unwrap()
        );
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

fn get_current_date_string() -> String {
    use chrono::Local;

    let current_date = Local::now().format("%Y-%m-%d").to_string();

    current_date
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(debug_assertions)]
    let max_log_level = log::LevelFilter::Debug;

    #[cfg(not(debug_assertions))]
    let max_log_level = log::LevelFilter::Info;

    tauri::Builder::default()
        .manage(AppState {
            client: Mutex::new(None),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .level(max_log_level)
                .clear_targets()
                // logging to stderr, file and file name with current date
                .targets([
                    Target::new(TargetKind::Stderr),
                    Target::new(TargetKind::LogDir {
                        file_name: Some(get_current_date_string()),
                    }),
                ])
                .build(),
        )
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
    use pretty_assertions::assert_eq;
    use tauri::{
        ipc::InvokeResponseBody,
        test::{mock_builder, mock_context, noop_assets, MockRuntime},
        WebviewWindow,
    };
    use testcontainers::{
        core::{IntoContainerPort, WaitFor},
        runners::SyncRunner,
        Container, GenericImage, ImageExt,
    };

    enum TauriCommand {
        Greet,
        CreateClient,
        HealthCheck,
        GetChromaVersion,
        ResetChroma,
        FetchEmbeddings,
        FetchCollectionData,
        FetchRowCount,
        FetchCollections,
        CheckTenantAndDatabase,
        CreateCollection,
    }

    impl TauriCommand {
        fn as_str(&self) -> &str {
            match self {
                TauriCommand::Greet => "greet",
                TauriCommand::CreateClient => "create_client",
                TauriCommand::HealthCheck => "health_check",
                TauriCommand::GetChromaVersion => "get_chroma_version",
                TauriCommand::ResetChroma => "reset_chroma",
                TauriCommand::FetchEmbeddings => "fetch_embeddings",
                TauriCommand::FetchCollectionData => "fetch_collection_data",
                TauriCommand::FetchRowCount => "fetch_row_count",
                TauriCommand::FetchCollections => "fetch_collections",
                TauriCommand::CheckTenantAndDatabase => "check_tenant_and_database",
                TauriCommand::CreateCollection => "create_collection",
            }
        }
    }

    fn get_command_response(
        webview: &WebviewWindow<MockRuntime>,
        command: &str,
        body: Value,
    ) -> Result<InvokeResponseBody, Value> {
        tauri::test::get_ipc_response(
            webview,
            tauri::webview::InvokeRequest {
                cmd: command.into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(body),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        )
    }

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

    fn crate_chroma_container_with_auth(
        auth_method: chromadb::v1::client::ChromaAuthMethod,
    ) -> Container<GenericImage> {
        let image = GenericImage::new("chromadb/chroma", "0.5.5")
            .with_exposed_port(8000.tcp())
            .with_wait_for(WaitFor::message_on_stdout("Application startup complete."));

        let image = match auth_method {
            chromadb::v1::client::ChromaAuthMethod::BasicAuth { username, password } => image
                .with_env_var(
                    "CHROMA_SERVER_AUTHN_PROVIDER",
                    "chromadb.auth.basic_authn.BasicAuthenticationServerProvider",
                )
                .with_env_var(
                    "CHROMA_SERVER_AUTHN_CREDENTIALS",
                    format!("{}:{}", username, password),
                ),
            chromadb::v1::client::ChromaAuthMethod::TokenAuth { header, token } => {
                let header = match header {
                    chromadb::v1::client::ChromaTokenHeader::Authorization => "Authorization",
                    chromadb::v1::client::ChromaTokenHeader::XChromaToken => "X-Chroma-Token",
                };

                image
                    .with_env_var(
                        "CHROMA_SERVER_AUTHN_PROVIDER",
                        "chromadb.auth.token_authn.TokenAuthenticationServerProvider",
                    )
                    .with_env_var("CHROMA_SERVER_AUTHN_CREDENTIALS", token)
                    .with_env_var("CHROMA_AUTH_TOKEN_TRANSPORT_HEADER", header)
            }
            chromadb::v1::client::ChromaAuthMethod::None => image.with_env_var("name", "value"),
        };

        image.start().expect("ChromaDB started")
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
    fn test_create_client() {
        let container = create_chroma_container();

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "auth_Method": "no_auth"
                }
            }),
        );

        assert!(res.is_err(), "create_client should fail");

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth",

                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        container.stop().unwrap();

        let username = "admin";
        let password = "$2y$05$qsX5CHjxvLqruxRh035n/e/5S0TNcX0z1/hcvj7rCD99jaEG2fqP.";
        let container =
            crate_chroma_container_with_auth(chromadb::v1::client::ChromaAuthMethod::BasicAuth {
                username: username.to_string(),
                password: password.to_string(),
            });

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "basic_auth",
                    "username": username,
                    "password": "admin",
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = get_command_response(
            &webview,
            TauriCommand::CheckTenantAndDatabase.as_str(),
            json!({
                "tenant": "default_tenant",
                "database": "default_database"
            }),
        );

        assert!(
            res.is_ok(),
            "check_tenant_and_database failed: {:?}",
            res.err()
        );

        container.stop().unwrap();

        let token = "token";
        let container =
            crate_chroma_container_with_auth(chromadb::v1::client::ChromaAuthMethod::TokenAuth {
                header: chromadb::v1::client::ChromaTokenHeader::Authorization,
                token: token.to_string(),
            });

        let host = container.get_host().unwrap();
        let port = container.get_host_port_ipv4(8000).unwrap();

        let connect_url = format!("http://{}:{}", host, port);

        let app = before_each(mock_builder());
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "token_auth",
                    "tokenType": "bearer",
                    "token": token,
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = get_command_response(
            &webview,
            TauriCommand::CheckTenantAndDatabase.as_str(),
            json!({
                "tenant": "default_tenant",
                "database": "default_database"
            }),
        );

        assert!(
            res.is_ok(),
            "check_tenant_and_database failed: {:?}",
            res.err()
        );
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

        let res = get_command_response(
            &webview,
            TauriCommand::Greet.as_str(),
            json!({
                "name": connect_url
            }),
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

        let res = get_command_response(&webview, TauriCommand::HealthCheck.as_str(), json!({}));
        assert!(res.is_err(), "health_check should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "health_check failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = get_command_response(&webview, TauriCommand::HealthCheck.as_str(), json!({}));

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

        let res = get_command_response(
            &webview,
            TauriCommand::CheckTenantAndDatabase.as_str(),
            json!({
                "tenant": "default_tenant",
                "database": "default_database"
            }),
        );

        assert!(res.is_err(), "check_tenant_and_database should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "check_tenant_and_database failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = get_command_response(
            &webview,
            TauriCommand::CheckTenantAndDatabase.as_str(),
            json!({
                "tenant": "default_tenant",
                "database": "default_database"
            }),
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

        let res =
            get_command_response(&webview, TauriCommand::GetChromaVersion.as_str(), json!({}));

        assert!(res.is_err(), "get_chroma_version should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "get_chroma_version failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res =
            get_command_response(&webview, TauriCommand::GetChromaVersion.as_str(), json!({}));

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

        let res = get_command_response(&webview, TauriCommand::ResetChroma.as_str(), json!({}));

        assert!(res.is_err(), "reset_chroma should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "reset_chroma failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let res = get_command_response(&webview, TauriCommand::ResetChroma.as_str(), json!({}));

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

        let res =
            get_command_response(&webview, TauriCommand::FetchCollections.as_str(), json!({}));

        assert!(res.is_err(), "fetch_collections should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collections failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
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

        let res =
            get_command_response(&webview, TauriCommand::FetchCollections.as_str(), json!({}));

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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchRowCount.as_str(),
            json!({
                "collectionName": "test_collection"
            }),
        );

        assert!(res.is_err(), "fetch_row_count should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_row_count failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchRowCount.as_str(),
            json!({
                "collectionName": collecton_name
            }),
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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchEmbeddings.as_str(),
            json!({
                "collectionName": "test_collection",
                "limit": 0,
                "offset": 0
            }),
        );

        assert!(res.is_err(), "fetch_embeddings should fail");
        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_embeddings failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchEmbeddings.as_str(),
            json!({
                "collectionName": collecton_name,
                "limit": 0,
                "offset": 0
            }),
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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchCollectionData.as_str(),
            json!({
                "collectionName": "test_collection"
            }),
        );

        assert!(res.is_err(), "fetch_collection_data should fail");

        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collection_data failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
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

        let res = get_command_response(
            &webview,
            TauriCommand::FetchCollectionData.as_str(),
            json!({
                "collectionName": collecton_name
            }),
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
            "metadata": collection.metadata(),
            "configuration": collection.configuration_json(),
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

        let res = get_command_response(
            &webview,
            TauriCommand::CreateCollection.as_str(),
            json!({
                "collectionName": "test_collection",
                "metadata": {
                    "foo": "bar"
                }
            }),
        );

        assert!(res.is_err(), "fetch_collection_data should fail");

        assert_eq!(
            res.err().unwrap(),
            "No client found",
            "fetch_collection_data failed with different error"
        );

        let res = get_command_response(
            &webview,
            TauriCommand::CreateClient.as_str(),
            json!({
                "url": connect_url,
                "authConfig": {
                    "authMethod": "no_auth"
                }
            }),
        );

        assert!(res.is_ok(), "create_client failed: {:?}", res.err());

        let collection_name: &str = "test_collection";
        let metadata = json!({
            "foo": "bar"
        });
        let res = get_command_response(
            &webview,
            TauriCommand::CreateCollection.as_str(),
            json!({
                "collectionName": collection_name,
                "metadata": metadata
            }),
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
