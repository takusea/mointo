use super::MointoCore;
use crate::action::add_clip_action::AddClipAction;
use crate::action::change_clip_duration_action::ChangeClipDurationAction;
use crate::action::delete_clip_action::DeleteClipAction;
use crate::action::draw_stroke_action::DrawStrokeAction;
use crate::action::move_clip_action::MoveClipAction;
use crate::action::set_clip_name_action::SetClipNameAction;
use crate::action::set_clip_properties_action::SetClipPropertiesAction;
use crate::action::set_clip_size_action::SetClipSizeAction;
use crate::action::set_clip_transform_action::SetClipTransformAction;
use crate::app::clip::{BlendMode, ClipId, ClipProperties};
use crate::app::clip::{ClipKeyframe, ClipKeyframeValue};
use crate::app::composition::LayerId;
use crate::core::transform::Transform;
use gloo::utils::format::JsValueSerdeExt;
use js_sys::Uint8ClampedArray;
use uuid::Uuid;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[derive(serde::Serialize)]
struct ClipMetadataView<'a> {
    id: ClipId,
    name: &'a str,
    start: u32,
    duration: u32,
    layer_index: usize,
    layer_id: LayerId,
    hidden: bool,
    alpha_locked: bool,
    locked: bool,
    opacity: f32,
    blend_mode: BlendMode,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl MointoCore {
    pub fn get_clips(&mut self) -> JsValue {
        let project = match &mut self.project {
            Some(p) => p,
            None => {
                return JsValue::undefined();
            }
        };

        let clip_metadatas: Vec<ClipMetadataView<'_>> = project
            .composition
            .get_clips()
            .iter()
            .map(|clip| {
                let metadata = &clip.metadata;
                ClipMetadataView {
                    id: metadata.id,
                    name: &metadata.name,
                    start: metadata.start,
                    duration: metadata.duration,
                    layer_index: project
                        .composition
                        .layer_index(metadata.layer_id)
                        .expect("Clip references an unknown layer"),
                    layer_id: metadata.layer_id,
                    hidden: metadata.hidden,
                    alpha_locked: metadata.alpha_locked,
                    locked: metadata.locked,
                    opacity: metadata.opacity,
                    blend_mode: metadata.blend_mode,
                    width: clip.image.width,
                    height: clip.image.height,
                }
            })
            .collect();
        JsValue::from_serde(&clip_metadatas).unwrap()
    }

    pub fn get_layers(&self) -> JsValue {
        let project = match self.project.as_ref() {
            Some(project) => project,
            None => return JsValue::undefined(),
        };

        JsValue::from_serde(project.composition.get_layers()).unwrap()
    }

    pub fn add_clip(&mut self, start_frame: u32, layer_id_str: String) -> Result<(), JsValue> {
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
            .do_action(Box::new(AddClipAction::new(start_frame, layer_id)), project);
        Ok(())
    }

    pub fn add_clip_with_size(
        &mut self,
        start_frame: u32,
        layer_id_str: String,
        width: u32,
        height: u32,
    ) -> Result<(), JsValue> {
        if width == 0 || height == 0 {
            return Err(JsValue::from_str("Clip dimensions must be positive"));
        }
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
            Box::new(AddClipAction::with_image_size(
                start_frame,
                layer_id,
                width,
                height,
            )),
            project,
        );
        Ok(())
    }

    pub fn delete_clip(&mut self, clip_id_str: String) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return;
            }
        };

        let action = Box::new(DeleteClipAction::new(clip_id));

        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(action, project);
        }
    }

    pub fn get_clip_pixels(&self, clip_id_str: String) -> Option<Uint8ClampedArray> {
        let clip_id = Uuid::parse_str(&clip_id_str).ok()?;
        let project = self.project.as_ref()?;
        let clip = project
            .composition
            .clips
            .iter()
            .find(|clip| clip.metadata.id == clip_id)?;
        Some(Uint8ClampedArray::from(&clip.image.data[..]))
    }

    pub fn replace_clip_pixels(
        &mut self,
        clip_id_str: String,
        pixels: &[u8],
    ) -> Result<(), JsValue> {
        let clip_id =
            Uuid::parse_str(&clip_id_str).map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        let clip = project
            .get_clip(clip_id)
            .ok_or_else(|| JsValue::from_str("Clip does not exist"))?;
        if project.is_clip_locked(clip_id) {
            return Err(JsValue::from_str("Clip is locked"));
        }
        if clip.image.data.len() != pixels.len() {
            return Err(JsValue::from_str(
                "Pixel data dimensions do not match the clip",
            ));
        }

        let changes: Vec<_> = clip
            .image
            .data
            .chunks_exact(4)
            .zip(pixels.chunks_exact(4))
            .enumerate()
            .filter_map(|(pixel_index, (before, after))| {
                let before: [u8; 4] = before.try_into().unwrap();
                let after: [u8; 4] = after.try_into().unwrap();
                (before != after).then_some(crate::core::image::PixelChange {
                    index: pixel_index * 4,
                    before,
                    after,
                })
            })
            .collect();
        self.action_manager
            .do_action(Box::new(DrawStrokeAction::new(clip_id)), project);
        self.action_manager
            .record_pixel_changes_to_latest(clip_id, changes);
        let clip = project
            .composition
            .clips
            .iter_mut()
            .find(|clip| clip.metadata.id == clip_id)
            .ok_or_else(|| JsValue::from_str("Clip does not exist"))?;
        clip.image.data.copy_from_slice(pixels);
        clip.mark_image_changed();
        Ok(())
    }

    pub fn preview_clip_pixels(
        &mut self,
        clip_id_str: String,
        pixels: &[u8],
    ) -> Result<(), JsValue> {
        let clip_id =
            Uuid::parse_str(&clip_id_str).map_err(|error| JsValue::from_str(&error.to_string()))?;
        let project = self
            .project
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Project is not initialized"))?;
        if project.is_clip_locked(clip_id) {
            return Err(JsValue::from_str("Clip is locked"));
        }
        let clip = project
            .get_clip_mut(clip_id)
            .ok_or_else(|| JsValue::from_str("Clip does not exist"))?;
        if clip.image.data.len() != pixels.len() {
            return Err(JsValue::from_str(
                "Pixel data dimensions do not match the clip",
            ));
        }
        clip.image.data.copy_from_slice(pixels);
        clip.mark_image_changed();
        Ok(())
    }

    pub fn move_clip(
        &mut self,
        clip_id_str: String,
        start_frame: u32,
        layer_id_str: String,
    ) -> Result<(), JsValue> {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(error) => return Err(JsValue::from_str(&error.to_string())),
        };
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
        let action = Box::new(MoveClipAction::new(clip_id, start_frame, layer_id));
        self.action_manager.do_action(action, project);
        Ok(())
    }

    pub fn change_clip_duration(&mut self, clip_id_str: String, duration: u32) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return;
            }
        };

        let action = Box::new(ChangeClipDurationAction::new(clip_id, duration));

        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(action, project);
        }
    }

    pub fn set_clip_size(&mut self, clip_id_str: String, width: u32, height: u32) {
        let Ok(clip_id) = Uuid::parse_str(&clip_id_str) else {
            return;
        };
        if width == 0 || height == 0 {
            return;
        }
        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(
                Box::new(SetClipSizeAction::new(clip_id, width, height)),
                project,
            );
        }
    }

    pub fn set_clip_properties(&mut self, clip_id_str: String, json: JsValue) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(error) => {
                eprintln!("Failed to parse clip_id: {:?}", error);
                return;
            }
        };
        let properties: ClipProperties = match json.into_serde() {
            Ok(properties) => properties,
            Err(error) => {
                eprintln!("Failed to parse clip properties: {:?}", error);
                return;
            }
        };
        if !properties.opacity.is_finite() {
            eprintln!("Clip opacity must be finite.");
            return;
        }
        let action = Box::new(SetClipPropertiesAction::new(clip_id, properties));

        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(action, project);
        }
    }

    pub fn set_clip_name(&mut self, clip_id_str: String, name: String) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(error) => {
                eprintln!("Failed to parse clip_id: {:?}", error);
                return;
            }
        };
        if name.trim().is_empty() {
            eprintln!("Clip name cannot be empty.");
            return;
        }
        let action = Box::new(SetClipNameAction::new(clip_id, name));

        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(action, project);
        }
    }

    pub fn get_clip_transform(&mut self, clip_id_str: String) -> JsValue {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return JsValue::undefined();
            }
        };

        let project = match &mut self.project {
            Some(p) => p,
            None => {
                return JsValue::undefined();
            }
        };

        if let Some(clip) = project.composition.find_clip(clip_id) {
            let transform = clip.keyframes.iter().find(|key| key.preview).map(|key| clip.values_at(key.frame).0).unwrap_or_else(|| clip.transform.clone());
            return JsValue::from_serde(&transform).unwrap();
        }
        JsValue::undefined()
    }

    pub fn set_clip_transform(&mut self, clip_id_str: String, json: JsValue) {
        let clip_id = match Uuid::parse_str(&clip_id_str) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to parse clip_id: {:?}", e);
                return;
            }
        };

        let transform: Transform = match json.into_serde() {
            Ok(transform) => transform,
            Err(e) => {
                eprintln!("Failed to parse transform: {:?}", e);
                return;
            }
        };
        let action = Box::new(SetClipTransformAction::new(clip_id, transform));

        if let Some(project) = self.project.as_mut() {
            self.action_manager.do_action(action, project);
        }
    }

    pub fn get_clip_keyframes(&mut self, clip_id_str: String) -> JsValue {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else {
            return JsValue::undefined();
        };
        self.project
            .as_ref()
            .and_then(|p| p.composition.get_clip(id))
            .map(|clip| JsValue::from_serde(&clip.keyframes).unwrap_or(JsValue::undefined()))
            .unwrap_or(JsValue::undefined())
    }

    pub fn get_clip_preview_opacity(&mut self, clip_id_str: String) -> Option<f32> {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else { return None; };
        let clip = self.project.as_ref()?.composition.get_clip(id)?;
        let frame = clip.keyframes.iter().find(|key| key.preview)?.frame;
        Some(clip.values_at(frame).1)
    }

    pub fn set_clip_keyframe(
        &mut self,
        clip_id_str: String,
        frame: u32,
        property: String,
        value: JsValue,
    ) {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else {
            return;
        };
        let value: ClipKeyframeValue = match value.into_serde() {
            Ok(value) => value,
            Err(_) => return,
        };
        let is_pair = matches!(property.as_str(), "position" | "scale" | "anchor");
        if (is_pair && !matches!(&value, ClipKeyframeValue::Pair(_)))
            || (!is_pair && !matches!(&value, ClipKeyframeValue::Scalar(_)))
        {
            return;
        }
        let value = match value {
            ClipKeyframeValue::Scalar(value) if value.is_finite() => {
                ClipKeyframeValue::Scalar(if property == "opacity" {
                    value.clamp(0.0, 1.0)
                } else {
                    value
                })
            }
            ClipKeyframeValue::Pair((x, y)) if x.is_finite() && y.is_finite() => {
                ClipKeyframeValue::Pair((x, y))
            }
            _ => return,
        };
        if !["position", "rotation", "scale", "anchor", "opacity"].contains(&property.as_str()) {
            return;
        }
        if let Some(clip) = self
            .project
            .as_mut()
            .and_then(|p| p.composition.find_clip(id))
        {
            if clip.metadata.locked {
                return;
            }
            if let Some(key) = clip
                .keyframes
                .iter_mut()
                .find(|key| key.frame == frame && key.property == property)
            {
                if !key.preview { key.value = value; }
                key.preview = false;
            } else {
                clip.keyframes.push(ClipKeyframe {
                    frame,
                    property: property.clone(),
                    value,
                    preview: false,
                });
            }
            clip.keyframes.sort_by_key(|key| key.frame);
        }
    }

    pub fn set_clip_preview_keyframe(&mut self, clip_id_str: String, frame: u32, property: String, value: JsValue) {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else { return; };
        let Ok(value) = value.into_serde::<ClipKeyframeValue>() else { return; };
        let is_pair = matches!(property.as_str(), "position" | "scale" | "anchor");
        let value = match value {
            ClipKeyframeValue::Pair((x, y)) if is_pair && x.is_finite() && y.is_finite() => ClipKeyframeValue::Pair((x, y)),
            ClipKeyframeValue::Scalar(value) if !is_pair && value.is_finite() => ClipKeyframeValue::Scalar(if property == "opacity" { value.clamp(0.0, 1.0) } else { value }),
            _ => return,
        };
        if !["position", "rotation", "scale", "anchor", "opacity"].contains(&property.as_str()) { return; }
        if let Some(clip) = self.project.as_mut().and_then(|project| project.composition.find_clip(id)) {
            if clip.metadata.locked { return; }
            if let Some(key) = clip.keyframes.iter_mut().find(|key| key.frame == frame && key.property == property) {
                key.value = value;
                key.preview = true;
            } else {
                clip.keyframes.push(ClipKeyframe { frame, property, value, preview: true });
            }
        }
    }

    pub fn clear_clip_preview_keyframes(&mut self) {
        if let Some(project) = self.project.as_mut() {
            for clip in &mut project.composition.clips { clip.keyframes.retain(|key| !key.preview); }
        }
    }

    pub fn delete_clip_keyframe(&mut self, clip_id_str: String, frame: u32, property: String) {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else {
            return;
        };
        if let Some(clip) = self
            .project
            .as_mut()
            .and_then(|p| p.composition.find_clip(id))
        {
            if !clip.metadata.locked {
                let key_value = clip
                    .keyframes
                    .iter()
                    .find(|key| {
                        key.frame == frame && key.property == property && !key.preview
                    })
                    .map(|key| key.value.clone());
                let is_last_property_key = clip
                    .keyframes
                    .iter()
                    .filter(|key| key.property == property && !key.preview)
                    .count()
                    == 1;

                if is_last_property_key {
                    if let Some(value) = key_value {
                        match (property.as_str(), value) {
                            ("position", ClipKeyframeValue::Pair(value)) => {
                                clip.transform.position = value;
                            }
                            ("rotation", ClipKeyframeValue::Scalar(value)) => {
                                clip.transform.rotation = value;
                            }
                            ("scale", ClipKeyframeValue::Pair(value)) => {
                                clip.transform.scale = value;
                            }
                            ("anchor", ClipKeyframeValue::Pair(value)) => {
                                clip.transform.anchor = value;
                            }
                            ("opacity", ClipKeyframeValue::Scalar(value)) => {
                                clip.metadata.opacity = value;
                            }
                            _ => {}
                        }
                    }
                }

                clip.keyframes
                    .retain(|key| key.frame != frame || key.property != property);
            }
        }
    }

    pub fn move_clip_keyframe(&mut self, clip_id_str: String, from_frame: u32, to_frame: u32, property: String) {
        let Ok(id) = Uuid::parse_str(&clip_id_str) else { return; };
        if let Some(clip) = self.project.as_mut().and_then(|project| project.composition.find_clip(id)) {
            if clip.metadata.locked || to_frame < clip.metadata.start || to_frame >= clip.metadata.start + clip.metadata.duration { return; }
            if clip.keyframes.iter().any(|key| key.frame == to_frame && key.property == property) { return; }
            if let Some(key) = clip.keyframes.iter_mut().find(|key| key.frame == from_frame && key.property == property && !key.preview) {
                key.frame = to_frame;
                clip.keyframes.sort_by_key(|key| key.frame);
            }
        }
    }
}
