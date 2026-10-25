use crate::core::{
    color::{color_distance, Color},
    image::{Image, PixelChange},
    tool::{Tool, ToolProperty, ToolPropertyValue},
};

const MAX_TOLERANCE_DISTANCE: f64 = 2.0 * 255.0;

pub struct FillTool {
    pub tolerance: u32,
    pub expansion: u32,
    pub antialiasing: u32,
    pub opacity: u8,
}

impl Tool for FillTool {
    fn apply(
        &mut self,
        image: &mut Image,
        x: f32,
        y: f32,
        color: Color,
        _pressure: Option<f32>,
        changes: &mut Vec<PixelChange>,
    ) {
        let x = x.floor() as u32;
        let y = y.floor() as u32;
        let idx = ((y as usize) * (image.width as usize) + (x as usize)) * 4;
        if idx + 3 >= image.data.len() {
            return;
        }
        let target_color = {
            let slice = &image.data[idx..idx + 4];
            [slice[0], slice[1], slice[2], slice[3]]
        };

        if color_distance(&target_color, &color) == 0 {
            return;
        }

        let width = image.width as usize;
        let height = image.height as usize;
        let mut visited = vec![false; width * height];
        let mut region = vec![false; width * height];
        let mut stack = vec![(x, y)];

        while let Some((cx, cy)) = stack.pop() {
            if cx >= image.width || cy >= image.height {
                continue;
            }

            let i = ((cy as usize) * width + (cx as usize)) * 4;
            let vi = (cy as usize) * width + (cx as usize);

            if visited[vi] {
                continue;
            }
            visited[vi] = true;

            if color_distance((&image.data[i..i + 4]).try_into().unwrap(), &target_color)
                > self.tolerance
            {
                continue;
            }

            region[vi] = true;

            if cx > 0 {
                stack.push((cx - 1, cy));
            }
            if cx + 1 < image.width {
                stack.push((cx + 1, cy));
            }
            if cy > 0 {
                stack.push((cx, cy - 1));
            }
            if cy + 1 < image.height {
                stack.push((cx, cy + 1));
            }
        }

        // Expand the selected region by the configured number of pixels. Two
        // separable passes produce a square expansion while keeping the cost
        // linear in the canvas size.
        if self.expansion > 0 {
            let radius = self.expansion.min(64) as usize;
            let mut expanded = vec![false; width * height];
            for cy in 0..height {
                let mut count = 0usize;
                for sx in 0..=radius.min(width - 1) {
                    if region[cy * width + sx] {
                        count += 1;
                    }
                }
                for cx in 0..width {
                    expanded[cy * width + cx] = count > 0;
                    if cx >= radius {
                        let remove_x = cx - radius;
                        if region[cy * width + remove_x] {
                            count -= 1;
                        }
                    }
                    let add_x = cx.saturating_add(radius).saturating_add(1);
                    if add_x < width && region[cy * width + add_x] {
                        count += 1;
                    }
                }
            }
            let mut dilated = vec![false; width * height];
            for cx in 0..width {
                let mut count = 0usize;
                for sy in 0..=radius.min(height - 1) {
                    if expanded[sy * width + cx] {
                        count += 1;
                    }
                }
                for cy in 0..height {
                    dilated[cy * width + cx] = count > 0;
                    if cy >= radius {
                        let remove_y = cy - radius;
                        if expanded[remove_y * width + cx] {
                            count -= 1;
                        }
                    }
                    let add_y = cy.saturating_add(radius).saturating_add(1);
                    if add_y < height && expanded[add_y * width + cx] {
                        count += 1;
                    }
                }
            }
            region = dilated;
        }

        // Reconstruct a smooth coverage mask from the filled pixel mask. Supersampling
        // only affects edge pixels and the setting controls the sample quality.
        let samples = self.antialiasing.clamp(1, 16) as usize;
        let original = image.data.clone();
        for cy in 0..height {
            for cx in 0..width {
                let vi = cy * width + cx;
                let mut coverage = 0.0f32;
                for sy in 0..samples {
                    for sx in 0..samples {
                        let px = cx as f32 + (sx as f32 + 0.5) / samples as f32 - 0.5;
                        let py = cy as f32 + (sy as f32 + 0.5) / samples as f32 - 0.5;
                        let x0 = px.floor() as isize;
                        let y0 = py.floor() as isize;
                        let tx = px - x0 as f32;
                        let ty = py - y0 as f32;
                        let value = |x: isize, y: isize| -> f32 {
                            if x < 0 || y < 0 || x >= width as isize || y >= height as isize {
                                0.0
                            } else if region[y as usize * width + x as usize] {
                                1.0
                            } else {
                                0.0
                            }
                        };
                        let top = value(x0, y0) * (1.0 - tx) + value(x0 + 1, y0) * tx;
                        let bottom = value(x0, y0 + 1) * (1.0 - tx) + value(x0 + 1, y0 + 1) * tx;
                        coverage += top * (1.0 - ty) + bottom * ty;
                    }
                }
                if coverage == 0.0 {
                    continue;
                }
                let i = vi * 4;
                coverage /= (samples * samples) as f32;
                let src_a = color[3] as f32 / 255.0 * self.opacity as f32 / 100.0 * coverage;
                let dst_a = original[i + 3] as f32 / 255.0;
                let out_a = src_a + dst_a * (1.0 - src_a);
                if out_a > 0.0 {
                    let mut blended = color;
                    for channel in 0..3 {
                        blended[channel] = ((color[channel] as f32 * src_a
                            + original[i + channel] as f32 * dst_a * (1.0 - src_a))
                            / out_a)
                            .round() as u8;
                    }
                    blended[3] = (out_a * 255.0).round() as u8;
                    image.set_pixel(i, blended, changes);
                }
            }
        }
    }

    fn get_properties(&self) -> Vec<ToolProperty> {
        vec![
            ToolProperty {
                name: "tolerance".into(),
                value: ToolPropertyValue::Number(
                    ((self.tolerance as f64).sqrt() / MAX_TOLERANCE_DISTANCE * 100.0).round(),
                ),
                min: 0.0,
                max: 100.0,
                step: 1.0,
                unit: Some("%".into()),
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
                name: "expansion".into(),
                value: ToolPropertyValue::Number(self.expansion as f64),
                min: 0.0,
                max: 64.0,
                step: 1.0,
                unit: Some("px".into()),
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
            ("expansion", ToolPropertyValue::Number(expansion)) => {
                self.expansion = expansion.clamp(0.0, 64.0).round() as u32;
            }
            ("tolerance", ToolPropertyValue::Number(tolerance)) => {
                let distance = tolerance.clamp(0.0, 100.0) / 100.0 * MAX_TOLERANCE_DISTANCE;
                self.tolerance = (distance * distance).round() as u32;
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
