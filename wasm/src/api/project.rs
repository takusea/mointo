use super::MointoCore;
use crate::app::clip::{BlendMode, Clip, ClipMetadata};
use crate::app::project::Project;
use crate::app::project_settings::ProjectSettings;
use crate::core::{image::Image, transform::Transform};
use gloo::utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[wasm_bindgen]
impl MointoCore {
    pub fn create_project(&mut self, settings: JsValue) -> Result<(), JsValue> {
        let settings: ProjectSettings = settings
            .into_serde()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let mut project = Project::new(settings);
        let paper_layer_id = project.composition.get_layers()[0].id;
        let mut image = Image::new(project.settings.width, project.settings.height);
        for pixel in image.data.chunks_exact_mut(4) {
            pixel.copy_from_slice(&[255, 255, 255, 255]);
        }
        let duration = project
            .settings
            .end_frame
            .saturating_sub(project.settings.start_frame)
            .saturating_add(1)
            .max(1);
        project.composition.add_clip(Clip {
            metadata: ClipMetadata {
                id: uuid::Uuid::new_v4(),
                name: "Background".to_string(),
                start: project.settings.start_frame,
                layer_id: paper_layer_id,
                duration,
                hidden: false,
                alpha_locked: false,
                locked: false,
                opacity: 1.0,
                blend_mode: BlendMode::Normal,
            },
            asset_id: uuid::Uuid::new_v4(),
            transform: Transform::default(),
            keyframes: Vec::new(),
            image,
            image_revision: 0,
        });
        self.project = Some(project);
        Ok(())
    }

    pub fn set_project_settings(&mut self, settings: JsValue) -> Result<(), JsValue> {
        let settings: ProjectSettings = settings
            .into_serde()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        project.settings = settings;
        Ok(())
    }

    pub fn width(&self) -> Option<u32> {
        if let Some(project) = self.project.as_ref() {
            Some(project.settings.width)
        } else {
            None
        }
    }

    pub fn height(&self) -> Option<u32> {
        if let Some(project) = self.project.as_ref() {
            Some(project.settings.height)
        } else {
            None
        }
    }

    pub fn get_project_settings(&self) -> Result<JsValue, JsValue> {
        let project = self
            .project
            .as_ref()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        JsValue::from_serde(&project.settings)
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }
}
