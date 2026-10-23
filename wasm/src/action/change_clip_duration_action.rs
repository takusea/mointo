use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;

pub struct ChangeClipDurationAction {
    clip_id: Uuid,
    duration: u32,
    previous: Option<u32>,
}

impl ChangeClipDurationAction {
    pub fn new(clip_id: Uuid, duration: u32) -> Self {
        Self {
            clip_id,
            duration: duration.max(1),
            previous: None,
        }
    }
}

impl Action for ChangeClipDurationAction {
    fn apply(&mut self, project: &mut Project) {
        if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
            if clip.metadata.locked {
                return;
            }
            if self.previous.is_none() {
                self.previous = Some(clip.metadata.duration);
            }
            clip.metadata.duration = self.duration;
        }
    }
}

impl UndoableAction for ChangeClipDurationAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = self.previous {
            if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
                clip.metadata.duration = previous;
            }
        }
    }
}
