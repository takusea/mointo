use std::collections::HashMap;
use std::io::{Cursor, Read, Write};

use wasm_bindgen::prelude::wasm_bindgen;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

use super::MointoCore;
use crate::app::clip::AssetId;
use crate::app::composition::Asset;
use crate::app::project::Project;
use crate::core::image::Image;

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
        let composition = project.composition();
        // Do not serialize the whole composition: serde_json would expand every
        // binary asset into a JSON number array before the archive is written.
        let mut manifest = serde_json::json!({
            "settings": serde_json::to_value(&composition.settings).map_err(js_error)?,
            "clips": serde_json::to_value(&composition.clips).map_err(js_error)?,
            "layers": serde_json::to_value(&composition.layers).map_err(js_error)?,
        });
        let manifest_name = composition_manifest_name(None);
        let mut archive = ZipWriter::new(Cursor::new(Vec::new()));
        let options = SimpleFileOptions::default();
        archive
            .add_directory("assets/", options)
            .map_err(js_error)?;
        let referenced_assets: Vec<(String, String)> = manifest["clips"]
            .as_array()
            .ok_or_else(|| js_error("Composition clips are invalid"))?
            .iter()
            .filter(|clip| clip["content"]["type"].as_str() != Some("group"))
            .map(|clip| {
                let asset_id = clip["content"]["asset_id"]
                    .as_str()
                    .ok_or_else(|| js_error("Clip asset ID is missing"))?
                    .to_string();
                let asset_type = clip["content"]["type"]
                    .as_str()
                    .ok_or_else(|| js_error("Clip content type is missing"))?
                    .to_string();
                Ok((asset_id, asset_type))
            })
            .collect::<Result<_, wasm_bindgen::JsValue>>()?;
        for (asset_id, asset_type) in referenced_assets {
            let parsed_asset_id = AssetId::parse_str(&asset_id).map_err(js_error)?;
            let asset = composition
                .assets
                .get(&parsed_asset_id)
                .ok_or_else(|| js_error(format!("Clip references missing asset {asset_id}")))?;
            let actual_type = match asset {
                Asset::Image(_) => "image",
                Asset::Audio(_) => "audio",
            };
            if actual_type != asset_type {
                return Err(js_error(format!(
                    "Clip references asset {asset_id} with the wrong content type"
                )));
            }
        }
        for (id, asset) in &composition.assets {
            match asset {
                Asset::Image(image) => {
                    archive
                        .start_file(format!("assets/{id}.png"), options)
                        .map_err(js_error)?;
                    {
                        let mut encoder =
                            png::Encoder::new(&mut archive, image.width, image.height);
                        encoder.set_color(png::ColorType::Rgba);
                        encoder.set_depth(png::BitDepth::Eight);
                        let mut writer = encoder.write_header().map_err(js_error)?;
                        writer.write_image_data(&image.data).map_err(js_error)?;
                    }
                }
                Asset::Audio(audio_data) => {
                    if audio_data.is_empty() {
                        return Err(js_error(format!("Audio asset {id} is empty")));
                    }
                    archive
                        .start_file(format!("assets/{id}.wav"), options)
                        .map_err(js_error)?;
                    archive.write_all(audio_data).map_err(js_error)?;
                }
            }
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

        archive
            .start_file(&manifest_name, options)
            .map_err(js_error)?;
        archive
            .write_all(&serde_json::to_vec_pretty(&ordered_manifest).map_err(js_error)?)
            .map_err(js_error)?;
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
        let mut assets: HashMap<AssetId, Asset> = HashMap::new();
        let clips = manifest["clips"]
            .as_array_mut()
            .ok_or_else(|| js_error("Composition clips are invalid"))?;
        for clip in clips {
            if clip.get("content").is_none() {
                let clip_type = clip.get("clip_type").and_then(serde_json::Value::as_str);
                let clip_type = if clip_type == Some("audio") {
                    "audio"
                } else {
                    "image"
                };
                let mut content = serde_json::Map::new();
                content.insert(
                    "type".to_string(),
                    serde_json::Value::String(clip_type.to_string()),
                );
                if clip_type == "audio" {
                    let clip_id = clip["metadata"]["id"]
                        .as_str()
                        .ok_or_else(|| js_error("Audio clip ID is missing"))?;
                    content.insert(
                        "asset_id".to_string(),
                        serde_json::Value::String(clip_id.to_string()),
                    );
                    if let Some(data) = clip
                        .as_object_mut()
                        .and_then(|clip| clip.remove("audio_data"))
                    {
                        content.insert("data".to_string(), data);
                    }
                    if let Some(mime_type) = clip
                        .as_object_mut()
                        .and_then(|clip| clip.remove("audio_mime_type"))
                    {
                        content.insert("mime_type".to_string(), mime_type);
                    }
                } else {
                    let metadata = clip
                        .get_mut("metadata")
                        .and_then(serde_json::Value::as_object_mut)
                        .ok_or_else(|| js_error("Clip metadata is invalid"))?;
                    let asset_id = metadata
                        .remove("asset_id")
                        .ok_or_else(|| js_error("Clip asset ID is missing"))?;
                    content.insert("asset_id".to_string(), asset_id);
                    if let Some(alpha_locked) = metadata
                        .remove("alpha_locked")
                        .filter(|value| *value != false)
                    {
                        content.insert("alpha_locked".to_string(), alpha_locked);
                    }
                }
                if let Some(clip) = clip.as_object_mut() {
                    clip.remove("clip_type");
                    clip.insert("content".to_string(), serde_json::Value::Object(content));
                }
            }
            if clip["content"]["type"].as_str() == Some("audio") {
                let clip_id = clip["metadata"]["id"]
                    .as_str()
                    .ok_or_else(|| js_error("Audio clip ID is missing"))?
                    .to_string();
                let metadata = clip
                    .get_mut("metadata")
                    .and_then(serde_json::Value::as_object_mut)
                    .ok_or_else(|| js_error("Clip metadata is invalid"))?;
                metadata.remove("opacity");
                metadata.remove("blend_mode");
                let content = clip
                    .get_mut("content")
                    .and_then(serde_json::Value::as_object_mut)
                    .ok_or_else(|| js_error("Audio clip is invalid"))?;
                let asset_id = content
                    .get("asset_id")
                    .and_then(serde_json::Value::as_str)
                    .map(str::to_owned)
                    .unwrap_or(clip_id.clone());
                content.insert(
                    "asset_id".to_string(),
                    serde_json::Value::String(asset_id.clone()),
                );
                let data = content.remove("data");
                content.remove("opacity");
                content.remove("blend_mode");
                let asset_key = asset_id.parse::<AssetId>().map_err(js_error)?;
                if let std::collections::hash_map::Entry::Vacant(e) = assets.entry(asset_key) {
                    let audio_data = if let Some(data) = data {
                        serde_json::from_value::<Vec<u8>>(data).map_err(js_error)?
                    } else {
                        let mut audio_data = Vec::new();
                        archive
                            .by_name(&format!("assets/{asset_id}.wav"))
                            .map_err(js_error)?
                            .read_to_end(&mut audio_data)
                            .map_err(js_error)?;
                        audio_data
                    };
                    e.insert(Asset::Audio(audio_data));
                }
                continue;
            }
            if clip["content"]["type"].as_str() == Some("group") {
                continue;
            }
            let metadata = clip
                .get_mut("metadata")
                .and_then(serde_json::Value::as_object_mut)
                .ok_or_else(|| js_error("Clip metadata is invalid"))?;
            let legacy_opacity = metadata.remove("opacity");
            let legacy_blend_mode = metadata.remove("blend_mode");
            let content = clip
                .get_mut("content")
                .and_then(serde_json::Value::as_object_mut)
                .ok_or_else(|| js_error("Image clip content is invalid"))?;
            if let Some(opacity) = legacy_opacity {
                content.entry("opacity".to_string()).or_insert(opacity);
            }
            if let Some(blend_mode) = legacy_blend_mode {
                content
                    .entry("blend_mode".to_string())
                    .or_insert(blend_mode);
            }
            let metadata = clip
                .get("content")
                .and_then(serde_json::Value::as_object)
                .ok_or_else(|| js_error("Clip metadata is invalid"))?;
            let id = metadata
                .get("asset_id")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned)
                .ok_or_else(|| js_error("Clip asset ID is missing"))?;
            let asset_key = id.parse::<AssetId>().map_err(js_error)?;
            if assets.contains_key(&asset_key) {
                continue;
            }
            let png_file = archive
                .by_name(&format!("assets/{id}.png"))
                .map_err(js_error)?;
            let mut decoder = png::Decoder::new(png_file);
            decoder.set_transformations(png::Transformations::EXPAND);
            let mut reader = decoder.read_info().map_err(js_error)?;
            let palette = reader.info().palette.clone();
            let transparency = reader.info().trns.clone();
            let mut decoded = vec![0; reader.output_buffer_size()];
            let info = reader.next_frame(&mut decoded).map_err(js_error)?;
            decoded.truncate(info.buffer_size());
            let pixels = to_rgba(
                decoded,
                info.color_type,
                palette.as_deref(),
                transparency.as_deref(),
            )?;
            assets.insert(
                asset_key,
                Asset::Image(Image {
                    data: pixels,
                    width: info.width,
                    height: info.height,
                }),
            );
        }
        manifest["assets"] = serde_json::json!({});
        let project_value = serde_json::json!({"title": "Untitled", "compositions": [manifest]});
        let mut project: Project = serde_json::from_value(project_value).map_err(js_error)?;
        project.composition_mut().assets = assets;
        for composition in &mut project.compositions {
            composition.ensure_layers().map_err(js_error)?;
            composition.hydrate_asset_views().map_err(js_error)?;
        }
        self.project = Some(project);
        self.action_manager = crate::app::action_manager::ActionManager::new();
        self.gpu_renderer = None;
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
                if metadata.get("name").and_then(serde_json::Value::as_str) == Some("Clip") {
                    metadata.remove("name");
                }
            }
            if let Some(content) = clip
                .get_mut("content")
                .and_then(serde_json::Value::as_object_mut)
            {
                if content
                    .get("alpha_locked")
                    .and_then(serde_json::Value::as_bool)
                    == Some(false)
                {
                    content.remove("alpha_locked");
                }
                if content.get("opacity").and_then(serde_json::Value::as_f64) == Some(1.0) {
                    content.remove("opacity");
                }
                if content
                    .get("blend_mode")
                    .and_then(serde_json::Value::as_str)
                    == Some("normal")
                {
                    content.remove("blend_mode");
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

fn to_rgba(
    data: Vec<u8>,
    color: png::ColorType,
    palette: Option<&[u8]>,
    transparency: Option<&[u8]>,
) -> Result<Vec<u8>, wasm_bindgen::JsValue> {
    if color == png::ColorType::Rgba {
        return Ok(data);
    }

    let channels = match color {
        png::ColorType::Rgba => 4,
        png::ColorType::Rgb => 3,
        png::ColorType::GrayscaleAlpha => 2,
        png::ColorType::Grayscale => 1,
        png::ColorType::Indexed => 1,
    };
    let mut rgba = Vec::with_capacity(data.len() / channels * 4);
    for pixel in data.chunks_exact(channels) {
        let (r, g, b, a) = match color {
            png::ColorType::Rgba => (pixel[0], pixel[1], pixel[2], pixel[3]),
            png::ColorType::Rgb => (pixel[0], pixel[1], pixel[2], 255),
            png::ColorType::GrayscaleAlpha => (pixel[0], pixel[0], pixel[0], pixel[1]),
            png::ColorType::Grayscale => (pixel[0], pixel[0], pixel[0], 255),
            png::ColorType::Indexed => {
                let index = pixel[0] as usize;
                let palette = palette.ok_or_else(|| js_error("Indexed PNG palette is missing"))?;
                let palette_offset = index * 3;
                if palette_offset + 2 >= palette.len() {
                    return Err(js_error("Indexed PNG palette index is invalid"));
                }
                (
                    palette[palette_offset],
                    palette[palette_offset + 1],
                    palette[palette_offset + 2],
                    transparency
                        .and_then(|alpha| alpha.get(index))
                        .copied()
                        .unwrap_or(255),
                )
            }
        };
        rgba.extend_from_slice(&[r, g, b, a]);
    }
    Ok(rgba)
}
