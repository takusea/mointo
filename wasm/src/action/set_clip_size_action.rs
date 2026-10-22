use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;
use crate::core::image::Image;

pub struct SetClipSizeAction {
    clip_id: Uuid,
    width: u32,
    height: u32,
    previous: Option<Image>,
}

impl SetClipSizeAction {
    pub fn new(clip_id: Uuid, width: u32, height: u32) -> Self {
        Self {
            clip_id,
            width,
            height,
            previous: None,
        }
    }
}

impl Action for SetClipSizeAction {
    fn apply(&mut self, project: &mut Project) {
        if self.width == 0 || self.height == 0 {
            return;
        }
        if let Some(clip) = project.composition.find_clip(self.clip_id) {
            if clip.metadata.locked {
                return;
            }
            if self.previous.is_none() {
                self.previous = Some(clip.image.clone());
            }
            if clip.image.width == self.width && clip.image.height == self.height {
                return;
            }
            let mut resized = Image::new(self.width, self.height);
            let copy_width = clip.image.width.min(self.width) as usize;
            let copy_height = clip.image.height.min(self.height) as usize;
            for y in 0..copy_height {
                let old_start = y * clip.image.width as usize * 4;
                let new_start = y * self.width as usize * 4;
                let length = copy_width * 4;
                resized.data[new_start..new_start + length]
                    .copy_from_slice(&clip.image.data[old_start..old_start + length]);
            }
            clip.set_image(resized);
        }
    }
}

impl UndoableAction for SetClipSizeAction {
    fn undo(&mut self, project: &mut Project) {
        if let (Some(previous), Some(clip)) = (
            self.previous.as_ref(),
            project.composition.find_clip(self.clip_id),
        ) {
            clip.set_image(previous.clone());
        }
    }
}
