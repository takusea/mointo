use std::io::{Cursor, Read, Write};

use wasm_bindgen::prelude::wasm_bindgen;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

use super::MointoCore;
use crate::app::project::Project;

#[wasm_bindgen]
impl MointoCore {
    pub fn export_project(&self) -> Result<Vec<u8>, wasm_bindgen::JsValue> {
        let project = self
            .project
            .as_ref()
            .ok_or_else(|| js_error("No project is open"))?;
        let mut manifest = serde_json::to_value(project).map_err(js_error)?;
        let assets = manifest["composition"]["assets"]
            .as_object_mut()
            .ok_or_else(|| js_error("Project assets are invalid"))?;
        let mut png_assets = Vec::with_capacity(assets.len());

        for (id, asset) in assets.iter_mut() {
            let width = asset["width"]
                .as_u64()
                .ok_or_else(|| js_error("Asset width is invalid"))? as u32;
            let height = asset["height"]
                .as_u64()
                .ok_or_else(|| js_error("Asset height is invalid"))?
                as u32;
            let pixels: Vec<u8> =
                serde_json::from_value(asset["data"].clone()).map_err(js_error)?;
            let mut png_data = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut png_data, width, height);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);
                let mut writer = encoder.write_header().map_err(js_error)?;
                writer.write_image_data(&pixels).map_err(js_error)?;
            }
            asset.as_object_mut().unwrap().remove("data");
            png_assets.push((format!("assets/{id}.png"), png_data));
        }

        let mut archive = ZipWriter::new(Cursor::new(Vec::new()));
        let options = SimpleFileOptions::default();
        archive
            .add_directory("assets/", options)
            .map_err(js_error)?;
        archive.start_file("main.json", options).map_err(js_error)?;
        archive
            .write_all(&serde_json::to_vec_pretty(&manifest).map_err(js_error)?)
            .map_err(js_error)?;
        for (name, data) in png_assets {
            archive.start_file(name, options).map_err(js_error)?;
            archive.write_all(&data).map_err(js_error)?;
        }
        Ok(archive.finish().map_err(js_error)?.into_inner())
    }

    pub fn import_project(&mut self, data: &[u8]) -> Result<(), wasm_bindgen::JsValue> {
        let mut archive = ZipArchive::new(Cursor::new(data)).map_err(js_error)?;
        let mut manifest_bytes = Vec::new();
        archive
            .by_name("main.json")
            .map_err(js_error)?
            .read_to_end(&mut manifest_bytes)
            .map_err(js_error)?;
        let mut manifest: serde_json::Value =
            serde_json::from_slice(&manifest_bytes).map_err(js_error)?;
        let assets = manifest["composition"]["assets"]
            .as_object_mut()
            .ok_or_else(|| js_error("Project assets are invalid"))?;

        for (id, asset) in assets.iter_mut() {
            let width = asset["width"]
                .as_u64()
                .ok_or_else(|| js_error("Asset width is invalid"))? as u32;
            let height = asset["height"]
                .as_u64()
                .ok_or_else(|| js_error("Asset height is invalid"))?
                as u32;
            let mut png_data = Vec::new();
            archive
                .by_name(&format!("assets/{id}.png"))
                .map_err(js_error)?
                .read_to_end(&mut png_data)
                .map_err(js_error)?;
            let decoder = png::Decoder::new(Cursor::new(png_data));
            let mut reader = decoder.read_info().map_err(js_error)?;
            let mut decoded = vec![0; reader.output_buffer_size()];
            let info = reader.next_frame(&mut decoded).map_err(js_error)?;
            if info.width != width || info.height != height {
                return Err(js_error("Asset dimensions do not match main.json"));
            }
            let pixels = to_rgba(&decoded[..info.buffer_size()], info.color_type)?;
            asset["data"] = serde_json::to_value(pixels).map_err(js_error)?;
        }

        let mut project: Project = serde_json::from_value(manifest).map_err(js_error)?;
        project.composition.ensure_layers().map_err(js_error)?;
        project
            .composition
            .hydrate_asset_views()
            .map_err(js_error)?;
        self.project = Some(project);
        Ok(())
    }
}

fn js_error(error: impl std::fmt::Display) -> wasm_bindgen::JsValue {
    wasm_bindgen::JsValue::from_str(&error.to_string())
}

fn to_rgba(data: &[u8], color: png::ColorType) -> Result<Vec<u8>, wasm_bindgen::JsValue> {
    let channels = match color {
        png::ColorType::Rgba => 4,
        png::ColorType::Rgb => 3,
        png::ColorType::GrayscaleAlpha => 2,
        png::ColorType::Grayscale => 1,
        png::ColorType::Indexed => {
            return Err(js_error("Indexed PNG decoding was not expanded"));
        }
    };
    let mut rgba = Vec::with_capacity(data.len() / channels * 4);
    for pixel in data.chunks_exact(channels) {
        let (r, g, b, a) = match color {
            png::ColorType::Rgba => (pixel[0], pixel[1], pixel[2], pixel[3]),
            png::ColorType::Rgb => (pixel[0], pixel[1], pixel[2], 255),
            png::ColorType::GrayscaleAlpha => (pixel[0], pixel[0], pixel[0], pixel[1]),
            png::ColorType::Grayscale => (pixel[0], pixel[0], pixel[0], 255),
            png::ColorType::Indexed => unreachable!(),
        };
        rgba.extend_from_slice(&[r, g, b, a]);
    }
    Ok(rgba)
}
