use crate::app::action::{Action, UndoableAction};
use crate::app::project::Project;
use crate::core::image::PixelChange;
use uuid::Uuid;

pub struct ActionManager {
    undo_stack: Vec<Box<dyn UndoableAction>>,
    redo_stack: Vec<Box<dyn UndoableAction>>,
    action_group: Vec<Box<dyn UndoableAction>>,
    action_group_depth: usize,
    recording_pixel_changes: bool,
    pending_action: Option<Box<dyn UndoableAction>>,
}

impl ActionManager {
    pub fn new() -> Self {
        ActionManager {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            action_group: Vec::new(),
            action_group_depth: 0,
            recording_pixel_changes: false,
            pending_action: None,
        }
    }

    pub fn do_action(&mut self, mut action: Box<dyn UndoableAction>, project: &mut Project) {
        self.recording_pixel_changes = false;
        action.apply(project);
        if self.action_group_depth > 0 {
            self.action_group.push(action);
        } else {
            self.undo_stack.push(action);
        }
        self.redo_stack.clear();
    }

    pub fn begin_pending_action(
        &mut self,
        mut action: Box<dyn UndoableAction>,
        project: &mut Project,
    ) {
        self.recording_pixel_changes = false;
        action.apply(project);
        self.pending_action = Some(action);
        self.recording_pixel_changes = true;
    }

    pub fn commit_pending_action(&mut self) {
        self.recording_pixel_changes = false;
        let Some(action) = self.pending_action.take() else {
            return;
        };
        if self.action_group_depth > 0 {
            self.action_group.push(action);
        } else {
            self.undo_stack.push(action);
        }
        self.redo_stack.clear();
    }

    pub fn cancel_pending_action(&mut self, project: &mut Project) {
        self.recording_pixel_changes = false;
        if let Some(mut action) = self.pending_action.take() {
            action.undo(project);
        }
    }

    pub fn undo(&mut self, project: &mut Project) {
        self.recording_pixel_changes = false;
        while self.action_group_depth > 0 {
            self.end_action_group();
        }
        if let Some(mut action) = self.undo_stack.pop() {
            action.undo(project);
            self.redo_stack.push(action);
        }
    }

    pub fn redo(&mut self, project: &mut Project) {
        self.recording_pixel_changes = false;
        while self.action_group_depth > 0 {
            self.end_action_group();
        }
        if let Some(mut action) = self.redo_stack.pop() {
            action.apply(project);
            self.undo_stack.push(action);
        }
    }

    pub fn begin_action_group(&mut self) {
        self.action_group_depth += 1;
    }

    pub fn end_action_group(&mut self) {
        if self.action_group_depth == 0 {
            return;
        }

        self.action_group_depth -= 1;
        if self.action_group_depth == 0 && !self.action_group.is_empty() {
            self.undo_stack
                .push(Box::new(ActionGroup::new(std::mem::take(
                    &mut self.action_group,
                ))));
        }
    }

    pub fn begin_pixel_recording(&mut self) {
        self.recording_pixel_changes = true;
    }

    pub fn end_pixel_recording(&mut self) {
        self.recording_pixel_changes = false;
    }

    pub fn record_pixel_changes(&mut self, clip_id: Uuid, changes: Vec<PixelChange>) {
        if self.recording_pixel_changes {
            self.record_pixel_changes_to_latest(clip_id, changes);
        }
    }

    pub fn record_pixel_changes_to_latest(&mut self, clip_id: Uuid, changes: Vec<PixelChange>) {
        if let Some(action) = self.pending_action.as_mut() {
            action.record_pixel_changes(clip_id, changes);
            return;
        }
        let action = if self.action_group_depth > 0 {
            self.action_group.last_mut()
        } else {
            self.undo_stack.last_mut()
        };
        if let Some(action) = action {
            action.record_pixel_changes(clip_id, changes);
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }
}

struct ActionGroup {
    actions: Vec<Box<dyn UndoableAction>>,
}

impl ActionGroup {
    fn new(actions: Vec<Box<dyn UndoableAction>>) -> Self {
        Self { actions }
    }
}

impl Action for ActionGroup {
    fn apply(&mut self, project: &mut Project) {
        for action in &mut self.actions {
            action.apply(project);
        }
    }
}

impl UndoableAction for ActionGroup {
    fn undo(&mut self, project: &mut Project) {
        for action in self.actions.iter_mut().rev() {
            action.undo(project);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ActionManager;
    use crate::app::action::{Action, UndoableAction};
    use crate::app::composition_settings::CompositionSettings;
    use crate::app::project::Project;

    struct SetTitleAction {
        title: String,
        previous: Option<String>,
    }

    impl Action for SetTitleAction {
        fn apply(&mut self, project: &mut Project) {
            if self.previous.is_none() {
                self.previous = Some(project.title.clone());
            }
            project.title = self.title.clone();
        }
    }

    impl UndoableAction for SetTitleAction {
        fn undo(&mut self, project: &mut Project) {
            if let Some(previous) = self.previous.as_ref() {
                project.title = previous.clone();
            }
        }
    }

    #[test]
    fn grouped_actions_undo_and_redo_as_one() {
        let mut manager = ActionManager::new();
        let mut project = Project::new(
            "Original".to_string(),
            CompositionSettings {
                width: 1,
                height: 1,
                frame_rate: 1,
                start_frame: 0,
                end_frame: 1,
            },
        );

        manager.begin_action_group();
        manager.do_action(
            Box::new(SetTitleAction {
                title: "First edit".to_string(),
                previous: None,
            }),
            &mut project,
        );
        manager.do_action(
            Box::new(SetTitleAction {
                title: "Final edit".to_string(),
                previous: None,
            }),
            &mut project,
        );
        assert!(!manager.can_undo());

        manager.end_action_group();
        assert!(manager.can_undo());
        manager.undo(&mut project);
        assert_eq!(project.title, "Original");

        manager.redo(&mut project);
        assert_eq!(project.title, "Final edit");
    }
}
