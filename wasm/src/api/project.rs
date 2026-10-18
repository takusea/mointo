use super::MointoCore;
use crate::app::project::Project;
use crate::app::project_settings::ProjectSettings;
use gloo::utils::format::JsValueSerdeExt;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[wasm_bindgen]
impl MointoCore {
    pub fn create_project(&mut self, settings: JsValue) -> Result<(), JsValue> {
        let settings: ProjectSettings = settings
            .into_serde()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        self.project = Some(Project::new(settings));
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
