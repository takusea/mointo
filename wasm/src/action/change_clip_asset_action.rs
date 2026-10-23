use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;
use crate::core::image::Image;

pub struct ChangeClipAssetAction {
    clip_id: Uuid,
    linked_asset_id: Option<Uuid>,
    previous: Option<(Uuid, Image)>,
    unlinked_asset_id: Option<Uuid>,
}

impl ChangeClipAssetAction {
    pub fn link(clip_id: Uuid, asset_id: Uuid) -> Self {
        Self {
            clip_id,
            linked_asset_id: Some(asset_id),
            previous: None,
            unlinked_asset_id: None,
        }
    }

    pub fn unlink(clip_id: Uuid) -> Self {
        Self {
            clip_id,
            linked_asset_id: None,
            previous: None,
            unlinked_asset_id: None,
        }
    }

    fn discard_orphan(project: &mut Project, asset_id: Uuid) {
        if !project
            .composition()
            .clips
            .iter()
            .any(|clip| clip.asset_id == asset_id)
        {
            project.composition_mut().assets.remove(&asset_id);
        }
    }
}

impl Action for ChangeClipAssetAction {
    fn apply(&mut self, project: &mut Project) {
        let Some(current) = project.composition_mut().get_clip(self.clip_id) else {
            return;
        };
        if self.previous.is_none() {
            self.previous = Some((current.asset_id, current.image.clone()));
        }
        let next_asset_id = match self.linked_asset_id {
            Some(asset_id) => asset_id,
            None => *self.unlinked_asset_id.get_or_insert_with(Uuid::new_v4),
        };
        let image = if self.linked_asset_id.is_some() {
            let Some(image) = project.composition_mut().assets.get(&next_asset_id).cloned() else {
                return;
            };
            image
        } else {
            self.previous.as_ref().unwrap().1.clone()
        };
        let previous_asset_id = self.previous.as_ref().unwrap().0;
        let Some(clip) = project.composition_mut().find_clip(self.clip_id) else {
            return;
        };
        clip.asset_id = next_asset_id;
        clip.set_image(image.clone());
        project.composition_mut().assets.insert(next_asset_id, image);
        Self::discard_orphan(project, previous_asset_id);
    }
}

impl UndoableAction for ChangeClipAssetAction {
    fn undo(&mut self, project: &mut Project) {
        let Some((previous_asset_id, previous_image)) = self.previous.as_ref() else {
            return;
        };
        let Some(clip) = project.composition_mut().find_clip(self.clip_id) else {
            return;
        };
        let current_asset_id = clip.asset_id;
        clip.asset_id = *previous_asset_id;
        clip.set_image(previous_image.clone());
        project
            .composition_mut()
            .assets
            .insert(*previous_asset_id, previous_image.clone());
        Self::discard_orphan(project, current_asset_id);
    }
}
