use crate::core::{
    color::Color,
    image::{Image, PixelChange},
    tool::{Tool, ToolProperty, ToolPropertyValue},
};

pub struct EraserTool {
    pub size: u32,
    pub antialiasing: u32,
    pub opacity: u8,
}

impl Tool for EraserTool {
    fn apply(
        &mut self,
        image: &mut Image,
        x: f32,
        y: f32,
        _color: Color,
        pressure: Option<f32>,
        changes: &mut Vec<PixelChange>,
    ) {
        let pressure = pressure.unwrap_or(1.0);
        let radius = (self.size as f32 * pressure.clamp(0.0, 1.0)).max(1.0) / 2.0;
        let fw = image.width as i32;
        let fh = image.height as i32;

        let samples = self.antialiasing.clamp(1, 16) as i32;
        let bounds = radius.ceil() as i32 + 1;
        for dy in -bounds..=bounds {
            for dx in -bounds..=bounds {
                let px = x.floor() as i32 + dx;
                let py = y.floor() as i32 + dy;
                if px < 0 || py < 0 || px >= fw || py >= fh {
                    continue;
                }
                let left = px as f32 - (x + 0.5);
                let right = left + 1.0;
                let top = py as f32 - (y + 0.5);
                let bottom = top + 1.0;
                let nearest_x = if left > 0.0 {
                    left
                } else if right < 0.0 {
                    right
                } else {
                    0.0
                };
                let nearest_y = if top > 0.0 {
                    top
                } else if bottom < 0.0 {
                    bottom
                } else {
                    0.0
                };
                if nearest_x * nearest_x + nearest_y * nearest_y > radius * radius {
                    continue;
                }
                let farthest_x = left.abs().max(right.abs());
                let farthest_y = top.abs().max(bottom.abs());
                let fully_covered =
                    farthest_x * farthest_x + farthest_y * farthest_y <= radius * radius;
                let coverage = if fully_covered {
                    1.0
                } else {
                    let mut covered = 0;
                    for sy in 0..samples {
                        for sx in 0..samples {
                            let sample_x = px as f32 + (sx as f32 + 0.5) / samples as f32;
                            let sample_y = py as f32 + (sy as f32 + 0.5) / samples as f32;
                            let dx = sample_x - (x + 0.5);
                            let dy = sample_y - (y + 0.5);
                            if dx * dx + dy * dy <= radius * radius {
                                covered += 1;
                            }
                        }
                    }
                    if covered == 0 {
                        continue;
                    }
                    covered as f32 / (samples * samples) as f32
                };
                let idx = ((py * fw + px) * 4) as usize;
                let mut pixel: [u8; 4] = image.data[idx..idx + 4].try_into().unwrap();
                let remaining = 1.0 - coverage * self.opacity as f32 / 100.0;
                pixel[3] = (pixel[3] as f32 * remaining).round() as u8;
                image.set_pixel(idx, pixel, changes);
            }
        }
    }

    fn get_properties(&self) -> Vec<ToolProperty> {
        vec![
            ToolProperty {
                name: "size".into(),
                value: ToolPropertyValue::Number(self.size as f64),
                min: 1.0,
                max: 100.0,
                step: 1.0,
                unit: Some("px".into()),
            },
            ToolProperty {
                name: "opacity".into(),
                value: ToolPropertyValue::Number(self.opacity as f64),
                min: 0.0,
                max: 100.0,
                step: 1.0,
                unit: Some("%".into()),
            },
            ToolProperty {
                name: "antialiasing".into(),
                value: ToolPropertyValue::Number(self.antialiasing as f64),
                min: 1.0,
                max: 16.0,
                step: 1.0,
                unit: None,
            },
        ]
    }

    fn set_property(&mut self, name: &str, value: ToolPropertyValue) {
        match (name, value) {
            ("size", ToolPropertyValue::Number(size)) => {
                self.size = size.max(1.0) as u32;
            }
            ("antialiasing", ToolPropertyValue::Number(samples)) => {
                self.antialiasing = samples.clamp(1.0, 16.0).round() as u32;
            }
            ("opacity", ToolPropertyValue::Number(opacity)) => {
                self.opacity = opacity.clamp(0.0, 100.0).round() as u8;
            }
            _ => {
                eprintln!("Brush: Unknown or invalid property: {}.", name);
            }
        }
    }
}
