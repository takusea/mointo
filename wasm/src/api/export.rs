use std::io::{Cursor, Read, Write};

use wasm_bindgen::prelude::wasm_bindgen;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

use super::MointoCore;
use crate::app::project::Project;

#[derive(serde::Serialize)]
struct OrderedCompositionManifest<'a> {
    settings: &'a serde_json::Value,
    clips: &'a serde_json::Value,
    layers: &'a serde_json::Value,
}

#[wasm_bindgen]
impl MointoCore {
    pub fn export_project(&self) -> Result<Vec<u8>, wasm_bindgen::JsValue> {
        let project = self
            .project
            .as_ref()
            .ok_or_else(|| js_error("No project is open"))?;
        let mut manifest = serde_json::to_value(project.composition()).map_err(js_error)?;
        let manifest_name = composition_manifest_name(Some(&manifest));
        let mut png_assets = Vec::new();
        {
            let assets = manifest["assets"]
                .as_object_mut()
                .ok_or_else(|| js_error("Composition assets are invalid"))?;
            for (id, asset) in assets.iter_mut() {
                let width = asset["width"]
                    .as_u64()
                    .ok_or_else(|| js_error("Asset width is invalid"))?
                    as u32;
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
                asset
                    .as_object_mut()
                    .ok_or_else(|| js_error("Asset data is invalid"))?
                    .remove("data");
                png_assets.push((format!("assets/{id}.png"), png_data));
            }
            manifest.as_object_mut().unwrap().remove("assets");
        }

        // The composition starts with many unused placeholder layers. Keep layers
        // referenced by clips and any layers whose visibility/lock state changed.
        let clips = manifest["clips"]
            .as_array()
            .ok_or_else(|| js_error("Composition clips are invalid"))?;
        let used_layer_ids: Vec<String> = clips
            .iter()
            .filter_map(|clip| clip["metadata"]["layer_id"].as_str().map(str::to_owned))
            .collect();
        let layers = manifest["layers"]
            .as_array_mut()
            .ok_or_else(|| js_error("Composition layers are invalid"))?;
        let last_needed = layers
            .iter()
            .enumerate()
            .filter(|(index, layer)| {
                layer["id"]
                    .as_str()
                    .is_some_and(|id| used_layer_ids.iter().any(|used| used == id))
                    || layer["visible"].as_bool() == Some(false)
                    || layer["locked"].as_bool() == Some(true)
                    || layer["name"]
                        .as_str()
                        .is_some_and(|name| name != format!("Layer {}", index + 1))
            })
            .map(|(index, _)| index)
            .max()
            .unwrap_or(0);
        layers.truncate(last_needed + 1);
        manifest["layers"] = serde_json::Value::Array(
            layers
                .iter()
                .map(|layer| {
                    let mut layer = layer.clone();
                    if layer["visible"].as_bool() == Some(true) {
                        layer.as_object_mut().unwrap().remove("visible");
                    }
                    if layer["locked"].as_bool() == Some(false) {
                        layer.as_object_mut().unwrap().remove("locked");
                    }
                    layer
                })
                .collect(),
        );
        omit_default_values(&mut manifest);
        let ordered_manifest = OrderedCompositionManifest {
            settings: &manifest["settings"],
            clips: &manifest["clips"],
            layers: &manifest["layers"],
        };

        let mut archive = ZipWriter::new(Cursor::new(Vec::new()));
        let options = SimpleFileOptions::default();
        archive
            .add_directory("assets/", options)
            .map_err(js_error)?;
        archive
            .start_file(&manifest_name, options)
            .map_err(js_error)?;
        archive
            .write_all(&serde_json::to_vec_pretty(&ordered_manifest).map_err(js_error)?)
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
        let manifest_index = (0..archive.len())
            .find(|&index| {
                archive
                    .by_index(index)
                    .is_ok_and(|file| file.name() == "main.json")
            })
            .or_else(|| {
                (0..archive.len()).find(|&index| {
                    archive
                        .by_index(index)
                        .is_ok_and(|file| file.name().ends_with(".json"))
                })
            })
            .ok_or_else(|| js_error("Project manifest JSON is missing"))?;
        let manifest_file_name = {
            let mut file = archive.by_index(manifest_index).map_err(js_error)?;
            let name = file.name().to_string();
            file.read_to_end(&mut manifest_bytes).map_err(js_error)?;
            name
        };
        let mut manifest: serde_json::Value =
            serde_json::from_slice(&manifest_bytes).map_err(js_error)?;
        let composition_name = manifest_file_name
            .rsplit('/')
            .next()
            .unwrap_or(&manifest_file_name)
            .strip_suffix(".json")
            .unwrap_or("main");
        manifest["name"] = serde_json::Value::String(composition_name.to_string());
        let mut assets = serde_json::Map::new();
        let clips = manifest["clips"]
            .as_array_mut()
            .ok_or_else(|| js_error("Composition clips are invalid"))?;
        for clip in clips {
            let metadata = clip
                .get("metadata")
                .and_then(serde_json::Value::as_object)
                .ok_or_else(|| js_error("Clip metadata is invalid"))?;
            let id = metadata
                .get("asset_id")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned)
                .ok_or_else(|| js_error("Clip asset ID is missing"))?;
            if assets.contains_key(&id) {
                continue;
            }
            let mut png_data = Vec::new();
            archive
                .by_name(&format!("assets/{id}.png"))
                .map_err(js_error)?
                .read_to_end(&mut png_data)
                .map_err(js_error)?;
            let mut reader = png::Decoder::new(Cursor::new(png_data))
                .read_info()
                .map_err(js_error)?;
            let mut decoded = vec![0; reader.output_buffer_size()];
            let info = reader.next_frame(&mut decoded).map_err(js_error)?;
            let pixels = to_rgba(&decoded[..info.buffer_size()], info.color_type)?;
            assets.insert(
                id,
                serde_json::json!({"width": info.width, "height": info.height, "data": pixels}),
            );
        }
        manifest["assets"] = serde_json::Value::Object(assets);
        let project_value = serde_json::json!({"title": "Untitled", "compositions": [manifest]});
        let mut project: Project = serde_json::from_value(project_value).map_err(js_error)?;
        for composition in &mut project.compositions {
            composition.ensure_layers().map_err(js_error)?;
            composition.hydrate_asset_views().map_err(js_error)?;
        }
        self.project = Some(project);
        Ok(())
    }
}

