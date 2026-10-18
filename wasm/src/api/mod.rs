mod clip;
mod drawing;
mod export;
mod playback;
mod project;

use crate::app::action_manager::ActionManager;
use crate::app::project::Project;
use crate::core::tool::{ToolId, ToolRegistry};
use crate::gpu::GpuRenderer;
use crate::tool;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct MointoCore {
    project: Option<Project>,
    tools: ToolRegistry,
    action_manager: ActionManager,
    gpu_renderer: Option<GpuRenderer>,
}

#[wasm_bindgen]
impl MointoCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        let mut tools = ToolRegistry::new();
        tools.insert(
            ToolId::Pen,
            Box::new(tool::circle_brush_tool::CircleBrushTool {
                size: 5,
                antialiasing: 8,
                opacity: 100,
                stroke_pixels: Default::default(),
            }),
        );
        tools.insert(
            ToolId::Eraser,
            Box::new(tool::eraser_tool::EraserTool {
                size: 5,
                antialiasing: 8,
                opacity: 100,
            }),
        );
        tools.insert(
            ToolId::Fill,
            Box::new(tool::fill_tool::FillTool {
                tolerance: 500,
                opacity: 100,
            }),
        );

        Self {
            project: None,
            tools,
            action_manager: ActionManager::new(),
            gpu_renderer: None,
        }
    }
}
