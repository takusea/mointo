use super::MointoCore;
use crate::app::clip::{BlendMode, Clip, ClipMetadata};
use crate::app::project::Project;
use crate::app::composition_settings::CompositionSettings;
use crate::core::{image::Image, transform::Transform};
use gloo::utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[derive(serde::Deserialize)]
struct NewProjectData {
    title: String,
    width: u32,
    height: u32,
    frame_rate: u32,
    start_frame: u32,
    end_frame: u32,
}

#[wasm_bindgen]
impl MointoCore {
    pub fn create_project(&mut self, settings: JsValue) -> Result<(), JsValue> {
        let data: NewProjectData = settings
            .into_serde()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let settings = CompositionSettings { width: data.width, height: data.height, frame_rate: data.frame_rate, start_frame: data.start_frame, end_frame: data.end_frame };
        let mut project = Project::new(data.title, settings);
        let paper_layer_id = project.composition_mut().get_layers()[0].id;
        project
            .composition_mut()
            .set_layer_locked_by_id(paper_layer_id, true);
        let mut image = Image::new(project.composition().settings.width, project.composition().settings.height);
        for pixel in image.data.chunks_exact_mut(4) {
            pixel.copy_from_slice(&[255, 255, 255, 255]);
        }
        let start_frame = project.settings().start_frame;
        let duration = project
            .settings()
            .end_frame
            .saturating_sub(start_frame)
            .saturating_add(1)
            .max(1);
        project.composition_mut().add_clip(Clip {
            metadata: ClipMetadata {
                id: uuid::Uuid::new_v4(),
                name: "Background".to_string(),
                start: start_frame,
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

    pub fn set_composition_settings(&mut self, settings: JsValue) -> Result<(), JsValue> {
        let settings: CompositionSettings = settings
            .into_serde()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        *project.settings_mut() = settings;
        Ok(())
    }

    pub fn set_project_title(&mut self, title: String) -> Result<(), JsValue> {
        let project = self.project.as_mut().ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        project.title = title;
        Ok(())
    }

    pub fn get_project_title(&self) -> Option<String> {
        self.project.as_ref().map(|project| project.title.clone())
    }

    pub fn width(&self) -> Option<u32> {
        if let Some(project) = self.project.as_ref() {
            Some(project.composition().settings.width)
        } else {
            None
        }
    }

    pub fn height(&self) -> Option<u32> {
        if let Some(project) = self.project.as_ref() {
            Some(project.composition().settings.height)
        } else {
            None
        }
    }

    pub fn get_composition_settings(&self) -> Result<JsValue, JsValue> {
        let project = self
            .project
            .as_ref()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        JsValue::from_serde(&project.composition().settings)
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }
}
