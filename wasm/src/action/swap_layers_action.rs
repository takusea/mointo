use crate::app::action::{Action, UndoableAction};
use crate::app::layer::LayerId;
use crate::app::project::Project;

pub struct SwapLayersAction {
    first_layer_id: LayerId,
    second_layer_id: LayerId,
}

impl SwapLayersAction {
    pub fn new(first_layer_id: LayerId, second_layer_id: LayerId) -> Self {
        Self {
            first_layer_id,
            second_layer_id,
        }
    }

    fn swap(&self, project: &mut Project) {
        project
            .composition_mut()
            .swap_layer_order_by_id(self.first_layer_id, self.second_layer_id);
    }
}

impl Action for SwapLayersAction {
    fn apply(&mut self, project: &mut Project) {
        self.swap(project);
    }
}

impl UndoableAction for SwapLayersAction {
    fn undo(&mut self, project: &mut Project) {
        self.swap(project);
    }
}

#[cfg(test)]
mod tests {
    use super::SwapLayersAction;
    use crate::app::action_manager::ActionManager;
    use crate::app::composition_settings::CompositionSettings;
    use crate::app::project::Project;

    #[test]
    fn swapping_layers_can_be_undone_and_redone() {
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
        let layer_ids: Vec<_> = project
            .composition()
            .get_layers()
            .iter()
            .map(|layer| layer.id)
            .collect();
        let mut action_manager = ActionManager::new();

        action_manager.do_action(
            Box::new(SwapLayersAction::new(layer_ids[0], layer_ids[1])),
            &mut project,
        );
        assert_eq!(
            project
                .composition()
                .get_layers()
                .iter()
                .map(|layer| layer.id)
                .collect::<Vec<_>>(),
            [layer_ids[1], layer_ids[0], layer_ids[2]]
        );

        action_manager.undo(&mut project);
        assert_eq!(
            project
                .composition()
                .get_layers()
                .iter()
                .map(|layer| layer.id)
                .collect::<Vec<_>>(),
            layer_ids
        );

        action_manager.redo(&mut project);
        assert_eq!(
            project
                .composition()
                .get_layers()
                .iter()
                .map(|layer| layer.id)
                .collect::<Vec<_>>(),
            [layer_ids[1], layer_ids[0], layer_ids[2]]
        );
    }
}
