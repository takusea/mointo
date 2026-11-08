use uuid::Uuid;

use crate::app::action::Action;
use crate::app::action::UndoableAction;
use crate::app::clip::{Clip, ClipMetadata};
use crate::app::composition::Asset;
use crate::app::layer::LayerId;
use crate::app::project::Project;
use crate::core::image::Image;
use crate::core::transform::Transform;

pub struct AddClipAction {
    start_frame: u32,
    layer_id: LayerId,
    content: AddClipContent,
    clip_id: Option<Uuid>,
    name: Option<String>,
    duration: u32,
}

enum AddClipContent {
    Image {
        size: Option<(u32, u32)>,
    },
    Audio {
        asset_id: Uuid,
        data: Vec<u8>,
        mime_type: String,
    },
}

impl AddClipAction {
    pub fn new(start_frame: u32, layer_id: LayerId) -> Self {
        Self {
            start_frame,
            layer_id,
            content: AddClipContent::Image { size: None },
            clip_id: None,
            name: None,
            duration: 1,
        }
    }

    pub fn with_image_size(start_frame: u32, layer_id: LayerId, width: u32, height: u32) -> Self {
        Self {
            start_frame,
            layer_id,
            content: AddClipContent::Image {
                size: Some((width, height)),
            },
            clip_id: None,
            name: None,
            duration: 1,
        }
    }

    pub fn audio(
        start_frame: u32,
        layer_id: LayerId,
        duration: u32,
        audio_data: Vec<u8>,
        audio_mime_type: String,
        name: String,
    ) -> Self {
        Self {
            start_frame,
            layer_id,
            content: AddClipContent::Audio {
                asset_id: Uuid::new_v4(),
                data: audio_data,
                mime_type: audio_mime_type,
            },
            clip_id: None,
            name: Some(name),
            duration: duration.max(1),
        }
    }
}

impl Action for AddClipAction {
    fn apply(&mut self, project: &mut Project) {
        let clip_id = *self.clip_id.get_or_insert_with(Uuid::new_v4);
        let name = self
            .name
            .get_or_insert_with(|| format!("Clip {}", project.composition_mut().clips.len() + 1))
            .clone();
        let metadata = ClipMetadata {
            id: clip_id,
            name,
            start: self.start_frame,
            layer_id: self.layer_id,
            duration: self.duration,
            hidden: false,
            locked: false,
        };
        let clip = match &self.content {
            AddClipContent::Image { size } => {
                let (width, height) = size.unwrap_or((
                    project.composition().settings.width,
                    project.composition().settings.height,
                ));
                Clip::new_image(
                    metadata,
                    Uuid::new_v4(),
                    Image::new(width, height),
                    Transform::default(),
                    Vec::new(),
                )
            }
            AddClipContent::Audio {
                asset_id,
                data,
                mime_type,
            } => {
                project
                    .composition_mut()
                    .assets
                    .insert(*asset_id, Asset::Audio(data.clone()));
                Clip::new_audio(
                    metadata,
                    *asset_id,
                    mime_type.clone(),
                    Transform::default(),
                    Vec::new(),
                )
            }
        };
        project.composition_mut().add_clip(clip);
    }
}

#[cfg(test)]
mod tests {
    use super::AddClipAction;
    use crate::action::move_clip_action::MoveClipAction;
    use crate::app::action_manager::ActionManager;
    use crate::app::composition_settings::CompositionSettings;
    use crate::app::project::Project;

    #[test]
    fn redo_preserves_clip_id_for_later_action_redo() {
        let mut manager = ActionManager::new();
        let mut project = Project::new(
            "Test".to_string(),
            CompositionSettings {
                width: 1,
                height: 1,
                frame_rate: 1,
                start_frame: 0,
                end_frame: 1,
            },
        );

        let original_layer_id = project.composition_mut().get_layers()[0].id;
        let move_target_layer_id = project.composition_mut().get_layers()[1].id;
        manager.do_action(
            Box::new(AddClipAction::new(0, original_layer_id)),
            &mut project,
        );
        let clip_id = project.composition_mut().clips[0].metadata.id;
        manager.do_action(
            Box::new(MoveClipAction::new(clip_id, 5, move_target_layer_id)),
            &mut project,
        );

        manager.undo(&mut project);
        assert_eq!(
            project.composition_mut().clips[0].metadata.layer_id,
            original_layer_id
        );
        manager.undo(&mut project);
        assert!(project.composition_mut().clips.is_empty());

        project.composition_mut().insert_layer(0);
        manager.redo(&mut project);
        assert_eq!(project.composition_mut().clips[0].metadata.id, clip_id);
        assert_eq!(
            project.composition_mut().clips[0].metadata.layer_id,
            original_layer_id
        );
        assert_eq!(project.composition_mut().clips[0].metadata.start, 0);

        manager.redo(&mut project);
        assert_eq!(project.composition_mut().clips[0].metadata.id, clip_id);
        assert_eq!(
            project.composition_mut().clips[0].metadata.layer_id,
            move_target_layer_id
        );
        assert_eq!(project.composition_mut().clips[0].metadata.start, 5);
    }
}

impl UndoableAction for AddClipAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(clip_id) = self.clip_id {
            project.composition_mut().delete_clip(clip_id);
        }
    }
}
