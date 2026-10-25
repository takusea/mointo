use super::canvas::configure_canvas_premultiplied;
use super::types::{CachedClipTexture, ClipUniforms, RenderClip};
use crate::app::clip::{BlendMode, Clip};
use crate::core::image::Image;
use std::collections::{HashMap, HashSet};

pub struct GpuRenderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::RenderPipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    sampler: wgpu::Sampler,
    surface: Option<wgpu::Surface<'static>>,
    canvas: Option<web_sys::HtmlCanvasElement>,
    surface_config: Option<wgpu::SurfaceConfiguration>,
    clip_textures: HashMap<uuid::Uuid, CachedClipTexture>,
    clip_uniforms: HashMap<uuid::Uuid, wgpu::Buffer>,
    clip_bind_groups: HashMap<uuid::Uuid, [wgpu::BindGroup; 2]>,
    frame_textures: Option<(u32, u32, [wgpu::Texture; 2])>,
}

impl GpuRenderer {
    pub fn has_canvas(&self) -> bool {
        self.surface.is_some()
    }

    pub async fn new(canvas: Option<web_sys::HtmlCanvasElement>) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_without_display_handle());
        let surface = canvas
            .as_ref()
            .map(|canvas| {
                instance
                    .create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone()))
                    .map_err(|error| format!("Could not create WebGPU canvas surface: {error}"))
            })
            .transpose()?;
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                compatible_surface: surface.as_ref(),
                ..Default::default()
            })
            .await
            .map_err(|error| format!("Could not acquire a GPU adapter: {error}"))?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("render-device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
                experimental_features: wgpu::ExperimentalFeatures::disabled(),
                memory_hints: wgpu::MemoryHints::Performance,
                trace: wgpu::Trace::Off,
            })
            .await
            .map_err(|error| format!("Could not create a GPU device: {error}"))?;

        let surface_config = if let Some(surface) = surface.as_ref() {
            let caps = surface.get_capabilities(&adapter);
            let format = caps
                .formats
                .iter()
                .copied()
                .find(|f| *f == wgpu::TextureFormat::Rgba8Unorm)
                .ok_or_else(|| "WebGPU canvas does not support Rgba8Unorm".to_string())?;
            let config = wgpu::SurfaceConfiguration {
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                format,
                color_space: wgpu::SurfaceColorSpace::Auto,
                width: 1,
                height: 1,
                present_mode: caps.present_modes[0],
                // wgpu 30.0.1 accepts premultiplied canvas alpha but reports
                // only Opaque in its WebGPU surface capabilities.
                alpha_mode: wgpu::CompositeAlphaMode::Opaque,
                view_formats: vec![],
                desired_maximum_frame_latency: 2,
            };
            surface.configure(&device, &config);
            configure_canvas_premultiplied(canvas.as_ref().unwrap(), &device, format)?;
            Some(config)
        } else {
            None
        };

        let (pipeline, bind_group_layout, sampler) = super::pipeline::create_pipeline(&device);

        Ok(Self {
            device,
            queue,
            pipeline,
            bind_group_layout,
            sampler,
            surface,
            canvas,
            surface_config,
            clip_textures: HashMap::new(),
            clip_uniforms: HashMap::new(),
            clip_bind_groups: HashMap::new(),
            frame_textures: None,
        })
    }

    pub async fn render_frame(
        &mut self,
        clips: &[&Clip],
        width: u32,
        height: u32,
    ) -> Result<Image, String> {
        let items: Vec<_> = clips
            .iter()
            .map(|clip| RenderClip {
                clip,
                tint: [0.0; 4],
            })
            .collect();
        self.render_frame_inner(&items, width, height, false).await
    }

    pub async fn render_frame_to_canvas(
        &mut self,
        clips: &[&Clip],
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        if self.surface.is_none() {
            return Err("WebGPU canvas is not initialized".into());
        }
        let items: Vec<_> = clips
            .iter()
            .map(|clip| RenderClip {
                clip,
                tint: [0.0; 4],
            })
            .collect();
        self.render_frame_inner(&items, width, height, true)
            .await
            .map(|_| ())
    }

    pub async fn render_frame_with_onion_to_canvas(
        &mut self,
        clips: &[(&Clip, usize)],
        previous: &[&Clip],
        next: &[&Clip],
        selected_layer_index: usize,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        let mut items = Vec::new();
        let mut inserted = false;
        for (clip, layer_index) in clips {
            if !inserted && *layer_index >= selected_layer_index {
                items.extend(previous.iter().map(|clip| RenderClip {
                    clip,
                    tint: [1.0, 0.19, 0.19, 0.4],
                }));
                items.extend(next.iter().map(|clip| RenderClip {
                    clip,
                    tint: [0.19, 0.5, 1.0, 0.4],
                }));
                inserted = true;
            }
            items.push(RenderClip {
                clip,
                tint: [0.0; 4],
            });
        }
        if !inserted {
            items.extend(previous.iter().map(|clip| RenderClip {
                clip,
                tint: [1.0, 0.19, 0.19, 0.4],
            }));
            items.extend(next.iter().map(|clip| RenderClip {
                clip,
                tint: [0.19, 0.5, 1.0, 0.4],
            }));
        }
        self.render_frame_inner(&items, width, height, true)
            .await
            .map(|_| ())
    }

    async fn render_frame_inner(
        &mut self,
        clips: &[RenderClip<'_>],
        width: u32,
        height: u32,
        to_canvas: bool,
    ) -> Result<Image, String> {
        let surface_texture = if to_canvas {
            let config = self
                .surface_config
                .as_mut()
                .ok_or("WebGPU canvas is not initialized")?;
            if config.width != width || config.height != height {
                config.width = width;
                config.height = height;
                self.surface
                    .as_ref()
                    .unwrap()
                    .configure(&self.device, config);
                configure_canvas_premultiplied(
                    self.canvas.as_ref().unwrap(),
                    &self.device,
                    config.format,
                )?;
            }
            let current = self.surface.as_ref().unwrap().get_current_texture();
            Some(match current {
                wgpu::CurrentSurfaceTexture::Success(texture)
                | wgpu::CurrentSurfaceTexture::Suboptimal(texture) => texture,
                other => return Err(format!("Could not acquire canvas texture: {other:?}")),
            })
        } else {
            None
        };
        if self
            .frame_textures
            .as_ref()
            .is_none_or(|(texture_width, texture_height, _)| {
                *texture_width != width || *texture_height != height
            })
        {
            let textures = [0, 1].map(|_| {
                self.device.create_texture(&wgpu::TextureDescriptor {
                    label: Some("frame-texture"),
                    size: wgpu::Extent3d {
                        width,
                        height,
                        depth_or_array_layers: 1,
                    },
                    mip_level_count: 1,
                    sample_count: 1,
                    dimension: wgpu::TextureDimension::D2,
                    format: wgpu::TextureFormat::Rgba8Unorm,
                    usage: wgpu::TextureUsages::RENDER_ATTACHMENT
                        | wgpu::TextureUsages::TEXTURE_BINDING
                        | wgpu::TextureUsages::COPY_SRC,
                    view_formats: &[],
                })
            });
            self.frame_textures = Some((width, height, textures));
            self.clip_bind_groups.clear();
        }
        let output_textures = &self.frame_textures.as_ref().unwrap().2;
        let output_views = output_textures
            .each_ref()
            .map(|texture| texture.create_view(&wgpu::TextureViewDescriptor::default()));
        let bytes_per_row = width * 4;
        let padded_bytes_per_row = bytes_per_row.div_ceil(wgpu::COPY_BYTES_PER_ROW_ALIGNMENT)
            * wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let readback = if to_canvas {
            None
        } else {
            Some(self.device.create_buffer(&wgpu::BufferDescriptor {
                label: Some("frame-readback"),
                size: (padded_bytes_per_row * height) as u64,
                usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
                mapped_at_creation: false,
            }))
        };
        let surface_view = surface_texture
            .as_ref()
            .map(|texture| texture.texture.create_view(&Default::default()));

        let active_clip_ids: HashSet<_> = clips.iter().map(|item| item.clip.metadata.id).collect();
        self.clip_textures
            .retain(|clip_id, _| active_clip_ids.contains(clip_id));
        self.clip_uniforms
            .retain(|clip_id, _| active_clip_ids.contains(clip_id));
        self.clip_bind_groups
            .retain(|clip_id, _| active_clip_ids.contains(clip_id));

        for item in clips {
            let clip = item.clip;
            let image = &clip.image;
            if self
                .clip_textures
                .get(&clip.metadata.id)
                .is_some_and(|cached| cached.width != image.width || cached.height != image.height)
            {
                self.clip_bind_groups.remove(&clip.metadata.id);
            }
            let cached = self
                .clip_textures
                .entry(clip.metadata.id)
                .or_insert_with(|| {
                    let texture = self.device.create_texture(&wgpu::TextureDescriptor {
                        label: Some("clip-texture"),
                        size: wgpu::Extent3d {
                            width: image.width,
                            height: image.height,
                            depth_or_array_layers: 1,
                        },
                        mip_level_count: 1,
                        sample_count: 1,
                        dimension: wgpu::TextureDimension::D2,
                        format: wgpu::TextureFormat::Rgba8Unorm,
                        usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
                        view_formats: &[],
                    });
                    CachedClipTexture {
                        texture,
                        width: image.width,
                        height: image.height,
                        revision: u64::MAX,
                    }
                });

            if cached.width != image.width || cached.height != image.height {
                *cached = CachedClipTexture {
                    texture: self.device.create_texture(&wgpu::TextureDescriptor {
                        label: Some("clip-texture"),
                        size: wgpu::Extent3d {
                            width: image.width,
                            height: image.height,
                            depth_or_array_layers: 1,
                        },
                        mip_level_count: 1,
                        sample_count: 1,
                        dimension: wgpu::TextureDimension::D2,
                        format: wgpu::TextureFormat::Rgba8Unorm,
                        usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
                        view_formats: &[],
                    }),
                    width: image.width,
                    height: image.height,
                    revision: u64::MAX,
                };
            }

            if cached.revision != clip.image_revision {
                let rect = if cached.revision == u64::MAX {
                    [0, 0, image.width, image.height]
                } else {
                    clip.dirty_rect
                        .get()
                        .unwrap_or([0, 0, image.width, image.height])
                };
                let [x, y, rect_width, rect_height] = rect;
                let clip_bytes_per_row = rect_width * 4;
                let padded_clip_bytes_per_row = clip_bytes_per_row
                    .div_ceil(wgpu::COPY_BYTES_PER_ROW_ALIGNMENT)
                    * wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
                let mut upload_data = vec![0; (padded_clip_bytes_per_row * rect_height) as usize];
                for row in 0..rect_height as usize {
                    let source_start = ((y as usize + row) * image.width as usize + x as usize) * 4;
                    let target_start = row * padded_clip_bytes_per_row as usize;
                    upload_data[target_start..target_start + clip_bytes_per_row as usize]
                        .copy_from_slice(
                            &image.data[source_start..source_start + clip_bytes_per_row as usize],
                        );
                }
                self.queue.write_texture(
                    wgpu::TexelCopyTextureInfo {
                        texture: &cached.texture,
                        mip_level: 0,
                        origin: wgpu::Origin3d { x, y, z: 0 },
                        aspect: wgpu::TextureAspect::All,
                    },
                    &upload_data,
                    wgpu::TexelCopyBufferLayout {
                        offset: 0,
                        bytes_per_row: Some(padded_clip_bytes_per_row),
                        rows_per_image: Some(rect_height),
                    },
                    wgpu::Extent3d {
                        width: rect_width,
                        height: rect_height,
                        depth_or_array_layers: 1,
                    },
                );
                cached.revision = clip.image_revision;
                clip.dirty_rect.set(None);
            }

            let clip_id = clip.metadata.id;
            self.clip_uniforms.entry(clip_id).or_insert_with(|| {
                self.device.create_buffer(&wgpu::BufferDescriptor {
                    label: Some("clip-uniforms"),
                    size: std::mem::size_of::<ClipUniforms>() as u64,
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                    mapped_at_creation: false,
                })
            });
            if !self.clip_bind_groups.contains_key(&clip_id) {
                let texture_view = cached.texture.create_view(&Default::default());
                let uniform_buffer = &self.clip_uniforms[&clip_id];
                let groups = std::array::from_fn(|source_index| {
                    self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("clip-bind-group"),
                        layout: &self.bind_group_layout,
                        entries: &[
                            wgpu::BindGroupEntry {
                                binding: 0,
                                resource: wgpu::BindingResource::TextureView(&texture_view),
                            },
                            wgpu::BindGroupEntry {
                                binding: 1,
                                resource: wgpu::BindingResource::Sampler(&self.sampler),
                            },
                            wgpu::BindGroupEntry {
                                binding: 2,
                                resource: uniform_buffer.as_entire_binding(),
                            },
                            wgpu::BindGroupEntry {
                                binding: 3,
                                resource: wgpu::BindingResource::TextureView(
                                    &output_views[source_index],
                                ),
                            },
                        ],
                    })
                });
                self.clip_bind_groups.insert(clip_id, groups);
            }
        }

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("frame-encoder"),
            });
        {
            let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("frame-clear"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &output_views[0],
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
        }

        for (clip_index, item) in clips.iter().enumerate() {
            let clip = item.clip;
            let image = &clip.image;
            let inverse = clip
                .transform
                .to_inverse_matrix3((image.width as f32 / 2.0, image.height as f32 / 2.0))
                .ok_or_else(|| "Clip transform is not invertible".to_string())?;
            let uniforms = ClipUniforms {
                inverse_transform: [
                    [inverse.x.x, inverse.x.y, inverse.x.z, 0.0],
                    [inverse.y.x, inverse.y.y, inverse.y.z, 0.0],
                    [inverse.z.x, inverse.z.y, inverse.z.z, 0.0],
                ],
                image_size: [image.width as f32, image.height as f32],
                output_size: [width as f32, height as f32],
                opacity: clip.metadata.opacity
                    * if item.tint[3] > 0.0 {
                        item.tint[3]
                    } else {
                        1.0
                    },
                blend_mode: if item.tint[3] > 0.0 {
                    0
                } else {
                    match clip.metadata.blend_mode {
                        BlendMode::Normal => 0,
                        BlendMode::Multiply => 1,
                        BlendMode::Screen => 2,
                        BlendMode::Add => 3,
                    }
                },
                _padding: [0.0; 2],
                tint_color: item.tint,
            };
            self.queue.write_buffer(
                &self.clip_uniforms[&clip.metadata.id],
                0,
                bytemuck::bytes_of(&uniforms),
            );
            let source_index = clip_index % 2;
            let target_index = (clip_index + 1) % 2;
            let final_canvas_pass = to_canvas && clip_index + 1 == clips.len();
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("frame-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: if final_canvas_pass {
                        surface_view.as_ref().unwrap()
                    } else {
                        &output_views[target_index]
                    },
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(
                0,
                &self.clip_bind_groups[&clip.metadata.id][source_index],
                &[],
            );
            pass.draw(0..3, 0..1);
        }
        if to_canvas && clips.is_empty() {
            let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("canvas-transparent-clear"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: surface_view.as_ref().unwrap(),
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
        }
        let final_texture = &output_textures[clips.len() % 2];
        if !to_canvas {
            encoder.copy_texture_to_buffer(
                final_texture.as_image_copy(),
                wgpu::TexelCopyBufferInfo {
                    buffer: readback.as_ref().unwrap(),
                    layout: wgpu::TexelCopyBufferLayout {
                        offset: 0,
                        bytes_per_row: Some(padded_bytes_per_row),
                        rows_per_image: Some(height),
                    },
                },
                wgpu::Extent3d {
                    width,
                    height,
                    depth_or_array_layers: 1,
                },
            );
        }
        self.queue.submit(Some(encoder.finish()));

        if let Some(texture) = surface_texture {
            self.queue.present(texture);
        }
        if to_canvas {
            return Ok(Image {
                data: vec![],
                width,
                height,
            });
        }

        let readback = readback.unwrap();
        let slice = readback.slice(..);
        let (sender, receiver) = futures_channel::oneshot::channel();
        slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = sender.send(result);
        });
        self.device
            .poll(wgpu::PollType::wait_indefinitely())
            .map_err(|error| format!("Could not wait for GPU frame: {error}"))?;
        receiver
            .await
            .map_err(|_| "GPU mapping callback was dropped".to_string())?
            .map_err(|error| format!("Could not map GPU frame: {error}"))?;
        let mapped = slice
            .get_mapped_range()
            .map_err(|error| format!("Could not access mapped GPU frame: {error}"))?;
        let mut data = vec![0; (width * height * 4) as usize];
        for row in 0..height as usize {
            let source_start = row * padded_bytes_per_row as usize;
            let target_start = row * bytes_per_row as usize;
            data[target_start..target_start + bytes_per_row as usize]
                .copy_from_slice(&mapped[source_start..source_start + bytes_per_row as usize]);
        }
        for pixel in data.chunks_exact_mut(4) {
            let alpha = pixel[3] as u16;
            if alpha == 0 {
                pixel[..3].fill(0);
            } else {
                for channel in &mut pixel[..3] {
                    *channel = ((*channel as u16 * 255 + alpha / 2) / alpha).min(255) as u8;
                }
            }
        }
        drop(mapped);
        readback.unmap();

        Ok(Image {
            data,
            width,
            height,
        })
    }
}
