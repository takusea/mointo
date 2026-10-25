use crate::app::action::{Action, UndoableAction};
use crate::app::layer::LayerId;
use crate::app::project::Project;

pub struct SetLayerVisibilityAction {
    layer_id: LayerId,
    hidden: bool,
    previous: Option<bool>,
}

impl SetLayerVisibilityAction {
    pub fn new(layer_id: LayerId, hidden: bool) -> Self {
        Self {
            layer_id,
            hidden,
            previous: None,
        }
    }
}

impl Action for SetLayerVisibilityAction {
    fn apply(&mut self, project: &mut Project) {
        let was_hidden = project
            .composition()
            .is_layer_hidden_by_id(self.layer_id)
            .expect("Layer action references an unknown layer");
        if self.previous.is_none() {
            self.previous = Some(was_hidden);
        }
        project
            .composition_mut()
            .set_layer_visible_by_id(self.layer_id, !self.hidden);
    }
}

impl UndoableAction for SetLayerVisibilityAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = self.previous {
            project
                .composition_mut()
                .set_layer_visible_by_id(self.layer_id, !previous);
        }
    }
}
