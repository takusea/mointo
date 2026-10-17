use crate::core::{
    color::{color_distance, Color},
    image::{Image, PixelChange},
    tool::{Tool, ToolProperty, ToolPropertyValue},
};

// color_distance is the sum of squared differences across four 8-bit channels.
const MAX_TOLERANCE: u32 = 4 * 255 * 255;
const MAX_TOLERANCE_DISTANCE: f64 = 2.0 * 255.0;

pub struct FillTool {
    pub tolerance: u32,
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

        if color_distance(&target_color, &color) <= 0 {
            return;
        }

        let mut visited = vec![false; image.width as usize * image.height as usize];
        let mut stack = vec![(x, y)];

        while let Some((cx, cy)) = stack.pop() {
            if cx >= image.width || cy >= image.height {
                continue;
            }

            let i = ((cy as usize) * (image.width as usize) + (cx as usize)) * 4;
            let vi = (cy as usize) * (image.width as usize) + (cx as usize);

            if visited[vi] {
                continue;
            }
            visited[vi] = true;

            if color_distance((&image.data[i..i + 4]).try_into().unwrap(), &target_color)
                > self.tolerance
            {
                continue;
            }

            let src_a = color[3] as f32 / 255.0 * self.opacity as f32 / 100.0;
            let dst_a = image.data[i + 3] as f32 / 255.0;
            let out_a = src_a + dst_a * (1.0 - src_a);
            if out_a > 0.0 {
                let mut blended = color;
                for channel in 0..3 {
                    blended[channel] = ((color[channel] as f32 * src_a
                        + image.data[i + channel] as f32 * dst_a * (1.0 - src_a))
                        / out_a)
                        .round() as u8;
                }
                blended[3] = (out_a * 255.0).round() as u8;
                image.set_pixel(i, blended, changes);
            }

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
    }

    fn get_properties(&self) -> Vec<ToolProperty> {
        vec![
            ToolProperty {
                name: "tolerance".into(),
                label: "toolInspector.tolerance".into(),
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
                label: "toolInspector.opacity".into(),
                value: ToolPropertyValue::Number(self.opacity as f64),
                min: 0.0,
                max: 100.0,
                step: 1.0,
                unit: Some("%".into()),
            },
        ]
    }

    fn set_property(&mut self, name: &str, value: ToolPropertyValue) {
        match (name, value) {
            ("tolerance", ToolPropertyValue::Number(tolerance)) => {
                let distance = tolerance.clamp(0.0, 100.0) / 100.0 * MAX_TOLERANCE_DISTANCE;
                self.tolerance = (distance * distance).round() as u32;
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
