use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct Image {
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Copy)]
pub struct PixelChange {
    pub index: usize,
    pub before: [u8; 4],
    pub after: [u8; 4],
}

impl Image {
    pub fn new(width: u32, height: u32) -> Self {
        Image {
            data: vec![0; (width * height * 4) as usize],
            width,
            height,
        }
    }

    pub fn set_pixel(&mut self, index: usize, color: [u8; 4], changes: &mut Vec<PixelChange>) {
        let Some(pixel) = self.data.get_mut(index..index + 4) else {
            return;
        };
        let before: [u8; 4] = pixel.try_into().unwrap();
        if before == color {
            return;
        }
        pixel.copy_from_slice(&color);
        changes.push(PixelChange {
            index,
            before,
            after: color,
        });
    }
}
