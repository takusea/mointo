use crate::app::clip::Clip;
use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub(super) struct ClipUniforms {
    pub(super) inverse_transform: [[f32; 4]; 3],
    pub(super) image_size: [f32; 2],
    pub(super) output_size: [f32; 2],
    pub(super) opacity: f32,
    pub(super) blend_mode: u32,
    pub(super) _padding: [f32; 2],
    pub(super) tint_color: [f32; 4],
}

pub(super) struct RenderClip<'a> {
    pub(super) clip: &'a Clip,
    pub(super) tint: [f32; 4],
}

pub(super) struct CachedClipTexture {
    pub(super) texture: wgpu::Texture,
    pub(super) width: u32,
    pub(super) height: u32,
    pub(super) revision: u64,
}
