use serde::{Deserialize, Serialize};

use crate::app::clip::{AssetId, Clip, ClipContent, ClipId};
use crate::app::composition_settings::CompositionSettings;
use crate::app::layer::{Layer, LayerId};
use crate::core::image::Image;
use crate::render::GpuRenderer;
use cgmath::{Matrix3, SquareMatrix};
use std::collections::{HashMap, HashSet};

const DEFAULT_LAYER_COUNT: usize = 100;

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
pub enum Asset {
    Image(Image),
    Audio(Vec<u8>),
}

#[derive(Serialize, Deserialize)]
pub struct Composition {
    #[serde(default = "default_composition_name")]
    pub name: String,
    pub settings: CompositionSettings,
    pub clips: Vec<Clip>,
    pub layers: Vec<Layer>,
    pub assets: std::collections::HashMap<AssetId, Asset>,
    #[serde(skip)]
    reconciled_image_revisions: HashMap<ClipId, u64>,
}

impl Composition {
    pub async fn render_layer_frame_gpu(
        &self,
        renderer: &mut GpuRenderer,
        frame_index: u32,
        layer_id: LayerId,
        width: u32,
        height: u32,
    ) -> Result<Image, String> {
        let mut clips = self.rendered_image_clips_at(frame_index, Some(layer_id));
        clips.sort_by_key(|clip| clip.metadata.start);
        let refs: Vec<_> = clips.iter().collect();
        renderer.render_frame(&refs, width, height).await
    }

    pub(crate) fn parent_transform_for(
        &self,
        layer_id: LayerId,
        frame_index: u32,
    ) -> Option<Matrix3<f32>> {
        let layer_index = self.layer_index(layer_id)?;
        let center = (
            self.settings.width as f32 / 2.0,
            self.settings.height as f32 / 2.0,
        );
        let mut parent_transform = Matrix3::identity();
        let mut has_parent = false;
        let mut groups: Vec<_> = self
            .clips
            .iter()
            .filter(|clip| clip.is_group() && clip.contains_frame(frame_index))
            .filter(|clip| !clip.metadata.hidden)
            .filter_map(|clip| {
                let group_layer_index = self.layer_index(clip.metadata.layer_id)?;
                let depth = clip.group_depth()?;
                (group_layer_index < layer_index
                    && layer_index - group_layer_index <= depth as usize
                    && !self.is_layer_hidden(group_layer_index))
                .then_some((group_layer_index, clip))
            })
            .collect();
        groups.sort_by_key(|(index, _)| *index);

        for (_, group) in groups {
            let transform = group.values_at(frame_index).0;
            parent_transform = parent_transform * transform.to_matrix3(center);
            has_parent = true;
        }

        has_parent.then_some(parent_transform)
    }

    fn apply_parent_transform(&self, clip: &mut Clip, frame_index: u32) {
        clip.render_parent_transform =
            self.parent_transform_for(clip.metadata.layer_id, frame_index);
    }

    fn rendered_image_clips_at(&self, frame_index: u32, layer_id: Option<LayerId>) -> Vec<Clip> {
        self.clips
            .iter()
            .filter(|clip| clip.is_image() && clip.contains_frame(frame_index))
            .filter(|clip| !clip.metadata.hidden)
            .filter(|clip| layer_id.is_none_or(|id| clip.metadata.layer_id == id))
            .filter(|clip| {
                self.layer_index(clip.metadata.layer_id)
                    .is_some_and(|index| !self.is_layer_hidden(index))
            })
            .map(|clip| {
                let mut clip = clip.clone();
                let (transform, opacity) = clip.values_at(frame_index);
                clip.transform = transform;
                clip.set_image_opacity(opacity);
                self.apply_parent_transform(&mut clip, frame_index);
                clip
            })
            .collect()
    }

    pub fn new() -> Self {
        Self {
            name: default_composition_name(),
            settings: CompositionSettings::default(),
            clips: Vec::new(),
            layers: (0..DEFAULT_LAYER_COUNT).map(Layer::new).collect(),
            assets: std::collections::HashMap::new(),
            reconciled_image_revisions: HashMap::new(),
        }
    }

    pub fn add_clip(&mut self, clip: Clip) {
        let clip_id = clip.metadata.id;
        let image_revision = clip.image_revision();
        let image_matches_asset = if let Some(image) = clip.image() {
            let asset_id = clip
                .asset_id()
                .expect("image clips always have an asset ID");
            match self.assets.get(&asset_id) {
                Some(Asset::Image(asset)) => {
                    asset.data == image.data
                        && asset.width == image.width
                        && asset.height == image.height
                }
                Some(Asset::Audio(_)) => false,
                None => {
                    self.assets.insert(asset_id, Asset::Image(image.clone()));
                    true
                }
            }
        } else {
            false
        };
        self.clips.push(clip);
        if let Some(image_revision) = image_revision {
            if image_matches_asset {
                self.reconciled_image_revisions
                    .insert(clip_id, image_revision);
            } else {
                self.reconciled_image_revisions.remove(&clip_id);
            }
        }
    }

