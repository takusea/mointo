use crate::app::layer::LayerId;
use crate::core::{image::Image, transform::Transform};
use serde::{Deserialize, Serialize};
use std::cell::Cell;
use uuid::Uuid;

pub type ClipId = Uuid;
pub type AssetId = Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum BlendMode {
    Normal,
    Multiply,
    Screen,
    Add,
}

impl Default for BlendMode {
    fn default() -> Self {
        Self::Normal
    }
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct ClipProperties {
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub alpha_locked: bool,
    #[serde(default)]
    pub locked: bool,
    #[serde(default = "default_opacity")]
    pub opacity: f32,
    #[serde(default)]
    pub blend_mode: BlendMode,
}

fn default_opacity() -> f32 {
    1.0
}

impl Default for ClipProperties {
    fn default() -> Self {
        Self {
            hidden: false,
            alpha_locked: false,
            locked: false,
            opacity: default_opacity(),
            blend_mode: BlendMode::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ClipMetadata {
    pub id: ClipId,
    pub asset_id: AssetId,
    pub start: u32,
    pub layer_id: LayerId,
    pub duration: u32,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub alpha_locked: bool,
    #[serde(default)]
    pub locked: bool,
    #[serde(default = "default_opacity")]
    pub opacity: f32,
    #[serde(default)]
    pub blend_mode: BlendMode,
    #[serde(default = "default_name")]
    pub name: String,
}

fn default_name() -> String {
    "Clip".to_string()
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub metadata: ClipMetadata,
    pub transform: Transform,
    #[serde(serialize_with = "serialize_committed_keyframes")]
    pub keyframes: Vec<ClipKeyframe>,
    /// Runtime view of the referenced asset. Pixel buffers are serialized only
    /// once, in layer::assets.
    #[serde(skip)]
    pub image: Image,
    #[serde(skip)]
    pub image_revision: u64,
    #[serde(skip)]
    pub dirty_rect: Cell<Option<[u32; 4]>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ClipKeyframe {
    pub frame: u32,
    pub property: String,
    pub value: ClipKeyframeValue,
    #[serde(default)]
    pub preview: bool,
}

fn serialize_committed_keyframes<S>(keys: &[ClipKeyframe], serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    keys.iter()
        .filter(|key| !key.preview)
        .collect::<Vec<_>>()
        .serialize(serializer)
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum ClipKeyframeValue {
    Scalar(f32),
    Pair((f32, f32)),
}

impl Clip {
    pub fn values_at(&self, frame: u32) -> (Transform, f32) {
        let keys: Vec<_> = self.keyframes.iter().collect();
        let scalar = |property: &str, base: f32| {
            let mut track: Vec<_> = keys.iter().filter(|key| key.property == property).collect();
            track.sort_by_key(|key| key.frame);
            let before = track.iter().rev().find(|key| key.frame <= frame).copied();
            let after = track.iter().find(|key| key.frame >= frame).copied();
            match (before, after) {
                (Some(a), Some(b)) if a.frame != b.frame => lerp(
                    scalar_value(&a.value),
                    scalar_value(&b.value),
                    (frame - a.frame) as f32 / (b.frame - a.frame) as f32,
                ),
                (Some(key), _) | (_, Some(key)) => scalar_value(&key.value),
                _ => base,
            }
        };
        let pair = |property: &str, base: (f32, f32)| {
            let mut track: Vec<_> = keys.iter().filter(|key| key.property == property).collect();
            track.sort_by_key(|key| key.frame);
            let before = track.iter().rev().find(|key| key.frame <= frame).copied();
            let after = track.iter().find(|key| key.frame >= frame).copied();
            let mix_pair =
                |a: (f32, f32), b: (f32, f32), t: f32| (lerp(a.0, b.0, t), lerp(a.1, b.1, t));
            match (before, after) {
                (Some(a), Some(b)) if a.frame != b.frame => mix_pair(
                    pair_value(&a.value),
                    pair_value(&b.value),
                    (frame - a.frame) as f32 / (b.frame - a.frame) as f32,
                ),
                (Some(key), _) | (_, Some(key)) => pair_value(&key.value),
                _ => base,
            }
        };
        (
            Transform {
                position: pair("position", self.transform.position),
                rotation: scalar("rotation", self.transform.rotation),
                scale: pair("scale", self.transform.scale),
                anchor: pair("anchor", self.transform.anchor),
            },
            scalar("opacity", self.metadata.opacity),
        )
    }
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

fn scalar_value(value: &ClipKeyframeValue) -> f32 {
    match value {
        ClipKeyframeValue::Scalar(value) => *value,
        ClipKeyframeValue::Pair((x, _)) => *x,
    }
}

fn pair_value(value: &ClipKeyframeValue) -> (f32, f32) {
    match value {
        ClipKeyframeValue::Pair(value) => *value,
        ClipKeyframeValue::Scalar(value) => (*value, *value),
    }
}

impl Clip {
    pub fn properties(&self) -> ClipProperties {
        ClipProperties {
            hidden: self.metadata.hidden,
            alpha_locked: self.metadata.alpha_locked,
            locked: self.metadata.locked,
            opacity: self.metadata.opacity,
            blend_mode: self.metadata.blend_mode,
        }
    }

    pub fn set_properties(&mut self, properties: ClipProperties) {
        self.metadata.hidden = properties.hidden;
        self.metadata.alpha_locked = properties.alpha_locked;
        self.metadata.locked = properties.locked;
        self.metadata.opacity = if properties.opacity.is_finite() {
            properties.opacity.clamp(0.0, 1.0)
        } else {
            1.0
        };
        self.metadata.blend_mode = properties.blend_mode;
    }

    pub fn contains_frame(&self, frame_index: u32) -> bool {
        let is_after_start = self.metadata.start <= frame_index;
        let is_before_end = frame_index < self.metadata.start + self.metadata.duration;
        is_after_start && is_before_end
    }

    pub fn get_image(&self) -> &Image {
        &self.image
    }

    pub fn get_image_mut(&mut self) -> &mut Image {
        &mut self.image
    }

    pub fn set_image(&mut self, image: Image) {
        self.image = image;
        self.mark_image_changed();
    }

    pub fn mark_image_changed(&mut self) {
        self.mark_image_region_changed([0, 0, self.image.width, self.image.height]);
    }

    pub fn mark_image_region_changed(&mut self, rect: [u32; 4]) {
        self.image_revision = self.image_revision.wrapping_add(1);
        let [x, y, width, height] = rect;
        if width == 0 || height == 0 {
            return;
        }
        self.dirty_rect.set(Some(match self.dirty_rect.get() {
            Some([old_x, old_y, old_width, old_height]) => {
                let left = x.min(old_x);
                let top = y.min(old_y);
                let right = (x + width).max(old_x + old_width);
                let bottom = (y + height).max(old_y + old_height);
                [left, top, right - left, bottom - top]
            }
            None => rect,
        }));
    }
}

#[cfg(test)]
mod tests {
    use super::{BlendMode, Clip, ClipMetadata};
    use crate::core::{image::Image, transform::Transform};
    use uuid::Uuid;

    #[test]
    fn clip_properties_and_anchor_survive_serialization() {
        let mut clip = Clip {
            metadata: ClipMetadata {
                id: Uuid::new_v4(),
                asset_id: Uuid::new_v4(),
                name: "Test clip".to_string(),
                start: 3,
                layer_id: Uuid::new_v4(),
                duration: 4,
                hidden: false,
                alpha_locked: false,
                locked: false,
                opacity: 1.0,
                blend_mode: BlendMode::Normal,
            },
            transform: Transform::default(),
            keyframes: Vec::new(),
            image: Image::new(1, 1),
            image_revision: 0,
            dirty_rect: Cell::new(None),
        };
        clip.set_properties(super::ClipProperties {
            hidden: true,
            alpha_locked: true,
            locked: true,
            opacity: 0.4,
            blend_mode: BlendMode::Multiply,
        });
        clip.transform.anchor = (0.25, 0.75);

        let bytes = rmp_serde::to_vec(&clip).unwrap();
        let restored: Clip = rmp_serde::from_slice(&bytes).unwrap();

        assert!(restored.metadata.hidden);
        assert!(restored.metadata.alpha_locked);
        assert!(restored.metadata.locked);
        assert!((restored.metadata.opacity - 0.4).abs() < f32::EPSILON);
        assert_eq!(restored.metadata.blend_mode, BlendMode::Multiply);
        assert_eq!(restored.transform.anchor, (0.25, 0.75));
        assert_eq!(restored.metadata.name, "Test clip");
    }
}
