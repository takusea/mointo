use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;

pub struct SetClipNameAction {
    clip_id: Uuid,
    name: String,
    previous: Option<String>,
}

impl SetClipNameAction {
    pub fn new(clip_id: Uuid, name: String) -> Self {
        Self {
            clip_id,
            name,
            previous: None,
        }
    }
}

impl Action for SetClipNameAction {
    fn apply(&mut self, project: &mut Project) {
        if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
            if self.previous.is_none() {
                self.previous = Some(clip.metadata.name.clone());
            }
            clip.metadata.name = self.name.clone();
        }
    }
}

impl UndoableAction for SetClipNameAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = &self.previous {
            if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
                clip.metadata.name = previous.clone();
            }
        }
    }
}
