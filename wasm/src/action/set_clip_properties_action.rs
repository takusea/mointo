use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::clip::ClipProperties;
use crate::app::project::Project;

pub struct SetClipPropertiesAction {
    clip_id: Uuid,
    properties: ClipProperties,
    previous: Option<ClipProperties>,
}

impl SetClipPropertiesAction {
    pub fn new(clip_id: Uuid, properties: ClipProperties) -> Self {
        Self {
            clip_id,
            properties,
            previous: None,
        }
    }
}

impl Action for SetClipPropertiesAction {
    fn apply(&mut self, project: &mut Project) {
        if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
            if clip.metadata.locked {
                if !self.properties.locked {
                    self.previous = Some(clip.properties());
                    let mut properties = clip.properties();
                    properties.locked = false;
                    clip.set_properties(properties);
                }
                return;
            }

            if self.previous.is_none() {
                self.previous = Some(clip.properties());
            }
            clip.set_properties(self.properties);
        }
    }
}

impl UndoableAction for SetClipPropertiesAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = self.previous {
            if let Some(clip) = project.composition_mut().find_clip(self.clip_id) {
                clip.set_properties(previous);
            }
        }
    }
}
