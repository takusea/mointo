use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::composition::LayerId;
use crate::app::project::Project;

pub struct MoveClipAction {
    clip_id: Uuid,
    start_frame: u32,
    layer_id: LayerId,
    previous: Option<(u32, LayerId)>,
}

impl MoveClipAction {
    pub fn new(clip_id: Uuid, start_frame: u32, layer_id: LayerId) -> Self {
        Self {
            clip_id,
            start_frame,
            layer_id,
            previous: None,
        }
    }
}

impl Action for MoveClipAction {
    fn apply(&mut self, project: &mut Project) {
        if project
            .composition()
            .get_clips()
            .iter()
            .any(|clip| clip.metadata.id == self.clip_id && clip.metadata.locked)
        {
            return;
        }
        if self.previous.is_none() {
            self.previous = project
                .composition()
                .get_clips()
                .iter()
                .find(|clip| clip.metadata.id == self.clip_id)
                .map(|clip| (clip.metadata.start, clip.metadata.layer_id));
        }
        project
            .composition_mut()
            .move_clip_to_layer(self.clip_id, self.start_frame, self.layer_id);
    }
}

impl UndoableAction for MoveClipAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some((start_frame, layer_id)) = self.previous {
            project
                .composition_mut()
                .move_clip_to_layer(self.clip_id, start_frame, layer_id);
        }
    }
}
