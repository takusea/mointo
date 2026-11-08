use uuid::Uuid;

use crate::app::action::{Action, UndoableAction};
use crate::app::clip::{AssetId, Clip};
use crate::app::composition::Asset;
use crate::app::project::Project;

pub struct DeleteClipAction {
    clip_id: Uuid,
    deleted_clip: Option<Clip>,
    deleted_asset: Option<(AssetId, Asset)>,
}

impl DeleteClipAction {
    pub fn new(clip_id: Uuid) -> Self {
        Self {
            clip_id,
            deleted_clip: None,
            deleted_asset: None,
        }
    }
}

impl Action for DeleteClipAction {
    fn apply(&mut self, project: &mut Project) {
        self.deleted_clip = None;
        if project
            .composition()
            .get_clips()
            .iter()
            .any(|clip| clip.metadata.id == self.clip_id && clip.metadata.locked)
        {
            return;
        }
        self.deleted_asset = project
            .composition()
            .get_clip(self.clip_id)
            .and_then(|clip| {
                let asset_id = clip.asset_id();
                project
                    .composition()
                    .assets
                    .get(&asset_id)
                    .cloned()
                    .map(|asset| (asset_id, asset))
            });
        self.deleted_clip = project.composition_mut().delete_clip(self.clip_id);
    }
}

impl UndoableAction for DeleteClipAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(ref clip) = self.deleted_clip {
            if let Some((asset_id, asset)) = &self.deleted_asset {
                project
                    .composition_mut()
                    .assets
                    .insert(*asset_id, asset.clone());
            }
            project.composition_mut().add_clip(clip.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::DeleteClipAction;
    use crate::action::add_clip_action::AddClipAction;
    use crate::app::action_manager::ActionManager;
    use crate::app::composition_settings::CompositionSettings;
    use crate::app::project::Project;

    #[test]
    fn undo_and_redo_delete_clip_repeatedly_without_duplicates() {
        let mut manager = ActionManager::new();
        let mut project = Project::new(
            "Test".to_string(),
            CompositionSettings {
                width: 1,
                height: 1,
                frame_rate: 1,
                start_frame: 0,
                end_frame: 1,
            },
        );

        let layer_id = project.composition_mut().get_layers()[0].id;
        manager.do_action(Box::new(AddClipAction::new(0, layer_id)), &mut project);
        let clip_id = project.composition_mut().clips[0].metadata.id;
        manager.do_action(Box::new(DeleteClipAction::new(clip_id)), &mut project);
        assert!(project.composition_mut().clips.is_empty());

        manager.undo(&mut project);
        assert_eq!(project.composition_mut().clips.len(), 1);
        assert_eq!(project.composition_mut().clips[0].metadata.id, clip_id);

        manager.redo(&mut project);
        assert!(project.composition_mut().clips.is_empty());

        manager.undo(&mut project);
        assert_eq!(project.composition_mut().clips.len(), 1);
        assert_eq!(project.composition_mut().clips[0].metadata.id, clip_id);

        manager.redo(&mut project);
        assert!(project.composition_mut().clips.is_empty());
    }
}
