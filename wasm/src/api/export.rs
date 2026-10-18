use wasm_bindgen::prelude::wasm_bindgen;

use super::MointoCore;
use crate::app::project::Project;

fn decode_project(data: &[u8]) -> Result<Project, String> {
    let mut project = rmp_serde::from_slice::<Project>(data).map_err(|error| error.to_string())?;
    project.composition.ensure_layers()?;
    Ok(project)
}

#[wasm_bindgen]
impl MointoCore {
    pub fn export(&self) -> Vec<u8> {
        rmp_serde::to_vec(&self.project).unwrap()
    }

    pub fn import(&mut self, data: &[u8]) {
        match decode_project(data) {
            Ok(project) => self.project = Some(project),
            Err(error) => {
                eprintln!("Failed to import composition: {error}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::decode_project;
    use crate::app::project::Project;
    use crate::app::project_settings::ProjectSettings;

    #[test]
    fn project_layer_ids_survive_serialization_round_trip() {
        let project = Project::new(ProjectSettings {
            title: "Test project".to_string(),
            width: 1,
            height: 1,
            frame_rate: 24,
            start_frame: 0,
            end_frame: 10,
        });
        let layer_ids: Vec<_> = project
            .composition
            .get_layers()
            .iter()
            .map(|layer| layer.id)
            .collect();
        let bytes = rmp_serde::to_vec(&project).unwrap();

        let restored = decode_project(&bytes).unwrap();

        assert_eq!(
            restored
                .composition
                .get_layers()
                .iter()
                .map(|layer| layer.id)
                .collect::<Vec<_>>(),
            layer_ids
        );
    }
}
