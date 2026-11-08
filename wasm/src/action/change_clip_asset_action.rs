use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::clip::ClipContent;
use crate::app::composition::Asset;
use crate::app::project::Project;

pub struct ChangeClipAssetAction {
    clip_id: Uuid,
    linked_asset_id: Option<Uuid>,
    previous: Option<(Uuid, Asset)>,
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
            .any(|clip| clip.asset_id() == asset_id)
        {
            project.composition_mut().assets.remove(&asset_id);
        }
    }

    fn asset_matches_clip(asset: &Asset, content: &ClipContent) -> bool {
        matches!(
            (asset, content),
            (Asset::Image(_), ClipContent::Image { .. })
                | (Asset::Audio(_), ClipContent::Audio { .. })
        )
    }
}

impl Action for ChangeClipAssetAction {
    fn apply(&mut self, project: &mut Project) {
        let Some(current) = project.composition().get_clip(self.clip_id) else {
            return;
        };
        let previous_asset_id = current.asset_id();
        let Some(previous_asset) = project
            .composition()
            .assets
            .get(&previous_asset_id)
            .cloned()
        else {
            return;
        };
        if !Self::asset_matches_clip(&previous_asset, &current.content) {
            return;
        }
        let content = current.content.clone();
        let next_asset_id = match self.linked_asset_id {
            Some(asset_id) => asset_id,
            None => *self.unlinked_asset_id.get_or_insert_with(Uuid::new_v4),
        };
        let next_asset = if self.linked_asset_id.is_some() {
            let Some(asset) = project.composition().assets.get(&next_asset_id).cloned() else {
                return;
            };
            if !Self::asset_matches_clip(&asset, &content) {
                return;
            }
            asset
        } else {
            previous_asset
        };
        if self.previous.is_none() {
            self.previous = Some((
                previous_asset_id,
                project
                    .composition()
                    .assets
                    .get(&previous_asset_id)
                    .expect("validated clip asset must exist")
                    .clone(),
            ));
        }

        let Some(clip) = project.composition_mut().find_clip(self.clip_id) else {
            return;
        };
        clip.set_asset_id(next_asset_id);
        if let (Asset::Image(image), ClipContent::Image { .. }) = (&next_asset, &content) {
            clip.set_image(image.clone());
        }
        project
            .composition_mut()
            .assets
            .insert(next_asset_id, next_asset);
        Self::discard_orphan(project, previous_asset_id);
    }
}

impl UndoableAction for ChangeClipAssetAction {
    fn undo(&mut self, project: &mut Project) {
        let Some((previous_asset_id, previous_asset)) = self.previous.as_ref() else {
            return;
        };
        let Some(clip) = project.composition_mut().find_clip(self.clip_id) else {
            return;
        };
        let current_asset_id = clip.set_asset_id(*previous_asset_id);
        if let Asset::Image(image) = previous_asset {
            clip.set_image(image.clone());
        }
        project
            .composition_mut()
            .assets
            .insert(*previous_asset_id, previous_asset.clone());
        Self::discard_orphan(project, current_asset_id);
    }
}

#[cfg(test)]
mod tests {
    use super::ChangeClipAssetAction;
    use crate::app::action_manager::ActionManager;
    use crate::app::clip::{Clip, ClipMetadata};
    use crate::app::composition::Asset;
    use crate::app::composition_settings::CompositionSettings;
    use crate::app::project::Project;
    use crate::core::transform::Transform;
    use uuid::Uuid;

    fn add_audio_clip(project: &mut Project, layer_id: Uuid, bytes: Vec<u8>) -> (Uuid, Uuid) {
        let clip_id = Uuid::new_v4();
        let asset_id = Uuid::new_v4();
        project
            .composition_mut()
            .assets
            .insert(asset_id, Asset::Audio(bytes));
        project.composition_mut().add_clip(Clip::new_audio(
            ClipMetadata {
                id: clip_id,
                name: "Audio".to_string(),
                start: 0,
                layer_id,
                duration: 10,
                hidden: false,
                locked: false,
            },
            asset_id,
            "audio/wav".to_string(),
            Transform::default(),
            Vec::new(),
        ));
        (clip_id, asset_id)
    }

    #[test]
    fn audio_assets_can_be_linked_unlinked_and_undone() {
        let mut manager = ActionManager::new();
        let mut project = Project::new(
            "Test".to_string(),
            CompositionSettings {
                width: 1,
                height: 1,
                frame_rate: 1,
                start_frame: 0,
                end_frame: 10,
            },
        );
        let layer_id = project.composition_mut().layer_id_at(0);
        let (source_id, source_asset_id) = add_audio_clip(&mut project, layer_id, vec![1, 2, 3]);
        let (target_id, target_asset_id) = add_audio_clip(&mut project, layer_id, vec![4, 5, 6]);

        manager.do_action(
            Box::new(ChangeClipAssetAction::link(target_id, source_asset_id)),
            &mut project,
        );
        assert_eq!(
            project.get_clip(target_id).unwrap().asset_id(),
            source_asset_id
        );
        assert_eq!(
            project
                .composition()
                .audio_data(project.get_clip(target_id).unwrap()),
            Some(&[1, 2, 3][..])
        );

        manager.undo(&mut project);
        assert_eq!(
            project.get_clip(target_id).unwrap().asset_id(),
            target_asset_id
        );
        assert_eq!(
            project
                .composition()
                .audio_data(project.get_clip(target_id).unwrap()),
            Some(&[4, 5, 6][..])
        );
        manager.redo(&mut project);

        manager.do_action(
            Box::new(ChangeClipAssetAction::unlink(target_id)),
            &mut project,
        );
        assert_ne!(
            project.get_clip(target_id).unwrap().asset_id(),
            source_asset_id
        );
        assert_eq!(
            project
                .composition()
                .audio_data(project.get_clip(target_id).unwrap()),
            Some(&[1, 2, 3][..])
        );
        manager.undo(&mut project);
        assert_eq!(
            project.get_clip(source_id).unwrap().asset_id(),
            project.get_clip(target_id).unwrap().asset_id()
        );
    }
}
