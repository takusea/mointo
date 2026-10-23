use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CompositionSettings {
    pub width: u32,
    pub height: u32,
    pub frame_rate: u32,
    #[serde(default)]
    pub start_frame: u32,
    #[serde(default = "default_end_frame")]
    pub end_frame: u32,
}

impl Default for CompositionSettings {
    fn default() -> Self {
        Self { width: 640, height: 360, frame_rate: 24, start_frame: 0, end_frame: 255 }
    }
}

fn default_end_frame() -> u32 {
    255
}

#[cfg(test)]
mod tests {
    use super::CompositionSettings;
    use serde::Serialize;

    #[derive(Serialize)]
    struct LegacyCompositionSettings {
        width: u32,
        height: u32,
        frame_rate: u32,
    }

    #[test]
    fn legacy_settings_default_to_the_original_frame_range() {
        let legacy_settings = LegacyCompositionSettings {
            width: 1280,
            height: 720,
            frame_rate: 8,
        };
        let data = rmp_serde::to_vec(&legacy_settings).unwrap();

        let settings: CompositionSettings = rmp_serde::from_slice(&data).unwrap();

        assert_eq!(settings.start_frame, 0);
        assert_eq!(settings.end_frame, 255);
    }
}
