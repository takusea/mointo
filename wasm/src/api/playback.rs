use super::MointoCore;
use crate::app::layer::LayerId;
use crate::render::GpuRenderer;
use js_sys::Uint8ClampedArray;
use wasm_bindgen::prelude::wasm_bindgen;
use web_sys::HtmlCanvasElement;

#[wasm_bindgen]
impl MointoCore {
    pub async fn render_layer_frame(
        &mut self,
        frame_index: u32,
        layer_id_str: String,
    ) -> Option<Uint8ClampedArray> {
        let layer_id = layer_id_str.parse::<LayerId>().ok()?;
        let (width, height) = {
            let project = self.project.as_ref()?;
            (
                project.composition().settings.width,
                project.composition().settings.height,
            )
        };
        if self.gpu_renderer.is_none() {
            self.gpu_renderer = Some(GpuRenderer::new(None).await.ok()?);
        }
        let renderer = self.gpu_renderer.as_mut()?;
        let project = self.project.as_ref()?;
        let image = project
            .composition()
            .render_layer_frame_gpu(renderer, frame_index, layer_id, width, height)
            .await
            .ok()?;
        Some(Uint8ClampedArray::from(&image.data[..]))
    }

    pub async fn render_frame_to_canvas_with_onion(
        &mut self,
        frame_index: u32,
        canvas: HtmlCanvasElement,
        layer_id_str: String,
    ) -> bool {
        let Ok(layer_id) = layer_id_str.parse::<LayerId>() else {
            return false;
        };
        let (width, height) = match self.project.as_ref() {
            Some(project) => (
                project.composition().settings.width,
                project.composition().settings.height,
            ),
            None => return false,
        };
        if self
            .gpu_renderer
            .as_ref()
            .is_none_or(|renderer| !renderer.has_canvas())
        {
            match GpuRenderer::new(Some(canvas)).await {
                Ok(renderer) => self.gpu_renderer = Some(renderer),
                Err(error) => {
                    web_sys::console::error_1(
                        &format!("WebGPU canvas initialization failed: {error}").into(),
                    );
                    return false;
                }
            }
        }
        let Some(renderer) = self.gpu_renderer.as_mut() else {
            return false;
        };
        let Some(project) = self.project.as_ref() else {
            return false;
        };
        match project
            .composition()
            .render_frame_gpu_to_canvas_with_onion(renderer, frame_index, layer_id, width, height)
            .await
        {
            Ok(()) => true,
            Err(error) => {
                web_sys::console::error_1(
                    &format!("GPU onion frame rendering failed: {error}").into(),
                );
                false
            }
        }
    }

    pub async fn render_frame(&mut self, frame_index: u32) -> Option<Uint8ClampedArray> {
        let (width, height) = match self.project.as_ref() {
            Some(project) => (
                project.composition().settings.width,
                project.composition().settings.height,
            ),
            None => return None,
        };
        if self.gpu_renderer.is_none() {
            match GpuRenderer::new(None).await {
                Ok(renderer) => {
                    self.gpu_renderer = Some(renderer);
                }
                Err(error) => {
                    web_sys::console::error_1(
                        &format!("GPU initialization failed: {error}").into(),
                    );
                    return None;
                }
            }
        }

        let renderer = self.gpu_renderer.as_mut()?;
        let project = self.project.as_ref()?;

        let image = match project
            .composition()
            .render_frame_gpu(renderer, frame_index, width, height)
            .await
        {
            Ok(image) => image,
            Err(error) => {
                web_sys::console::error_1(&format!("GPU frame rendering failed: {error}").into());
                return None;
            }
        };

        Some(Uint8ClampedArray::from(&image.data[..]))
    }

    pub async fn render_frame_to_canvas(
        &mut self,
        frame_index: u32,
        canvas: HtmlCanvasElement,
    ) -> bool {
        let (width, height) = match self.project.as_ref() {
            Some(project) => (
                project.composition().settings.width,
                project.composition().settings.height,
            ),
            None => return false,
        };
        if self
            .gpu_renderer
            .as_ref()
            .is_none_or(|renderer| !renderer.has_canvas())
        {
            match GpuRenderer::new(Some(canvas)).await {
                Ok(renderer) => self.gpu_renderer = Some(renderer),
                Err(error) => {
                    web_sys::console::error_1(
                        &format!("WebGPU canvas initialization failed: {error}").into(),
                    );
                    return false;
                }
            }
        }
        let Some(renderer) = self.gpu_renderer.as_mut() else {
            return false;
        };
        let Some(project) = self.project.as_ref() else {
            return false;
        };
        match project
            .composition()
            .render_frame_gpu_to_canvas(renderer, frame_index, width, height)
            .await
        {
            Ok(()) => true,
            Err(error) => {
                web_sys::console::error_1(&format!("GPU canvas rendering failed: {error}").into());
                false
            }
        }
    }
}
