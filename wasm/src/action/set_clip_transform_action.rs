use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;
use crate::core::transform::Transform;

pub struct SetClipTransformAction {
    clip_id: Uuid,
    transform: Transform,
    previous: Option<Transform>,
}

impl SetClipTransformAction {
    pub fn new(clip_id: Uuid, transform: Transform) -> Self {
        Self {
            clip_id,
            transform,
            previous: None,
        }
    }
}

impl Action for SetClipTransformAction {
    fn apply(&mut self, project: &mut Project) {
        if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
            if clip.metadata.locked {
                return;
            }
            if self.previous.is_none() {
                self.previous = Some(clip.transform.clone());
            }
            clip.transform = self.transform.clone();
        }
    }
}

impl UndoableAction for SetClipTransformAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = self.previous.as_ref() {
            if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
                clip.transform = previous.clone();
            }
        }
    }
}
