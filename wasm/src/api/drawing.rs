use super::FlippenCore;
use crate::action::draw_stroke_action::DrawStrokeAction;
use crate::action::set_layer_lock_action::SetLayerLockAction;
use crate::action::set_layer_visibility_action::SetLayerVisibilityAction;
use crate::app::composition::LayerId;
use crate::core::image::Image;
use crate::core::tool::{ToolId, ToolPropertyValue};
use gloo::utils::format::JsValueSerdeExt;
use uuid::Uuid;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

fn parse_tool_id(current_tool: &str) -> Option<ToolId> {
    match current_tool.parse::<ToolId>() {
        Ok(tool_id) => Some(tool_id),
        Err(_) => {
            eprintln!("Unknown tool: {}.", current_tool);
            None
        }
    }
}

#[wasm_bindgen]
impl FlippenCore {
    pub fn begin_draw(&mut self, clip_id_str: String) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return;
            }
        };
        if self
            .project
            .as_ref()
            .is_some_and(|project| project.is_clip_locked(clip_id))
        {
            return;
        }
        if let Some(tool) = self.tools.get_mut(ToolId::Pen) {
            tool.begin_stroke();
        }
        let action = Box::new(DrawStrokeAction::new(clip_id));
        if let Some(project) = self.project.as_mut() {
            self.action_manager.begin_pending_action(action, project);
        }
    }

    pub fn end_draw(&mut self) {
        if let Some(tool) = self.tools.get_mut(ToolId::Pen) {
            tool.end_stroke();
        }
        self.action_manager.commit_pending_action();
    }

    pub fn cancel_draw(&mut self) {
        if let Some(tool) = self.tools.get_mut(ToolId::Pen) {
            tool.end_stroke();
        }
        if let Some(project) = self.project.as_mut() {
            self.action_manager.cancel_pending_action(project);
        }
    }

    pub fn begin_action_group(&mut self) {
        self.action_manager.begin_action_group();
    }

    pub fn end_action_group(&mut self) {
        self.action_manager.end_action_group();
    }

    pub fn undo(&mut self) {
        if let Some(project) = self.project.as_mut() {
            self.action_manager.undo(project);
        }
    }

    pub fn redo(&mut self) {
        if let Some(project) = self.project.as_mut() {
            self.action_manager.redo(project);
        }
    }

    pub fn can_undo(&self) -> bool {
        self.action_manager.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.action_manager.can_redo()
    }

    pub fn apply_tool(
        &mut self,
        clip_id_str: String,
        current_tool: &str,
        x: u32,
        y: u32,
        color: &[u8],
        pressure: f32,
    ) {
        let points = [x as f64, y as f64, pressure as f64];
        self.apply_tool_points(clip_id_str, current_tool, &points, color);
    }

    pub fn apply_tool_points(
        &mut self,
        clip_id_str: String,
        current_tool: &str,
        points: &[f64],
        color: &[u8],
    ) {
        if points.len() % 3 != 0 {
            eprintln!("Point data must contain x, y, and pressure for each point.");
            return;
        }

        if color.len() != 4 {
            eprintln!("Color array must have exactly 4 elements.");
            return;
        }

        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return;
            }
        };

        let tool_id = match parse_tool_id(current_tool) {
            Some(tool_id) => tool_id,
            None => return,
        };

        let project = match &mut self.project {
            Some(project) => project,
            None => return,
        };

        if project.is_clip_locked(clip_id) {
            return;
        }
        let clip = match project.get_clip_mut(clip_id) {
            Some(clip) => clip,
            None => return,
        };

        let tool = match self.tools.get_mut(tool_id) {
            Some(tool) => tool,
            None => {
                eprintln!("Tool is not registered: {:?}.", tool_id);
                return;
            }
        };

        let (width, height) = (clip.image.width, clip.image.height);
        let alpha_locked = clip.metadata.alpha_locked;
        let color_array = [color[0], color[1], color[2], color[3]];

        let mut changes = Vec::new();
        for point in points.chunks_exact(3) {
            let (x, y) = match clip.transform.inverse_transform_point(
                (point[0] as f32, point[1] as f32),
                (width as f32 / 2.0, height as f32 / 2.0),
            ) {
                Some((x, y))
                    if x.is_finite()
                        && y.is_finite()
                        && x >= 0.0
                        && y >= 0.0
                        && x < width as f32
                        && y < height as f32 =>
                {
                    (x, y)
                }
                Some(_) => continue,
                None => {
                    eprintln!("Clip transform is not invertible.");
                    continue;
                }
            };

            let change_start = changes.len();
            let image = clip.get_image_mut();
            tool.apply(
                image,
                x,
                y,
                color_array,
                Some(point[2] as f32),
                &mut changes,
            );
            if alpha_locked {
                for change in &mut changes[change_start..] {
                    let pixel = &mut image.data[change.index..change.index + 4];
                    if change.before[3] == 0 || pixel[3] == 0 {
                        pixel.copy_from_slice(&change.before);
                    } else {
                        pixel[3] = change.before[3];
                    }
                    change.after.copy_from_slice(pixel);
                }
            }
        }
        if !changes.is_empty() {
            clip.mark_image_changed();
        }
        self.action_manager.record_pixel_changes(clip_id, changes);
    }

    pub fn get_tool_properties(&self, current_tool: &str) -> JsValue {
        let tool_id = match parse_tool_id(current_tool) {
            Some(tool_id) => tool_id,
            None => return JsValue::undefined(),
        };

        match self.tools.get(tool_id) {
            Some(tool) => JsValue::from_serde(&tool.get_properties()).unwrap(),
            None => {
                eprintln!("Tool is not registered: {:?}.", tool_id);
                JsValue::undefined()
            }
        }
    }

    pub fn set_tool_property(&mut self, current_tool: &str, name: &str, value: JsValue) {
        let tool_id = match parse_tool_id(current_tool) {
            Some(tool_id) => tool_id,
            None => return,
        };

        let tool_property: Result<ToolPropertyValue, JsValue> = {
            if let Some(n) = value.as_f64() {
                Ok(ToolPropertyValue::Number(n))
            } else if let Some(b) = value.as_bool() {
                Ok(ToolPropertyValue::Bool(b))
            } else if let Some(s) = value.as_string() {
                Ok(ToolPropertyValue::String(s))
            } else if js_sys::Array::is_array(&value) {
                let array = js_sys::Array::from(&value);
                if array.length() == 4 {
                    let mut color = [0u8; 4];
                    for i in 0..4 {
                        if let Some(n) = array.get(i).as_f64() {
                            color[i as usize] = n as u8;
                        } else {
                            return;
                        }
                    }
                    Ok(ToolPropertyValue::Color(color))
                } else {
                    Err(JsValue::from_str("Invalid color array length"))
                }
            } else if value.is_object() {
                let uint8_array = js_sys::Uint8Array::new(&value);
                let vec = uint8_array.to_vec();
                Ok(ToolPropertyValue::Image(Some(Image {
                    data: vec,
                    width: 512,
                    height: 512,
                })))
            } else {
                Err(JsValue::from_str("Unsupported property value"))
            }
        };

        if let Ok(prop) = tool_property {
            match self.tools.get_mut(tool_id) {
                Some(tool) => tool.set_property(name, prop),
                None => eprintln!("Tool is not registered: {:?}.", tool_id),
            }
        }
    }

    pub fn show_layer(&mut self, layer_id_str: String) -> Result<(), JsValue> {
        self.set_layer_visibility(layer_id_str, false)
    }

    pub fn hide_layer(&mut self, layer_id_str: String) -> Result<(), JsValue> {
        self.set_layer_visibility(layer_id_str, true)
    }

    pub fn unlock_layer(&mut self, layer_id_str: String) -> Result<(), JsValue> {
        self.set_layer_lock(layer_id_str, false)
    }

    pub fn lock_layer(&mut self, layer_id_str: String) -> Result<(), JsValue> {
        self.set_layer_lock(layer_id_str, true)
    }

    fn set_layer_visibility(&mut self, layer_id_str: String, hidden: bool) -> Result<(), JsValue> {
        let layer_id = layer_id_str
            .parse::<LayerId>()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        if project.composition.layer_index(layer_id).is_none() {
            return Err(JsValue::from_str("Layer does not exist"));
        }
        self.action_manager.do_action(
            Box::new(SetLayerVisibilityAction::new(layer_id, hidden)),
            project,
        );
        Ok(())
    }

    fn set_layer_lock(&mut self, layer_id_str: String, locked: bool) -> Result<(), JsValue> {
        let layer_id = layer_id_str
            .parse::<LayerId>()
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        if project.composition.layer_index(layer_id).is_none() {
            return Err(JsValue::from_str("Layer does not exist"));
        }
        self.action_manager
            .do_action(Box::new(SetLayerLockAction::new(layer_id, locked)), project);
        Ok(())
    }
}
