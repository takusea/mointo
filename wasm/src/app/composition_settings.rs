use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CompositionSettings {
    pub width: u32,
    pub height: u32,
    pub frame_rate: u32,
    pub start_frame: u32,
    pub end_frame: u32,
}

impl Default for CompositionSettings {
    fn default() -> Self {
        Self {
            width: 640,
            height: 360,
            frame_rate: 24,
            start_frame: 0,
            end_frame: 255,
        }
    }
}
