use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::app::clip::{AssetId, Clip, ClipId};
use crate::core::image::Image;
use crate::gpu::GpuRenderer;
use crate::app::composition_settings::CompositionSettings;

const DEFAULT_LAYER_COUNT: usize = 100;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct LayerId(Uuid);

impl LayerId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl std::str::FromStr for LayerId {
    type Err = uuid::Error;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(value).map(Self)
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    #[serde(default = "default_layer_visible")]
    pub visible: bool,
    #[serde(default)]
    pub locked: bool,
}

fn default_layer_visible() -> bool { true }

impl Layer {
    pub(crate) fn new(index: usize) -> Self {
        Self {
            id: LayerId::new(),
            name: format!("Layer {}", index + 1),
            visible: true,
            locked: false,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Composition {
    #[serde(default = "default_composition_name")]
    pub name: String,
    pub settings: CompositionSettings,
    pub clips: Vec<Clip>,
    pub layers: Vec<Layer>,
    /// Shared pixel data, stored once per image asset.
    pub assets: std::collections::HashMap<AssetId, Image>,
}

impl Composition {
    pub fn new() -> Self {
        Self {
            name: default_composition_name(),
            settings: CompositionSettings::default(),
            clips: Vec::new(),
            layers: (0..DEFAULT_LAYER_COUNT).map(Layer::new).collect(),
            assets: std::collections::HashMap::new(),
        }
    }

    pub fn add_clip(&mut self, clip: Clip) {
        self.assets
            .entry(clip.metadata.asset_id)
            .or_insert_with(|| clip.image.clone());
        self.clips.push(clip);
    }

    /// Publish a clip's modified pixel buffer to the asset registry and every
    /// clip referencing it. Called at the core operation boundary so normal
    /// drawing, tools, undo, redo and resize all keep links coherent.
    pub fn publish_clip_asset(&mut self, clip_id: ClipId) {
        let Some(clip) = self.get_clip(clip_id) else {
            return;
        };
        let asset_id = clip.metadata.asset_id;
        let image = clip.image.clone();
        self.assets.insert(asset_id, image.clone());
        for linked in self.clips.iter_mut().filter(|c| c.metadata.asset_id == asset_id) {
            if linked.metadata.id != clip_id {
                linked.set_image(image.clone());
            }
        }
    }

    pub fn reconcile_assets(&mut self) {
        let ids: Vec<_> = self.clips.iter().map(|clip| clip.metadata.id).collect();
        for id in ids {
            let Some(clip) = self.get_clip(id) else {
                continue;
            };
            let asset_id = clip.metadata.asset_id;
            let image = clip.image.clone();
            let differs = self.assets.get(&asset_id).is_none_or(|asset| {
                asset.data != image.data
                    || asset.width != image.width
                    || asset.height != image.height
            });
            if differs {
                self.publish_clip_asset(id);
            }
        }
    }

    pub fn hydrate_asset_views(&mut self) -> Result<(), String> {
        for clip in &mut self.clips {
            let image = self
                .assets
                .get(&clip.metadata.asset_id)
                .ok_or_else(|| {
                    format!("Clip {} references a missing image asset", clip.metadata.id)
                })?
                .clone();
            clip.image = image;
            clip.image_revision = 0;
        }
        Ok(())
    }

    pub fn delete_clip(&mut self, clip_id: ClipId) -> Option<Clip> {
        if let Some(pos) = self
            .clips
            .iter()
            .position(|clip| clip.metadata.id == clip_id)
        {
            let removed = self.clips.remove(pos);
            let asset_id = removed.metadata.asset_id;
            if !self.clips.iter().any(|clip| clip.metadata.asset_id == asset_id) {
                self.assets.remove(&asset_id);
            }
            Some(removed)
        } else {
            None
        }
    }

    pub fn move_clip_to_layer(&mut self, clip_id: ClipId, new_start: u32, layer_id: LayerId) {
        if let Some(clip) = self.clips.iter_mut().find(|c| c.metadata.id == clip_id) {
            let delta = new_start as i64 - clip.metadata.start as i64;
            for keyframe in &mut clip.keyframes {
                keyframe.frame = (keyframe.frame as i64 + delta).max(0) as u32;
            }
            clip.metadata.start = new_start;
            clip.metadata.layer_id = layer_id;
        }
    }

    pub fn get_clips(&self) -> &Vec<Clip> {
        &self.clips
    }

    pub fn get_layers(&self) -> &[Layer] {
        &self.layers
    }

    pub fn get_clip(&self, clip_id: ClipId) -> Option<&Clip> {
        self.clips.iter().find(|clip| clip.metadata.id == clip_id)
    }

    pub fn find_clip(&mut self, clip_id: ClipId) -> Option<&mut Clip> {
        self.clips
            .iter_mut()
            .find(|clip| clip.metadata.id == clip_id)
    }

    pub fn layer_id_at(&mut self, layer_index: usize) -> LayerId {
        self.ensure_layer(layer_index);
        self.layers[layer_index].id
    }

    pub fn layer_index(&self, layer_id: LayerId) -> Option<usize> {
        self.layers.iter().position(|layer| layer.id == layer_id)
    }

    pub fn insert_layer(&mut self, layer_index: usize) -> LayerId {
        let index = layer_index.min(self.layers.len());
        let layer = Layer::new(index);
        let layer_id = layer.id;
        self.layers.insert(index, layer);
        layer_id
    }

    pub fn ensure_layers(&mut self) -> Result<(), String> {
        for (index, layer) in self.layers.iter().enumerate() {
            if self.layers[..index]
                .iter()
                .any(|previous| previous.id == layer.id)
            {
                return Err(format!("Duplicate layer ID at index {index}"));
            }
        }
        for clip in &self.clips {
            if !self.assets.contains_key(&clip.metadata.asset_id) {
                return Err(format!(
                    "Clip {} references a missing image asset",
                    clip.metadata.id
                ));
            }
            if !self
                .layers
                .iter()
                .any(|layer| layer.id == clip.metadata.layer_id)
            {
                return Err(format!(
                    "Clip {} references an unknown layer",
                    clip.metadata.id
                ));
            }
        }
        Ok(())
    }

    fn ensure_layer(&mut self, layer_index: usize) {
        while self.layers.len() <= layer_index {
            self.layers.push(Layer::new(self.layers.len()));
        }
    }

    pub fn is_layer_hidden(&self, layer_index: usize) -> bool {
        self.layers
            .get(layer_index)
            .is_some_and(|layer| !layer.visible)
    }

    pub fn is_layer_hidden_by_id(&self, layer_id: LayerId) -> Option<bool> {
        self.layer_index(layer_id)
            .map(|index| self.is_layer_hidden(index))
    }

    pub fn set_layer_visible_by_id(&mut self, layer_id: LayerId, visible: bool) {
        if let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == layer_id) {
            layer.visible = visible;
        }
    }

    pub fn is_layer_locked(&self, layer_index: usize) -> bool {
        self.layers
            .get(layer_index)
            .is_some_and(|layer| layer.locked)
    }

    pub fn is_layer_locked_by_id(&self, layer_id: LayerId) -> Option<bool> {
        self.layer_index(layer_id)
            .map(|index| self.is_layer_locked(index))
    }

    pub fn set_layer_locked_by_id(&mut self, layer_id: LayerId, locked: bool) {
        if let Some(layer) = self.layers.iter_mut().find(|layer| layer.id == layer_id) {
            layer.locked = locked;
        }
    }

    pub async fn render_frame_gpu(
        &self,
        renderer: &mut GpuRenderer,
        frame_index: u32,
        width: u32,
        height: u32,
    ) -> Result<Image, String> {
        let mut clips: Vec<Clip> = self
            .clips
            .iter()
            .filter(|clip| clip.contains_frame(frame_index))
            .filter(|clip| !clip.metadata.hidden)
            .filter(|clip| {
                self.layer_index(clip.metadata.layer_id)
                    .is_some_and(|index| !self.is_layer_hidden(index))
            })
            .map(|clip| {
                let mut clip = clip.clone();
                let (transform, opacity) = clip.values_at(frame_index);
                clip.transform = transform;
                clip.metadata.opacity = opacity;
                clip
            })
            .collect();
        clips.sort_by_key(|clip| self.layer_index(clip.metadata.layer_id).unwrap());
        let refs: Vec<_> = clips.iter().collect();
        renderer.render_frame(&refs, width, height).await
    }

    pub async fn render_frame_gpu_to_canvas(
        &self,
        renderer: &mut GpuRenderer,
        frame_index: u32,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        let mut clips: Vec<Clip> = self
            .clips
            .iter()
            .filter(|clip| clip.contains_frame(frame_index))
            .filter(|clip| !clip.metadata.hidden)
            .filter(|clip| {
                self.layer_index(clip.metadata.layer_id)
                    .is_some_and(|index| !self.is_layer_hidden(index))
            })
            .map(|clip| {
                let mut clip = clip.clone();
                let (transform, opacity) = clip.values_at(frame_index);
                clip.transform = transform;
                clip.metadata.opacity = opacity;
                clip
            })
            .collect();
        clips.sort_by_key(|clip| self.layer_index(clip.metadata.layer_id).unwrap());
        let refs: Vec<_> = clips.iter().collect();
        renderer.render_frame_to_canvas(&refs, width, height).await
    }

    pub async fn render_frame_gpu_to_canvas_with_onion(
        &self,
        renderer: &mut GpuRenderer,
        frame_index: u32,
        layer_id: LayerId,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        let Some(selected_layer_index) = self.layer_index(layer_id) else {
            return self
                .render_frame_gpu_to_canvas(renderer, frame_index, width, height)
                .await;
        };
        let visible = |clip: &&Clip| {
            !clip.metadata.hidden
                && self
                    .layer_index(clip.metadata.layer_id)
                    .is_some_and(|index| !self.is_layer_hidden(index))
        };
        let mut current: Vec<_> = self
            .clips
            .iter()
            .filter(|clip| clip.contains_frame(frame_index))
            .filter(visible)
            .map(|clip| (clip, self.layer_index(clip.metadata.layer_id).unwrap()))
            .collect();
        current.sort_by_key(|(_, layer_index)| *layer_index);
        let current_clip = self.clips.iter().find(|clip| {
            clip.metadata.layer_id == layer_id && clip.contains_frame(frame_index)
        });
        let anchor_start = current_clip.map_or(frame_index, |clip| clip.metadata.start);
        let anchor_end = current_clip.map_or(frame_index.saturating_add(1), |clip| {
            clip.metadata.start.saturating_add(clip.metadata.duration)
        });
        let previous_clip = self.clips.iter()
            .filter(|clip| clip.metadata.layer_id == layer_id)
            .filter(|clip| clip.metadata.start.saturating_add(clip.metadata.duration) == anchor_start)
            .max_by_key(|clip| clip.metadata.start.saturating_add(clip.metadata.duration));
        let next_clip = self.clips.iter()
            .filter(|clip| clip.metadata.layer_id == layer_id)
            .filter(|clip| clip.metadata.start == anchor_end)
            .min_by_key(|clip| clip.metadata.start);
        let mut previous = previous_clip.filter(|clip| {
            !clip.metadata.hidden && !self.is_layer_hidden(self.layer_index(layer_id).unwrap())
        }).cloned().into_iter().collect::<Vec<_>>();
        if let Some(clip) = previous.first_mut() {
            let sample_frame = clip.metadata.start.saturating_add(clip.metadata.duration).saturating_sub(1);
            let (transform, opacity) = clip.values_at(sample_frame);
            clip.transform = transform;
            clip.metadata.opacity = opacity;
        }
        let mut next = next_clip.filter(|clip| {
            !clip.metadata.hidden && !self.is_layer_hidden(self.layer_index(layer_id).unwrap())
        }).cloned().into_iter().collect::<Vec<_>>();
        if let Some(clip) = next.first_mut() {
            let (transform, opacity) = clip.values_at(clip.metadata.start);
            clip.transform = transform;
            clip.metadata.opacity = opacity;
        }
        let previous: Vec<_> = previous.iter().collect();
        let next: Vec<_> = next.iter().collect();
        renderer
            .render_frame_with_onion_to_canvas(
                &current,
                &previous,
                &next,
                selected_layer_index,
                width,
                height,
            )
            .await
    }
}

fn default_composition_name() -> String { "main".to_string() }

#[cfg(test)]
mod tests {
    use super::Composition;
    use uuid::Uuid;

    #[test]
    fn layer_lock_state_serializes_and_round_trips() {
        let mut composition = Composition::new();
        let layer_id = composition.layer_id_at(2);
        composition.set_layer_locked_by_id(layer_id, true);

        let bytes = rmp_serde::to_vec(&composition).unwrap();
        let restored: Composition = rmp_serde::from_slice(&bytes).unwrap();

        assert!(restored.is_layer_locked(2));

        composition.set_layer_locked_by_id(layer_id, false);
        assert!(!composition.is_layer_locked(2));
    }

    #[test]
    fn ensuring_layer_expands_composition_layers() {
        let mut composition = Composition::new();
        composition.layer_id_at(100);

        assert_eq!(composition.get_layers().len(), 101);
    }

    #[test]
    fn inserting_a_layer_preserves_clip_layer_identity() {
        let mut composition = Composition::new();
        let layer_id = composition.layer_id_at(2);
        let clip = crate::app::clip::Clip {
            metadata: crate::app::clip::ClipMetadata {
                id: Uuid::new_v4(),
                asset_id: Uuid::new_v4(),
                start: 0,
                layer_id,
                duration: 1,
                hidden: false,
                alpha_locked: false,
                locked: false,
                opacity: 1.0,
                blend_mode: crate::app::clip::BlendMode::Normal,
                name: "Clip".to_string(),
            },
            transform: Default::default(),
            keyframes: Vec::new(),
            image: crate::core::image::Image::new(1, 1),
            image_revision: 0,
        };
        composition.add_clip(clip);

        composition.set_layer_visible_by_id(layer_id, false);
        composition.set_layer_locked_by_id(layer_id, true);
        composition.insert_layer(1);

        assert_eq!(composition.clips[0].metadata.layer_id, layer_id);
        assert_eq!(composition.layer_index(layer_id), Some(3));
        assert_eq!(composition.is_layer_hidden_by_id(layer_id), Some(true));
        assert_eq!(composition.is_layer_locked_by_id(layer_id), Some(true));
    }
}
