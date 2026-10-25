use crate::app::action::{Action, UndoableAction};
use crate::app::layer::LayerId;
use crate::app::project::Project;

pub struct SetLayerLockAction {
    layer_id: LayerId,
    locked: bool,
    previous: Option<bool>,
}

impl SetLayerLockAction {
    pub fn new(layer_id: LayerId, locked: bool) -> Self {
        Self {
            layer_id,
            locked,
            previous: None,
        }
    }
}

impl Action for SetLayerLockAction {
    fn apply(&mut self, project: &mut Project) {
        let was_locked = project
            .composition()
            .is_layer_locked_by_id(self.layer_id)
            .expect("Layer action references an unknown layer");
        if self.previous.is_none() {
            self.previous = Some(was_locked);
        }
        project
            .composition_mut()
            .set_layer_locked_by_id(self.layer_id, self.locked);
    }
}

impl UndoableAction for SetLayerLockAction {
    fn undo(&mut self, project: &mut Project) {
        if let Some(previous) = self.previous {
            project
                .composition_mut()
                .set_layer_locked_by_id(self.layer_id, previous);
        }
    }
}
