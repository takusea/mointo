use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type LayerId = Uuid;

#[derive(Serialize, Deserialize, Clone)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    #[serde(default = "default_layer_visible")]
    pub visible: bool,
    #[serde(default)]
    pub locked: bool,
}

fn default_layer_visible() -> bool {
    true
}

impl Layer {
    pub(crate) fn new(index: usize) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: format!("Layer {}", index + 1),
            visible: true,
            locked: false,
        }
    }
}
