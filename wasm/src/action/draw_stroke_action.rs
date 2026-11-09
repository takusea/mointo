use std::collections::{hash_map::Entry, HashMap};

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
        let Some(clip) = project.composition_mut().find_clip(self.clip_id) else {
            return;
        };
        let mut changed = false;
        for change in self.changes.values() {
            let Some(image) = clip.image_mut() else {
                return;
            };
            let Some(pixel) = image.data.get_mut(change.index..change.index + 4) else {
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
            let Some(image) = clip.image() else {
                return;
            };
            let mut left = image.width;
            let mut top = image.height;
            let mut right = 0;
            let mut bottom = 0;
            for change in self.changes.values() {
                let pixel = change.index / 4;
                let x = (pixel % image.width as usize) as u32;
                let y = (pixel / image.width as usize) as u32;
                left = left.min(x);
                top = top.min(y);
                right = right.max(x + 1);
                bottom = bottom.max(y + 1);
            }
            clip.mark_image_region_changed([left, top, right - left, bottom - top]);
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
            match self.changes.entry(change.index) {
                Entry::Occupied(mut entry) => {
                    let existing = entry.get_mut();
                    existing.after = change.after;
                    if existing.before == existing.after {
                        entry.remove();
                    }
                }
                Entry::Vacant(entry) if change.before != change.after => {
                    entry.insert(change);
                }
                Entry::Vacant(_) => {}
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
        clip::{Clip, ClipMetadata},
        composition::Composition,
        composition_settings::CompositionSettings,
        project::Project,
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
        let clip = Clip::new_image(
            ClipMetadata {
                id: clip_id,
                name: "Test".to_string(),
                start: 0,
                layer_id,
                duration: 1,
                hidden: false,
                locked: false,
            },
            Uuid::new_v4(),
            image,
            Default::default(),
            Vec::new(),
        );
        composition.add_clip(clip);
        composition.settings = CompositionSettings {
            width: 1,
            height: 1,
            frame_rate: 1,
            start_frame: 0,
            end_frame: 1,
        };
        let mut project = Project {
            title: "Test".to_string(),
            compositions: vec![composition],
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
            .image_mut()
            .unwrap()
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
            .image_mut()
            .unwrap()
            .data
            .copy_from_slice(&after);

        action_manager.undo(&mut project);
        assert_eq!(
            &project.get_clip(clip_id).unwrap().image().unwrap().data[..],
            &before
        );
        action_manager.redo(&mut project);
        assert_eq!(
            &project.get_clip(clip_id).unwrap().image().unwrap().data[..],
            &after
        );
    }
}