    pub fn audio_data(&self, clip: &Clip) -> Option<&[u8]> {
        let ClipContent::Audio { asset_id, .. } = &clip.content else {
            return None;
        };
        match self.assets.get(asset_id)? {
            Asset::Audio(data) => Some(data),
            Asset::Image(_) => None,
        }
    }

    pub fn publish_clip_asset(&mut self, clip_id: ClipId) {
        let Some(clip) = self.get_clip(clip_id) else {
            return;
        };
        let Some(image) = clip.image().cloned() else {
            return;
        };
        let asset_id = clip
            .asset_id()
            .expect("image clips always have an asset ID");
        self.assets.insert(asset_id, Asset::Image(image.clone()));
        for linked in self
            .clips
            .iter_mut()
            .filter(|c| c.is_image() && c.asset_id() == Some(asset_id))
        {
            if linked.metadata.id != clip_id {
                linked.set_image(image.clone());
            }
            if let Some(revision) = linked.image_revision() {
                self.reconciled_image_revisions
                    .insert(linked.metadata.id, revision);
            }
        }
    }

    pub fn reconcile_assets(&mut self) {
        let mut changed_assets = HashSet::new();
        let changed_clip_ids: Vec<_> = self
            .clips
            .iter()
            .filter_map(|clip| {
                let revision = clip.image_revision()?;
                let clip_id = clip.metadata.id;
                let asset_id = clip.asset_id()?;
                (self.reconciled_image_revisions.get(&clip_id) != Some(&revision)
                    && changed_assets.insert(asset_id))
                .then_some(clip_id)
            })
            .collect();
        for clip_id in changed_clip_ids {
            self.publish_clip_asset(clip_id);
        }
    }

    pub fn hydrate_asset_views(&mut self) -> Result<(), String> {
        for clip in &mut self.clips {
            if !clip.is_image() {
                continue;
            }
            let asset_id = clip
                .asset_id()
                .expect("image clips always have an asset ID");
            let Some(Asset::Image(image)) = self.assets.get(&asset_id) else {
                return Err(format!(
                    "Clip {} references a missing or invalid image asset",
                    clip.metadata.id
                ));
            };
            clip.set_image(image.clone());
        }
        self.reconciled_image_revisions = self
            .clips
            .iter()
            .filter_map(|clip| Some((clip.metadata.id, clip.image_revision()?)))
            .collect();
        Ok(())
    }

