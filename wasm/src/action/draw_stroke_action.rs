use std::collections::HashMap;

use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;
use crate::core::image::PixelChange;

pub struct DrawStrokeAction {
    clip_id: Uuid,
    changes: HashMap<usize, PixelChange>,
}

impl DrawStrokeAction {
    pub fn new(clip_id: Uuid) -> Self {
        Self {
            clip_id,
            changes: HashMap::new(),
        }
    }

    fn apply_changes(&self, project: &mut Project, use_after: bool) {
        let Some(clip) = project.composition.find_clip(self.clip_id) else {
            return;
        };
        let mut changed = false;
        for change in self.changes.values() {
            let Some(pixel) = clip.image.data.get_mut(change.index..change.index + 4) else {
                continue;
            };
            pixel.copy_from_slice(if use_after {
                &change.after
            } else {
                &change.before
            });
            changed = true;
        }
        if changed {
            clip.mark_image_changed();
        }
    }
}

impl Action for DrawStrokeAction {
    fn apply(&mut self, project: &mut Project) {
        self.apply_changes(project, true);
    }

    fn record_pixel_changes(&mut self, clip_id: Uuid, changes: Vec<PixelChange>) {
        if clip_id != self.clip_id {
            return;
        }
        for change in changes {
            if self.changes.contains_key(&change.index) {
                let remove = {
                    let existing = self.changes.get_mut(&change.index).unwrap();
                    existing.after = change.after;
                    existing.before == existing.after
                };
                if remove {
                    self.changes.remove(&change.index);
                }
            } else if change.before != change.after {
                self.changes.insert(change.index, change);
            }
        }
    }
}

impl UndoableAction for DrawStrokeAction {
    fn undo(&mut self, project: &mut Project) {
        self.apply_changes(project, false);
    }
}

#[cfg(test)]
mod tests {
    use super::DrawStrokeAction;
    use crate::app::{
        action_manager::ActionManager,
        clip::{BlendMode, Clip, ClipMetadata},
        composition::Composition,
        project::Project,
        project_settings::ProjectSettings,
    };
    use crate::core::image::{Image, PixelChange};
    use uuid::Uuid;

    #[test]
    fn undo_and_redo_restore_the_stroke_delta() {
        let clip_id = Uuid::new_v4();
        let before = [1, 2, 3, 255];
        let middle = [4, 5, 6, 255];
        let after = [7, 8, 9, 255];
        let mut image = Image::new(1, 1);
        image.data.copy_from_slice(&before);
        let mut composition = Composition::new();
        let layer_id = composition.layer_id_at(0);
        let clip = Clip {
            metadata: ClipMetadata {
                id: clip_id,
                name: "Test".to_string(),
                start: 0,
                layer_id,
                duration: 1,
                hidden: false,
                alpha_locked: false,
                locked: false,
                opacity: 1.0,
                blend_mode: BlendMode::Normal,
            },
            asset_id: Uuid::new_v4(),
            transform: Default::default(),
            keyframes: Vec::new(),
            image,
            image_revision: 0,
        };
        composition.add_clip(clip);
        let mut project = Project {
            composition,
            settings: ProjectSettings {
                title: "Test".to_string(),
                width: 1,
                height: 1,
                frame_rate: 1,
                start_frame: 0,
                end_frame: 1,
            },
        };
        let mut action_manager = ActionManager::new();
        action_manager.do_action(Box::new(DrawStrokeAction::new(clip_id)), &mut project);
        action_manager.begin_pixel_recording();

        action_manager.record_pixel_changes(
            clip_id,
            vec![PixelChange {
                index: 0,
                before,
                after: middle,
            }],
        );
        project
            .get_clip_mut(clip_id)
            .unwrap()
            .image
            .data
            .copy_from_slice(&middle);
        action_manager.record_pixel_changes(
            clip_id,
            vec![PixelChange {
                index: 0,
                before: middle,
                after,
            }],
        );
        project
            .get_clip_mut(clip_id)
            .unwrap()
            .image
            .data
            .copy_from_slice(&after);

        action_manager.undo(&mut project);
        assert_eq!(&project.get_clip(clip_id).unwrap().image.data[..], &before);
        action_manager.redo(&mut project);
        assert_eq!(&project.get_clip(clip_id).unwrap().image.data[..], &after);
    }
}
