use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::app::clip::Clip;
use crate::app::composition::Composition;
use crate::app::composition_settings::CompositionSettings;

#[derive(Serialize, Deserialize)]
pub struct Project {
    pub title: String,
    pub compositions: Vec<Composition>,
}

impl Project {
    pub fn new(title: String, settings: CompositionSettings) -> Self {
        let mut composition = Composition::new();
        composition.settings = settings;
        Self {
            title,
            compositions: vec![composition],
        }
    }

    pub fn composition(&self) -> &Composition {
        &self.compositions[0]
    }
    pub fn composition_mut(&mut self) -> &mut Composition {
        &mut self.compositions[0]
    }
    pub fn settings(&self) -> &CompositionSettings {
        &self.compositions[0].settings
    }
    pub fn settings_mut(&mut self) -> &mut CompositionSettings {
        &mut self.compositions[0].settings
    }

    pub fn get_clip(&self, clip_id: Uuid) -> Option<&Clip> {
        self.composition().get_clip(clip_id)
    }

    pub fn get_clip_mut(&mut self, clip_id: Uuid) -> Option<&mut Clip> {
        self.composition_mut().find_clip(clip_id)
    }

    pub fn is_clip_locked(&self, clip_id: Uuid) -> bool {
        match self.get_clip(clip_id) {
            Some(clip) => {
                clip.metadata.locked
                    || self
                        .composition()
                        .layer_index(clip.metadata.layer_id)
                        .is_some_and(|index| self.composition().is_layer_locked(index))
            }
            None => false,
        }
    }
}