    pub fn delete_clip(&mut self, clip_id: ClipId) -> Option<Clip> {
        if let Some(pos) = self
            .clips
            .iter()
            .position(|clip| clip.metadata.id == clip_id)
        {
            let removed = self.clips.remove(pos);
            self.reconciled_image_revisions.remove(&clip_id);
            if let Some(asset_id) = removed.asset_id() {
                if !self
                    .clips
                    .iter()
                    .any(|clip| clip.asset_id() == Some(asset_id))
                {
                    self.assets.remove(&asset_id);
                }
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

    #[cfg(test)]
    pub fn layer_id_at(&mut self, layer_index: usize) -> LayerId {
        self.ensure_layer(layer_index);
        self.layers[layer_index].id
    }

    pub fn layer_index(&self, layer_id: LayerId) -> Option<usize> {
        self.layers.iter().position(|layer| layer.id == layer_id)
    }

    pub fn swap_layer_order_by_id(&mut self, first_layer_id: LayerId, second_layer_id: LayerId) {
        let Some(first_index) = self.layer_index(first_layer_id) else {
            return;
        };
        let Some(second_index) = self.layer_index(second_layer_id) else {
            return;
        };
        self.layers.swap(first_index, second_index);
    }

    #[cfg(test)]
    pub fn insert_layer(&mut self, layer_index: usize) -> LayerId {
        let index = layer_index.min(self.layers.len());
        let layer = Layer::new(index);
        let layer_id = layer.id;
        self.layers.insert(index, layer);
        layer_id
    }

    pub fn ensure_layers(&mut self) -> Result<(), String> {
        while self.layers.len() < DEFAULT_LAYER_COUNT {
            self.layers.push(Layer::new(self.layers.len()));
        }
        for (index, layer) in self.layers.iter().enumerate() {
            if self.layers[..index]
                .iter()
                .any(|previous| previous.id == layer.id)
            {
                return Err(format!("Duplicate layer ID at index {index}"));
            }
        }
        for clip in &self.clips {
            let missing_asset = match &clip.content {
                ClipContent::Image { asset_id, .. } => {
                    !matches!(self.assets.get(asset_id), Some(Asset::Image(_)))
                }
                ClipContent::Audio { asset_id, .. } => {
                    !matches!(self.assets.get(asset_id), Some(Asset::Audio(_)))
                }
                ClipContent::Group { .. } => false,
            };
            if missing_asset {
                return Err(format!(
                    "Clip {} references a missing asset",
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

    #[cfg(test)]
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
        let mut clips = self.rendered_image_clips_at(frame_index, None);
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
        let mut clips = self.rendered_image_clips_at(frame_index, None);
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
        let mut current_clips = self.rendered_image_clips_at(frame_index, None);
        current_clips.sort_by_key(|clip| self.layer_index(clip.metadata.layer_id).unwrap());
        let current: Vec<_> = current_clips
            .iter()
            .map(|clip| (clip, self.layer_index(clip.metadata.layer_id).unwrap()))
            .collect();
        let current_clip = self.clips.iter().find(|clip| {
            clip.is_image()
                && clip.metadata.layer_id == layer_id
                && clip.contains_frame(frame_index)
        });
        let anchor_start = current_clip.map_or(frame_index, |clip| clip.metadata.start);
        let anchor_end = current_clip.map_or(frame_index.saturating_add(1), |clip| {
            clip.metadata.start.saturating_add(clip.metadata.duration)
        });
        let previous_clip = self
            .clips
            .iter()
            .filter(|clip| clip.metadata.layer_id == layer_id)
            .filter(|clip| clip.is_image())
            .filter(|clip| {
                clip.metadata.start.saturating_add(clip.metadata.duration) == anchor_start
            })
            .max_by_key(|clip| clip.metadata.start.saturating_add(clip.metadata.duration));
        let next_clip = self
            .clips
            .iter()
            .filter(|clip| clip.metadata.layer_id == layer_id)
            .filter(|clip| clip.is_image())
            .filter(|clip| clip.metadata.start == anchor_end)
            .min_by_key(|clip| clip.metadata.start);
        let mut previous = previous_clip
            .filter(|clip| {
                !clip.metadata.hidden && !self.is_layer_hidden(self.layer_index(layer_id).unwrap())
            })
            .cloned()
            .into_iter()
            .collect::<Vec<_>>();
        if let Some(clip) = previous.first_mut() {
            let sample_frame = clip
                .metadata
                .start
                .saturating_add(clip.metadata.duration)
                .saturating_sub(1);
            let (transform, opacity) = clip.values_at(sample_frame);
            clip.transform = transform;
            clip.set_image_opacity(opacity);
            self.apply_parent_transform(clip, sample_frame);
        }
        let mut next = next_clip
            .filter(|clip| {
                !clip.metadata.hidden && !self.is_layer_hidden(self.layer_index(layer_id).unwrap())
            })
            .cloned()
            .into_iter()
            .collect::<Vec<_>>();
        if let Some(clip) = next.first_mut() {
            let (transform, opacity) = clip.values_at(clip.metadata.start);
            clip.transform = transform;
            clip.set_image_opacity(opacity);
            self.apply_parent_transform(clip, clip.metadata.start);
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

fn default_composition_name() -> String {
    "main".to_string()
}

#[cfg(test)]
mod tests {
    use super::{Asset, Composition};
    use crate::app::clip::{Clip, ClipMetadata};
    use crate::core::transform::Transform;
    use cgmath::Vector3;
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
        let clip = crate::app::clip::Clip::new_image(
            crate::app::clip::ClipMetadata {
                id: Uuid::new_v4(),
                start: 0,
                layer_id,
                duration: 1,
                hidden: false,
                locked: false,
                name: "Clip".to_string(),
            },
            Uuid::new_v4(),
            crate::core::image::Image::new(1, 1),
            Default::default(),
            Vec::new(),
        );
        composition.add_clip(clip);

        composition.set_layer_visible_by_id(layer_id, false);
        composition.set_layer_locked_by_id(layer_id, true);
        composition.insert_layer(1);

        assert_eq!(composition.clips[0].metadata.layer_id, layer_id);
        assert_eq!(composition.layer_index(layer_id), Some(3));
        assert_eq!(composition.is_layer_hidden_by_id(layer_id), Some(true));
        assert_eq!(composition.is_layer_locked_by_id(layer_id), Some(true));
    }

    #[test]
    fn group_transforms_only_reach_overlapping_clips_within_depth() {
        let mut composition = Composition::new();
        let group_layer = composition.layer_id_at(0);
        let direct_child_layer = composition.layer_id_at(1);
        let second_child_layer = composition.layer_id_at(2);
        let outside_depth_layer = composition.layer_id_at(3);
        composition.add_clip(Clip::new_group(
            ClipMetadata {
                id: Uuid::new_v4(),
                name: "Group".to_string(),
                start: 5,
                layer_id: group_layer,
                duration: 4,
                hidden: false,
                locked: false,
            },
            2,
            Transform {
                position: (30.0, -15.0),
                ..Transform::default()
            },
            Vec::new(),
        ));

        let parent = composition
            .parent_transform_for(direct_child_layer, 5)
            .unwrap();
        let center = Vector3::new(
            composition.settings.width as f32 / 2.0,
            composition.settings.height as f32 / 2.0,
            1.0,
        );
        let transformed_center = parent * center;
        assert_eq!(
            (transformed_center.x, transformed_center.y),
            (center.x + 30.0, center.y - 15.0)
        );
        assert!(composition
            .parent_transform_for(second_child_layer, 8)
            .is_some());
        assert!(composition
            .parent_transform_for(outside_depth_layer, 5)
            .is_none());
        assert!(composition
            .parent_transform_for(direct_child_layer, 9)
            .is_none());
    }

    #[test]
    fn audio_clip_resolves_data_from_its_composition_asset() {
        let mut composition = Composition::new();
        let layer_id = composition.layer_id_at(0);
        let asset_id = Uuid::new_v4();
        let clip = crate::app::clip::Clip::new_audio(
            crate::app::clip::ClipMetadata {
                id: Uuid::new_v4(),
                start: 0,
                layer_id,
                duration: 1,
                hidden: false,
                locked: false,
                name: "Audio".to_string(),
            },
            asset_id,
            "audio/wav".to_string(),
            Default::default(),
            Vec::new(),
        );
        composition
            .assets
            .insert(asset_id, Asset::Audio(vec![1, 2, 3]));
        composition.add_clip(clip);

        let manifest = serde_json::to_value(&composition).unwrap();
        assert_eq!(manifest["assets"][asset_id.to_string()]["type"], "audio");
        let mut restored: Composition = serde_json::from_value(manifest).unwrap();
        let restored_clip = restored.clips.first().unwrap();

        assert_eq!(restored.audio_data(restored_clip), Some(&[1, 2, 3][..]));
        assert!(restored.ensure_layers().is_ok());
    }

    #[test]
    fn reconciling_changed_image_updates_linked_clips_once() {
        let mut composition = Composition::new();
        let layer_id = composition.layer_id_at(0);
        let asset_id = Uuid::new_v4();
        let first_clip_id = Uuid::new_v4();
        let linked_clip_id = Uuid::new_v4();
        let make_clip = |id| {
            crate::app::clip::Clip::new_image(
                crate::app::clip::ClipMetadata {
                    id,
                    start: 0,
                    layer_id,
                    duration: 1,
                    hidden: false,
                    locked: false,
                    name: "Image".to_string(),
                },
                asset_id,
                crate::core::image::Image::new(1, 1),
                Default::default(),
                Vec::new(),
            )
        };
        composition.add_clip(make_clip(first_clip_id));
        composition.add_clip(make_clip(linked_clip_id));

        let changed_pixel = [1, 2, 3, 4];
        let clip = composition.find_clip(first_clip_id).unwrap();
        clip.image_mut()
            .unwrap()
            .data
            .copy_from_slice(&changed_pixel);
        clip.mark_image_changed();
        composition.reconcile_assets();

        assert_eq!(
            composition
                .get_clip(linked_clip_id)
                .unwrap()
                .image()
                .unwrap()
                .data,
            changed_pixel
        );
        assert!(matches!(
            composition.assets.get(&asset_id),
            Some(Asset::Image(image)) if image.data == changed_pixel
        ));

        let first_revision = composition
            .get_clip(first_clip_id)
            .unwrap()
            .image_revision();
        let linked_revision = composition
            .get_clip(linked_clip_id)
            .unwrap()
            .image_revision();
        composition.reconcile_assets();
        assert_eq!(
            composition
                .get_clip(first_clip_id)
                .unwrap()
                .image_revision(),
            first_revision
        );
        assert_eq!(
            composition
                .get_clip(linked_clip_id)
                .unwrap()
                .image_revision(),
            linked_revision
        );
    }
}