fn composition_manifest_name(composition: Option<&serde_json::Value>) -> String {
    let name = composition
        .and_then(|composition| composition.get("name"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("composition");
    let safe_name: String = name
        .chars()
        .map(|character| {
            if character.is_control() || r#"<>:"/\|?*"#.contains(character) {
                '_'
            } else {
                character
            }
        })
        .collect();
    let safe_name = safe_name.trim_matches([' ', '.']);
    if safe_name.is_empty() {
        "composition.json".to_string()
    } else {
        format!("{safe_name}.json")
    }
}

fn omit_default_values(value: &mut serde_json::Value) {
    let Some(composition) = value.as_object_mut() else {
        return;
    };
    if let Some(clips) = composition
        .get_mut("clips")
        .and_then(serde_json::Value::as_array_mut)
    {
        for clip in clips {
            if let Some(metadata) = clip
                .get_mut("metadata")
                .and_then(serde_json::Value::as_object_mut)
            {
                for key in ["hidden", "alpha_locked", "locked"] {
                    if metadata.get(key).and_then(serde_json::Value::as_bool) == Some(false) {
                        metadata.remove(key);
                    }
                }
                if metadata.get("opacity").and_then(serde_json::Value::as_f64) == Some(1.0) {
                    metadata.remove("opacity");
                }
                if metadata
                    .get("blend_mode")
                    .and_then(serde_json::Value::as_str)
                    == Some("normal")
                {
                    metadata.remove("blend_mode");
                }
                if metadata.get("name").and_then(serde_json::Value::as_str) == Some("Clip") {
                    metadata.remove("name");
                }
            }
            if let Some(transform) = clip
                .get_mut("transform")
                .and_then(serde_json::Value::as_object_mut)
            {
                if transform.get("position") == Some(&serde_json::json!([0.0, 0.0])) {
                    transform.remove("position");
                }
                if transform
                    .get("rotation")
                    .and_then(serde_json::Value::as_f64)
                    == Some(0.0)
                {
                    transform.remove("rotation");
                }
                if transform.get("scale") == Some(&serde_json::json!([1.0, 1.0])) {
                    transform.remove("scale");
                }
                if transform.get("anchor") == Some(&serde_json::json!([0.5, 0.5])) {
                    transform.remove("anchor");
                }
            }
        }
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
