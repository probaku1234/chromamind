use serde_json::{Map, Value};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct EmbeddingData {
    pub id: String,
    pub metadata: Map<String, Value>,
    pub document: String,
    pub embedding: Vec<f32>,
}