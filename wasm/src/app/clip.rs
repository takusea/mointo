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
    pub alpha_locked: Option<bool>,
    #[serde(default)]
    pub locked: bool,
    #[serde(default)]
    pub opacity: Option<f32>,
    #[serde(default)]
    pub blend_mode: Option<BlendMode>,
    #[serde(default)]
    pub audio_start_frame: Option<u32>,
}

fn default_opacity() -> f32 {
    1.0
}

impl Default for ClipProperties {
    fn default() -> Self {
        Self {
            hidden: false,
            alpha_locked: None,
            locked: false,
            opacity: None,
            blend_mode: None,
            audio_start_frame: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ClipMetadata {
    pub id: ClipId,
    pub start: u32,
    pub layer_id: LayerId,
    pub duration: u32,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub locked: bool,
    #[serde(default = "default_name")]
    pub name: String,
}

fn default_name() -> String {
    "Clip".to_string()
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClipContent {
    Image {
        asset_id: AssetId,
        #[serde(default)]
        alpha_locked: bool,
        #[serde(default = "default_opacity")]
        opacity: f32,
        #[serde(default)]
        blend_mode: BlendMode,
        #[serde(skip)]
        image: Image,
        #[serde(skip)]
        image_revision: u64,
        #[serde(skip)]
        dirty_rect: Cell<Option<[u32; 4]>>,
    },
    Audio {
        asset_id: AssetId,
        mime_type: String,
        #[serde(default)]
        start_frame: u32,
    },
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub metadata: ClipMetadata,
    pub content: ClipContent,
    pub transform: Transform,
    #[serde(serialize_with = "serialize_committed_keyframes")]
    pub keyframes: Vec<ClipKeyframe>,
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
            scalar("opacity", self.image_opacity().unwrap_or(1.0)),
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
    pub fn new_image(
        metadata: ClipMetadata,
        asset_id: AssetId,
        image: Image,
        transform: Transform,
        keyframes: Vec<ClipKeyframe>,
    ) -> Self {
        Self {
            metadata,
            content: ClipContent::Image {
                asset_id,
                alpha_locked: false,
                opacity: 1.0,
                blend_mode: BlendMode::default(),
                image,
                image_revision: 0,
                dirty_rect: Cell::new(None),
            },
            transform,
            keyframes,
        }
    }

    pub fn new_audio(
        metadata: ClipMetadata,
        asset_id: AssetId,
        mime_type: String,
        transform: Transform,
        keyframes: Vec<ClipKeyframe>,
    ) -> Self {
        Self {
            metadata,
            content: ClipContent::Audio {
                asset_id,
                mime_type,
                start_frame: 0,
            },
            transform,
            keyframes,
        }
    }

    pub fn is_image(&self) -> bool {
        matches!(self.content, ClipContent::Image { .. })
    }

    pub fn asset_id(&self) -> AssetId {
        match &self.content {
            ClipContent::Image { asset_id, .. } => *asset_id,
            ClipContent::Audio { asset_id, .. } => *asset_id,
        }
    }

    pub fn set_asset_id(&mut self, next: AssetId) -> AssetId {
        match &mut self.content {
            ClipContent::Image { asset_id, .. } => std::mem::replace(asset_id, next),
            ClipContent::Audio { asset_id, .. } => std::mem::replace(asset_id, next),
        }
    }

    pub fn image(&self) -> Option<&Image> {
        match &self.content {
            ClipContent::Image { image, .. } => Some(image),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn image_mut(&mut self) -> Option<&mut Image> {
        match &mut self.content {
            ClipContent::Image { image, .. } => Some(image),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn image_revision(&self) -> Option<u64> {
        match &self.content {
            ClipContent::Image { image_revision, .. } => Some(*image_revision),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn dirty_rect(&self) -> Option<&Cell<Option<[u32; 4]>>> {
        match &self.content {
            ClipContent::Image { dirty_rect, .. } => Some(dirty_rect),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn image_opacity(&self) -> Option<f32> {
        match &self.content {
            ClipContent::Image { opacity, .. } => Some(*opacity),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn image_blend_mode(&self) -> Option<BlendMode> {
        match &self.content {
            ClipContent::Image { blend_mode, .. } => Some(*blend_mode),
            ClipContent::Audio { .. } => None,
        }
    }

    pub fn audio_start_frame(&self) -> Option<u32> {
        match &self.content {
            ClipContent::Audio { start_frame, .. } => Some(*start_frame),
            ClipContent::Image { .. } => None,
        }
    }

    pub fn alpha_locked(&self) -> bool {
        match &self.content {
            ClipContent::Image { alpha_locked, .. } => *alpha_locked,
            ClipContent::Audio { .. } => false,
        }
    }

    pub fn properties(&self) -> ClipProperties {
        let (alpha_locked, opacity, blend_mode) = match &self.content {
            ClipContent::Image {
                alpha_locked,
                opacity,
                blend_mode,
                ..
            } => (Some(*alpha_locked), Some(*opacity), Some(*blend_mode)),
            ClipContent::Audio { .. } => (None, None, None),
        };
        ClipProperties {
            hidden: self.metadata.hidden,
            alpha_locked,
            locked: self.metadata.locked,
            opacity,
            blend_mode,
            audio_start_frame: self.audio_start_frame(),
        }
    }

    pub fn set_properties(&mut self, properties: ClipProperties) {
        self.metadata.hidden = properties.hidden;
        if let ClipContent::Image {
            alpha_locked,
            opacity,
            blend_mode,
            ..
        } = &mut self.content
        {
            if let Some(next) = properties.alpha_locked {
                *alpha_locked = next;
            }
            if let Some(next) = properties.opacity {
                *opacity = if next.is_finite() {
                    next.clamp(0.0, 1.0)
                } else {
                    1.0
                };
            }
            if let Some(next) = properties.blend_mode {
                *blend_mode = next;
            }
        }
        if let ClipContent::Audio { start_frame, .. } = &mut self.content {
            if let Some(next) = properties.audio_start_frame {
                *start_frame = next;
            }
        }
        self.metadata.locked = properties.locked;
    }

    pub fn set_image_opacity(&mut self, next: f32) {
        if let ClipContent::Image { opacity, .. } = &mut self.content {
            *opacity = if next.is_finite() {
                next.clamp(0.0, 1.0)
            } else {
                1.0
            };
        }
    }

    pub fn contains_frame(&self, frame_index: u32) -> bool {
        let is_after_start = self.metadata.start <= frame_index;
        let is_before_end = frame_index < self.metadata.start + self.metadata.duration;
        is_after_start && is_before_end
    }

    pub fn set_image(&mut self, image: Image) {
        if let ClipContent::Image { image: current, .. } = &mut self.content {
            *current = image;
        }
        self.mark_image_changed();
    }

    pub fn mark_image_changed(&mut self) {
        if let Some(image) = self.image() {
            self.mark_image_region_changed([0, 0, image.width, image.height]);
        }
    }

    pub fn mark_image_region_changed(&mut self, rect: [u32; 4]) {
        let ClipContent::Image {
            image_revision,
            dirty_rect,
            ..
        } = &mut self.content
        else {
            return;
        };
        *image_revision = image_revision.wrapping_add(1);
        let [x, y, width, height] = rect;
        if width == 0 || height == 0 {
            return;
        }
        dirty_rect.set(Some(match dirty_rect.get() {
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
    use super::{BlendMode, Clip, ClipContent, ClipMetadata};
    use crate::core::{image::Image, transform::Transform};
    use uuid::Uuid;

    #[test]
    fn clip_properties_and_anchor_survive_serialization() {
        let mut clip = Clip::new_image(
            ClipMetadata {
                id: Uuid::new_v4(),
                name: "Test clip".to_string(),
                start: 3,
                layer_id: Uuid::new_v4(),
                duration: 4,
                hidden: false,
                locked: false,
            },
            Uuid::new_v4(),
            Image::new(1, 1),
            Transform::default(),
            Vec::new(),
        );
        clip.set_properties(super::ClipProperties {
            hidden: true,
            alpha_locked: Some(true),
            locked: true,
            opacity: Some(0.4),
            blend_mode: Some(BlendMode::Multiply),
            audio_start_frame: None,
        });
        clip.transform.anchor = (0.25, 0.75);

        let bytes = rmp_serde::to_vec(&clip).unwrap();
        let restored: Clip = rmp_serde::from_slice(&bytes).unwrap();

        assert!(restored.metadata.hidden);
        assert!(restored.alpha_locked());
        assert!(restored.metadata.locked);
        assert!((restored.image_opacity().unwrap() - 0.4).abs() < f32::EPSILON);
        assert_eq!(restored.image_blend_mode(), Some(BlendMode::Multiply));
        assert_eq!(restored.transform.anchor, (0.25, 0.75));
        assert_eq!(restored.metadata.name, "Test clip");
    }

    #[test]
    fn audio_clip_asset_reference_survives_serialization() {
        let asset_id = Uuid::new_v4();
        let mut clip = Clip::new_audio(
            ClipMetadata {
                id: Uuid::new_v4(),
                name: "Audio".to_string(),
                start: 5,
                layer_id: Uuid::new_v4(),
                duration: 72,
                hidden: false,
                locked: false,
            },
            asset_id,
            "audio/wav".to_string(),
            Transform::default(),
            Vec::new(),
        );
        clip.set_properties(super::ClipProperties {
            audio_start_frame: Some(12),
            ..Default::default()
        });
        let bytes = rmp_serde::to_vec(&clip).unwrap();
        let restored: Clip = rmp_serde::from_slice(&bytes).unwrap();

        assert_eq!(restored.asset_id(), asset_id);
        assert!(matches!(
            &restored.content,
            ClipContent::Audio {
                mime_type,
                ..
            } if mime_type == "audio/wav"
        ));
        assert_eq!(restored.audio_start_frame(), Some(12));
        assert_eq!(restored.metadata.duration, 72);
    }
}
